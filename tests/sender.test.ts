import { Sender, InstalledEnvironment, Channel, Cache } from '../src';

jest.mock('../src/environment');
jest.mock('../src/channel');
jest.mock('../src/cache');

const EnvironmentMock = InstalledEnvironment as jest.Mock<InstalledEnvironment>;
const ChannelMock = Channel as jest.Mock<Channel>;
const CacheMock = Cache as jest.Mock<Cache>;

const prepareDeps = () => {
  return {
    environment: new EnvironmentMock(),
    channel: new ChannelMock(),
    cache: new CacheMock(),
  };
};

const callGetLogStreamName = (sender: Sender): Promise<string | null> => {
  return (sender as any).getLogStreamName();
};

describe('Sender.getLogStreamName()', () => {
  it('should skip creating when cached', async () => {
    const { environment, channel, cache } = prepareDeps();
    cache.getItem = jest.fn(async () => 'logStream');
    expect(
      await callGetLogStreamName(new Sender(environment, channel, cache))
    ).toBe('logStream');
    expect(cache.getItem).toBeCalledWith('logStreamName');
    expect(cache.getItem).toBeCalledTimes(1);
  });
});
