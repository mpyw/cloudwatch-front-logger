import { Sender, InstalledEnvironment, Channel, Cache } from '../src';
import { DummyClient } from './stub';
import { CreateLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs';

jest.mock('../src/environment');
jest.mock('../src/cache');
jest.mock('./stub');

const EnvironmentMock = InstalledEnvironment as jest.Mock<InstalledEnvironment>;
const CacheMock = Cache as jest.Mock<Cache>;
const ClientMock = DummyClient as jest.Mock<DummyClient>;

type Writable<T> = { -readonly [P in keyof T]: Writable<T[P]> };
const writable = <T>(obj: T): Writable<T> => obj;

const prepareDeps = () => {
  const channel = new Channel('testing', {
    logGroupName: 'logGroup',
    client: new ClientMock(),
    logStreamNameResolver: async () => 'newLogStream',
    interval: 1,
  });
  const environment = new EnvironmentMock();
  writable(environment).originalConsole = {
    error: jest.fn(),
  } as unknown as Console;
  return {
    environment,
    cache: new CacheMock(),
    channel,
  };
};

const callGetLogStreamName = (sender: Sender): Promise<string | null> => {
  return (sender as any).getLogStreamName();
};

describe('Sender.getLogStreamName()', () => {
  it('should skip creating when cached', async () => {
    const { environment, channel, cache } = prepareDeps();

    cache.getItem = jest.fn(async () => 'cachedLogStream');

    expect(
      await callGetLogStreamName(new Sender(environment, channel, cache))
    ).toBe('cachedLogStream');
    expect(cache.getItem).toBeCalledWith('logStreamName');
    expect(cache.getItem).toBeCalledTimes(1);
  });

  it('should succeed creating', async () => {
    const { environment, channel, cache } = prepareDeps();

    writable(channel).client.send = jest.fn(
      (payload: CreateLogStreamCommand) => {
        expect(payload.input.logGroupName).toBe('logGroup');
        expect(payload.input.logStreamName).toBe('newLogStream');
      }
    );

    expect(
      await callGetLogStreamName(new Sender(environment, channel, cache))
    ).toBe('newLogStream');
    expect(cache.getItem).toBeCalledWith('logStreamName');
    expect(cache.getItem).toBeCalledTimes(1);
    expect(channel.client.send).toBeCalledTimes(1);
    expect(cache.setItem).toBeCalledWith('logStreamName', 'newLogStream');
    expect(cache.setItem).toBeCalledTimes(1);
  });

  it('should refresh when common errors', async () => {
    const { environment, channel, cache } = prepareDeps();

    writable(channel).client.send = jest.fn(async () => {
      throw new Error('Error!');
    });

    expect(
      await callGetLogStreamName(new Sender(environment, channel, cache))
    ).toBeNull();
    expect(cache.getItem).toBeCalledWith('logStreamName');
    expect(cache.getItem).toBeCalledTimes(1);
    expect(channel.client.send).toBeCalledTimes(1);
    expect(environment.originalConsole.error).toBeCalledWith(
      new Error('Error!')
    );
    expect(environment.originalConsole.error).toBeCalledTimes(1);
    expect(cache.removeItem).toBeCalledWith('logStreamName', 'sequenceToken');
    expect(cache.removeItem).toBeCalledTimes(1);
  });

  it('should recover from ResourceAlreadyExistsException', async () => {
    const { environment, channel, cache } = prepareDeps();

    writable(channel).client.send = jest.fn(async () => {
      const error = new Error('Error!');
      error.name = 'ResourceAlreadyExistsException';
      throw error;
    });

    expect(
      await callGetLogStreamName(new Sender(environment, channel, cache))
    ).toBe('newLogStream');
    expect(cache.getItem).toBeCalledWith('logStreamName');
    expect(cache.getItem).toBeCalledTimes(1);
    expect(channel.client.send).toBeCalledTimes(1);
    expect(cache.setItem).toBeCalledWith('logStreamName', 'newLogStream');
    expect(cache.setItem).toBeCalledTimes(1);
  });
});
