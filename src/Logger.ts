import CloudWatchLogs, {
  InputLogEvents,
  PutLogEventsRequest,
  SequenceToken
} from "aws-sdk/clients/cloudwatchlogs";
import {
  Level,
  ClientInterface,
  StorageInterface,
  ConsoleInterface,
  MessageFormatter,
  LogStreamNameResolver,
  InstallOptions,
  ErrorInfo
} from "./types";
import { AWSError } from "aws-sdk";

export default class Logger {
  protected static readonly namespace: string = "CloudWatchFrontLogger";
  protected static readonly defaultLogStreamName: string = "anonymous";

  protected levels: Level[] = ["error"];
  protected interval = 10000;
  protected muting = false;
  protected enabled = true;

  protected logStreamNameResolver?: LogStreamNameResolver;
  protected messageFormatter?: MessageFormatter;
  protected client?: ClientInterface;
  protected storage?: StorageInterface;
  protected console?: ConsoleInterface;

  protected events: InputLogEvents = [];
  protected intervalId?: NodeJS.Timeout;

  /**
   * Constructor.
   *
   * @param accessKeyId     - AWS Access Key ID
   * @param secretAccessKey - AWS Secret Access Key
   * @param region          - AWS Region (e.g. ap-northeast-1)
   * @param logGroupName    - AWS CloudWatch Log Group Name
   */
  constructor(
    protected readonly accessKeyId: string,
    protected readonly secretAccessKey: string,
    protected readonly region: string,
    protected readonly logGroupName: string
  ) {}

  /**
   * Set level.
   *
   * @param levels - Reported error level
   */
  public setLevels(levels: Level[]): this {
    this.levels = levels;
    return this;
  }

  /**
   * Set interval.
   *
   * @param interval - Interval milliseconds for sending logs
   */
  public setInterval(interval: number): this {
    this.interval = interval;
    return this;
  }

  /**
   * Mute logging in browser console.
   */
  public mute(): this {
    this.muting = true;
    return this;
  }

  /**
   * Resume logging in browser console.
   */
  public unmute(): this {
    this.muting = false;
    return this;
  }

  /**
   * Enable collecting errors and sending to AWS CloudWatch.
   */
  public enable(): this {
    this.enabled = true;
    return this;
  }

  /**
   * Disable collecting errors and sending to AWS CloudWatch.
   */
  public disable(): this {
    this.enabled = false;
    return this;
  }

  /**
   * Bootstrap Logger.
   *
   * @param logStreamNameResolver - Resolve logStreamName for current user (e.g. Canvas Fingerprint)
   * @param messageFormatter      - Format message string from Error
   * @param Ctor
   * @param storage
   * @param globalConsole
   * @param eventTarget
   */
  public install({
    logStreamNameResolver,
    messageFormatter,
    ClientConstructor: Ctor = CloudWatchLogs,
    storage = localStorage,
    console: globalConsole = console,
    eventTarget = window
  }: InstallOptions = {}): void {
    this.client = new Ctor({
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
      region: this.region
    });
    this.logStreamNameResolver = logStreamNameResolver;
    this.messageFormatter = messageFormatter;
    this.storage = storage;

    // Swap window.console.*() functions and overridden ones
    const originalConsole: ConsoleInterface = {} as any;
    for (const level of this.levels) {
      originalConsole[level] = globalConsole[level].bind(globalConsole);
      globalConsole[level] = async (message, ...args): Promise<void> => {
        // Listen overridden console.*() function calls (type="console", level="*")
        await this.onError(new Error(message), { type: "console", level });
        if (!this.muting) {
          originalConsole[level](message, ...args);
        }
      };
    }
    this.console = originalConsole;

    // Listen "error" event on window (type="uncaught")
    eventTarget.addEventListener(
      "error",
      async (error: any): Promise<void> => {
        await this.onError(error, { type: "uncaught" });
      }
    );

    // Start timer that executes this.onInterval()
    this.intervalId = setInterval(this.onInterval.bind(this), this.interval);
  }

  /**
   * Queue a new error.
   *
   * @param e    - Error object
   * @param info - Extra Error Info (Consider using "type" field)
   */
  public async onError(e: any, info?: ErrorInfo): Promise<void> {
    if (!Logger.isValidError(e) || !this.enabled) {
      return;
    }

    const message = this.messageFormatter
      ? await this.messageFormatter(e, info) // Custom formatter
      : JSON.stringify({ message: e.message, ...info }); // Simple JSON formatter

    // Abort when received null
    if (!message) {
      return;
    }

    this.events.push({
      timestamp: new Date().getTime(),
      message
    });
  }

