import { Channel } from './channel';
import { Cache } from './cache';
import {
  isStreamAlreadyExistsError,
  isUnrecoverableSequenceTokenError,
  isValidAWSError,
} from './util';
import {
  CreateLogStreamCommand,
  InputLogEvent,
  PutLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { InstalledEnvironment } from './environment';

export class Sender {
  constructor(
    protected readonly environment: InstalledEnvironment,
    protected readonly channel: Channel,
    protected readonly cache: Cache
  ) {}

  async send(events: readonly InputLogEvent[]): Promise<void> {
    if (!events.length) {
      return;
    }

    // Retrieve previous "nextSequenceToken" from cache
    const sequenceToken = await this.cache.getItem('sequenceToken');

    // Build parameters for PutLogEvents endpoint
    //   c.f. https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutLogEvents.html
    const payload = await this.channel.createPutLogEventsPayload(
      events,
      sequenceToken
    );
    const command = new PutLogEventsCommand({
      ...payload,
      logEvents: [...payload.logEvents],
    });

    let nextSequenceToken: string | undefined = undefined;
    let needsRetry = false;

    try {
      // Run request to send events and retrieve fresh "nextSequenceToken"
      ({ nextSequenceToken = undefined } = await this.channel.client.send(
        command
      ));
    } catch (e: unknown) {
      // Try to recover from InvalidSequenceTokenException error message
      if (!isValidAWSError(e) || isUnrecoverableSequenceTokenError(e)) {
        // Print error to original console and reset states
        this.environment.originalConsole.error(e);
        await this.refresh();
        return;
      }
      // Recover from InvalidSequenceTokenException error message
      nextSequenceToken = e.expectedSequenceToken;
      needsRetry = e.name !== 'DataAlreadyAcceptedException';
    }

    // Cache fresh "nextSequenceToken"
    if (nextSequenceToken) {
      await this.cache.setItem('sequenceToken', nextSequenceToken);
    }

    // Immediately retry after recovery
    if (needsRetry) {
      this.environment.setTimeout(() => this.send(events));
    }
  }

  protected async refresh(): Promise<void> {
    await this.cache.removeItem('logStreamName', 'sequenceToken');
  }

  protected async getLogStreamName(): Promise<string | null> {
    // Retrieve "logStreamName" for current user
    const retrieved = await this.cache.getItem('logStreamName');
    if (retrieved) {
      return retrieved;
    }

    // Build parameters for CreateLogStream endpoint
    //   c.f. https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_CreateLogStream.html
    const logStreamName = await this.channel.logStreamNameResolver();
    const createLogStreamCommand = new CreateLogStreamCommand(
      await this.channel.createCreateLogStreamPayload()
    );

    try {
      // Run request to create a new logStream
      await this.channel.client.send(createLogStreamCommand);
    } catch (e: unknown) {
      // Try to recover from ResourceAlreadyExistsException error
      if (!isValidAWSError(e) || !isStreamAlreadyExistsError(e)) {
        // Print error to original console and reset states
        this.environment.originalConsole.error(e);
        await this.refresh();
        return null;
      }
    }

    // Cache fresh "logStreamName"
    await this.cache.setItem('logStreamName', logStreamName);
    return logStreamName;
  }
}
