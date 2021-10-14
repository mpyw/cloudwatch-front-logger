import { Channel, ChannelCollection, ChannelOptions } from '../../src';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';

jest.mock('@aws-sdk/client-cloudwatch-logs');
const CloudWatchLogsClientMock = CloudWatchLogsClient as jest.Mock;

const createDefaultChannelOptions = (): ChannelOptions => ({
  client: new CloudWatchLogsClientMock(),
  interval: 10000,
  logGroupName: 'testGroup',
  logStreamNameResolver: () => 'testStream',
});

const createChannels = () =>
  new ChannelCollection([
    new Channel('foo-x', {
      ...createDefaultChannelOptions(),
      logGroupName: 'g10',
    }),
    new Channel('foo-y', {
      ...createDefaultChannelOptions(),
      logGroupName: 'g10',
    }),
    new Channel('foo-z', {
      ...createDefaultChannelOptions(),
      logGroupName: 'g20',
    }),
    new Channel('bar-x', {
      ...createDefaultChannelOptions(),
      logGroupName: 'g20',
    }),
    new Channel('bar-y', {
      ...createDefaultChannelOptions(),
      logGroupName: 'g21',
    }),
  ]);

describe('channelCollection', () => {
  it('should filter by name prefix', () => {
    const channels = createChannels().filterByNamePrefix('foo').items;
    expect(channels).toHaveLength(3);
    expect(channels[0].name).toBe('foo-x');
    expect(channels[1].name).toBe('foo-y');
    expect(channels[2].name).toBe('foo-z');
  });

  it('should filter by log group name', () => {
    const channels = createChannels().filterByLogGroupName('g20').items;
    expect(channels).toHaveLength(2);
    expect(channels[0].name).toBe('foo-z');
    expect(channels[1].name).toBe('bar-x');
  });

  it('should find by name', () => {
    const channels = createChannels();
    expect(channels.findByName('foo-x')?.name).toBe('foo-x');
    expect(channels.findByName('foo-%')).toBeUndefined();
  });

  // TODO
});
