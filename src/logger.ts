import {
  CloudWatchLogsClient,
  CreateLogStreamCommand,
  InputLogEvent,
  PutLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import {
  Level,
  StorageInterface,
  ConsoleInterface,
  MessageFormatter,
  LogStreamNameResolver,
  InstallOptions,
  ErrorInfo,
  AWSError,
  ClientInterface,
} from './types';

export default class Logger {
  protected static readonly namespace: string = 'CloudWatchFrontLogger';
  protected static readonly defaultLogStreamName: string = 'anonymous';

  protected levels: Level[] = ['error'];
  protected interval = 10000;
  protected muting = false;
  protected enabled = true;

  protected logStreamNameResolver?: LogStreamNameResolver;
  protected messageFormatter?: MessageFormatter;
  protected client?: ClientInterface;
  protected storage?: StorageInterface;
  protected console?: ConsoleInterface;

  protected events: InputLogEvent[] = [];
  protected intervalId?: NodeJS.Timeout | number;

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
    ClientConstructor: Ctor = CloudWatchLogsClient,
    storage = localStorage,
    console: globalConsole = console,
    eventTarget = window,
  }: InstallOptions = {}): void {
    this.client = new Ctor({
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
      region: this.region,
    });
    this.logStreamNameResolver = logStreamNameResolver;
    this.messageFormatter = messageFormatter;
    this.storage = storage;

    // Swap window.console.*() functions and overridden ones
    const originalConsole = {} as ConsoleInterface;
    for (const level of this.levels) {
      originalConsole[level] = globalConsole[level].bind(globalConsole);
      globalConsole[level] = async (message, ...args): Promise<void> => {
        // Listen overridden console.*() function calls (type="console", level="*")
        await this.onError(new Error(message), {
          type: 'console',
          level,
          args,
          originalMessage: message,
        });
        if (!this.muting) {
          originalConsole[level](message, ...args);
        }
      };
    }
    this.console = originalConsole;

    // Listen "error" event on window (type="uncaught")
    eventTarget.addEventListener(
      'error',
      async (error: unknown): Promise<void> => {
        await this.onError(error, { type: 'uncaught' });
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
  public async onError(e: unknown, info?: ErrorInfo): Promise<void> {
    if (!Logger.isValidError(e) || !this.enabled) {
      return;
    }

    let message: string | null;
    if (this.messageFormatter) {
      message = await this.messageFormatter(e, info); // Custom formatter
    } else {
      const { args, originalMessage, ...otherInfo } = info ?? {};
      const converToString = (value: any) =>
        !(value instanceof Error) && typeof value === 'object'
          ? JSON.stringify(value)
          : value;
      let msg = converToString(originalMessage ?? e.message);
      if (args && Array.isArray(args)) {
        msg = [msg, ...args.map(converToString)].join(' ');
      }
      message = JSON.stringify({ message: msg, ...otherInfo }); // Simple JSON formatter
    }

    // Abort when received null
    if (!message) {
      return;
    }

    this.events.push({
      timestamp: new Date().getTime(),
      message,
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
    const sequenceToken = await this.getCache('sequenceToken');

    // Build parameters for PutLogEvents endpoint
    //   c.f. https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutLogEvents.html
    const command = new PutLogEventsCommand({
      logEvents: pendingEvents,
      logGroupName: this.logGroupName,
      logStreamName: logStreamName,
      ...(sequenceToken ? { sequenceToken } : undefined),
    });

    let nextSequenceToken: string | undefined = undefined;
    let needsRetry = false;

    try {
      // Run request to send events and retrieve fresh "nextSequenceToken"
      ({ nextSequenceToken = undefined } = await this.getClient().send(
        command
      ));
    } catch (e) {
      // Try to recover from InvalidSequenceTokenException error message
      if (
        !Logger.isValidError<AWSError>(e) ||
        (e.name !== 'DataAlreadyAcceptedException' &&
          e.name !== 'InvalidSequenceTokenException') ||
        !e.expectedSequenceToken
      ) {
        // Print error to original console and reset states
        this.getConsole().error(e);
        await this.refresh();
        return;
      }
      // Recover from InvalidSequenceTokenException error message
      nextSequenceToken = e.expectedSequenceToken;
      needsRetry = e.name !== 'DataAlreadyAcceptedException';
    }

    // Cache fresh "nextSequenceToken"
    if (nextSequenceToken) {
      await this.setCache('sequenceToken', nextSequenceToken);
    }

    // Immediately retry after recovery
    if (needsRetry) {
      this.events.push(...pendingEvents);
      setTimeout(this.onInterval, 0);
    }
  }

  protected getClient(): ClientInterface {
    if (!this.client) {
      throw new Error('Not yet installed');
    }
    return this.client;
  }

  protected getStorage(): StorageInterface {
    if (!this.storage) {
      throw new Error('Not yet installed');
    }
    return this.storage;
  }

  protected getConsole(): ConsoleInterface {
    if (!this.console) {
      throw new Error('Not yet installed');
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
    await this.deleteCache('logStreamName');
    await this.deleteCache('sequenceToken');
    this.events.splice(0);
  }

  protected async getLogStreamName(): Promise<string | null> {
    // Retrieve "logStreamName" for current user
    const retrieved = await this.getCache('logStreamName');
    if (retrieved) {
      return retrieved;
    }

    // Build parameters for CreateLogStream endpoint
    //   c.f. https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_CreateLogStream.html
    const logStreamName =
      (this.logStreamNameResolver && (await this.logStreamNameResolver())) || // Resolve for current user (e.g. Canvas Fingerprint)
      Logger.defaultLogStreamName; // "anonymous"
    const createLogStreamCommand = new CreateLogStreamCommand({
      logGroupName: this.logGroupName,
      logStreamName,
    });

    try {
      // Run request to create a new logStream
      await this.getClient().send(createLogStreamCommand);
    } catch (e) {
      // Try to recover from ResourceAlreadyExistsException error
      if (
        !Logger.isValidError<AWSError>(e) ||
        e.name !== 'ResourceAlreadyExistsException'
      ) {
        // Print error to original console and reset states
        this.getConsole().error(e);
        await this.refresh();
        return null;
      }
    }

    // Cache fresh "logStreamName"
    await this.setCache('logStreamName', logStreamName);
    return logStreamName;
  }

  protected static isValidError<E = Error>(value: unknown): value is E {
    return Boolean(value && typeof (value as Error).message === 'string');
  }
}