  /**
   * Send queued errors.
   */
  public async onInterval(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    // Extract errors from queue
    const pendingEvents = this.events.splice(0);
    if (!pendingEvents.length) {
      return;
    }

    // Retrieve or newly calculate logStreamName for current user
    const logStreamName = await this.getLogStreamName();
    if (!logStreamName) {
      return;
    }

    // Retrieve previous "nextSequenceToken" from cache
    const sequenceToken = await this.getCache("sequenceToken");

    // Build parameters for PutLogEvents endpoint
    //   c.f. https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutLogEvents.html
    const params: PutLogEventsRequest = {
      logEvents: pendingEvents,
      logGroupName: this.logGroupName,
      logStreamName: logStreamName,
      ...(sequenceToken ? { sequenceToken } : undefined)
    };

    let nextSequenceToken: SequenceToken | undefined = undefined,
      match: RegExpMatchArray | null = null;

    try {
      // Run request to send events and retrieve fresh "nextSequenceToken"
      ({ nextSequenceToken = undefined } = await new Promise(
        (resolve, reject) => {
          this.getClient().putLogEvents(params, (err, data) =>
            err ? reject(err) : resolve(data)
          );
        }
      ));
    } catch (e) {
      // Try to recover from InvalidSequenceTokenException error message
      if (
        !Logger.isValidError<AWSError>(e) ||
        e.code !== "InvalidSequenceTokenException" ||
        !(match = e.message.match(/The next expected sequenceToken is: (\w+)/))
      ) {
        // Print error to original console and reset states
        this.getConsole().error(e);
        await this.refresh();
        return;
      }
    }

    // Recover from InvalidSequenceTokenException error message
    if (match) {
      nextSequenceToken = match[1];
    }
    // Cache fresh "nextSequenceToken"
    if (nextSequenceToken) {
      await this.setCache("sequenceToken", nextSequenceToken);
    }
    // Immediately retry after recovery
    if (match) {
      this.events.push(...pendingEvents);
      setTimeout(this.onInterval, 0);
    }
  }

  protected getClient(): ClientInterface {
    if (!this.client) {
      throw new Error("Not yet installed");
    }
    return this.client;
  }

  protected getStorage(): StorageInterface {
    if (!this.storage) {
      throw new Error("Not yet installed");
    }
    return this.storage;
  }

  protected getConsole(): ConsoleInterface {
    if (!this.console) {
      throw new Error("Not yet installed");
    }
    return this.console;
  }

  protected async setCache(key: string, value: string): Promise<void> {
    return this.getStorage().setItem(`${Logger.namespace}:${key}`, value);
  }

  protected async getCache(key: string): Promise<string | null> {
    return this.getStorage().getItem(`${Logger.namespace}:${key}`);
  }

  protected async deleteCache(key: string): Promise<void> {
    return this.getStorage().removeItem(`${Logger.namespace}:${key}`);
  }

  protected async refresh(): Promise<void> {
    await this.deleteCache("logStreamName");
    await this.deleteCache("sequenceToken");
    this.events.splice(0);
  }

  protected async getLogStreamName(): Promise<string | null> {
    // Retrieve "logStreamName" for current user
    const retrieved = await this.getCache("logStreamName");
    if (retrieved) {
      return retrieved;
    }

    // Build parameters for CreateLogStream endpoint
    //   c.f. https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_CreateLogStream.html
    const params = {
      logGroupName: this.logGroupName,
      logStreamName:
        (this.logStreamNameResolver && (await this.logStreamNameResolver())) || // Resolve for current user (e.g. Canvas Fingerprint)
        Logger.defaultLogStreamName // "anonymous"
    };

    try {
      // Run request to create a new logStream
      await new Promise((resolve, reject) => {
        this.getClient().createLogStream(params, (err, data) =>
          err ? reject(err) : resolve(data)
        );
      });
    } catch (e) {
      // Try to recover from ResourceAlreadyExistsException error
      if (
        !Logger.isValidError<AWSError>(e) ||
        e.code !== "ResourceAlreadyExistsException"
      ) {
        // Print error to original console and reset states
        this.getConsole().error(e);
        await this.refresh();
        return null;
      }
    }

    // Cache fresh "logStreamName"
    await this.setCache("logStreamName", params.logStreamName);
    return params.logStreamName;
  }

  protected static isValidError<E = Error>(value: any): value is E {
    return value && typeof value.message === "string";
  }
}
