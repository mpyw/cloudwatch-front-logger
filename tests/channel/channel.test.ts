import { Channel, ChannelOptions } from '../../src';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';

jest.mock('@aws-sdk/client-cloudwatch-logs');
const CloudWatchLogsClientMock = CloudWatchLogsClient as jest.Mock;

const createDefaultOptions = (): ChannelOptions => ({
  client: new CloudWatchLogsClientMock(),
  interval: 10000,
  logGroupName: 'testGroup',
  logStreamNameResolver: async () => 'testStream',
});

describe('channel', () => {
  it('should create put log events payload', async () => {
    const channel = new Channel('example', createDefaultOptions());
    expect(
      await channel.createPutLogEventsPayload([
        { message: 'foo', timestamp: 123 },
        { message: 'bar', timestamp: 456 },
      ])
    ).toEqual({
      logGroupName: 'testGroup',
      logStreamName: 'testStream',
      logEvents: [
        { message: 'foo', timestamp: 123 },
        { message: 'bar', timestamp: 456 },
      ],
    });
  });

  it('should create put log events payload with nextSequenceToken', async () => {
    const channel = new Channel('example', createDefaultOptions());
    expect(
      await channel.createPutLogEventsPayload(
        [
          { message: 'foo', timestamp: 123 },
          { message: 'bar', timestamp: 456 },
        ],
        'abc'
      )
    ).toEqual({
      logGroupName: 'testGroup',
      logStreamName: 'testStream',
      logEvents: [
        { message: 'foo', timestamp: 123 },
        { message: 'bar', timestamp: 456 },
      ],
      sequenceToken: 'abc',
    });
  });

  it('should create create log stream payload', async () => {
    const channel = new Channel('example', createDefaultOptions());
    expect(await channel.createCreateLogStreamPayload()).toEqual({
      logGroupName: 'testGroup',
      logStreamName: 'testStream',
    });
  });
});
