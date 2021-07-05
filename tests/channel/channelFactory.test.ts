import { ChannelFactory, ChannelFactoryOptions } from '../../src';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';

jest.mock('@aws-sdk/client-cloudwatch-logs');
const CloudWatchLogsClientMock = CloudWatchLogsClient as jest.Mock;

const createDefaultChannelFactoryOptions = (): ChannelFactoryOptions => ({
  client: new CloudWatchLogsClientMock(),
  logGroupName: 'testGroup',
});

describe('channelFactory', () => {
  it('should create with global default values', async () => {
    const options = createDefaultChannelFactoryOptions();
    const factory = new ChannelFactory(options);
    const channel = factory.createChannel('channel');
    expect(channel.name).toBe('channel');
    expect(channel.client).toBe(options.client);
    expect(channel.logGroupName).toBe('testGroup');
    expect(await channel.logStreamNameResolver()).toBe('anonymous');
    expect(channel.interval).toBe(3000);
  });

  it('should create with factory default values', async () => {
    const options = createDefaultChannelFactoryOptions();
    const factory = new ChannelFactory({
      ...options,
      interval: 1000,
      logStreamNameResolver: () => 'testStream',
    });
    const channel = factory.createChannel('channel');
    expect(channel.name).toBe('channel');
    expect(channel.client).toBe(options.client);
    expect(channel.logGroupName).toBe('testGroup');
    expect(await channel.logStreamNameResolver()).toBe('testStream');
    expect(channel.interval).toBe(1000);
  });

  it('should create with artificial values', async () => {
    const options = {
      client: new CloudWatchLogsClientMock(),
      logGroupName: 'testGroup',
    };
    const factory = new ChannelFactory();
    const channel = factory.createChannel('channel', options);
    expect(channel.name).toBe('channel');
    expect(channel.client).toBe(options.client);
    expect(channel.logGroupName).toBe('testGroup');
    expect(await channel.logStreamNameResolver()).toBe('anonymous');
    expect(channel.interval).toBe(3000);
  });
});
