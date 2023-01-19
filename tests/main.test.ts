import { PutLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { advanceTo } from 'jest-date-mock';
import { Logger } from '../src';

import {
  DummyAWSError,
  DummyClient,
  DummyConsole,
  DummyEventTarget,
  DummyStorage,
} from './stub';
import { InstallOptions } from '../src';

let logger: Logger;
let globalConsole: DummyConsole;
let storage: DummyStorage;
let eventTarget: DummyEventTarget;

jest.useFakeTimers({
  legacyFakeTimers: true,
});

const install = (options: Partial<InstallOptions> = {}): void => {
  logger = new Logger('key', 'secret', 'ap-northeast-1', 'example');
  logger.install({
    ClientConstructor: DummyClient,
    console: (globalConsole = new DummyConsole()),
    storage: (storage = new DummyStorage()),
    eventTarget: (eventTarget = new DummyEventTarget()),
    logStreamNameResolver: () => 'abc123',
    ...options,
  });
  advanceTo(0);
};

beforeEach(() => install());

describe('Cache storage', (): void => {
  it('should store with prefixed key', async (): Promise<void> => {
    await (logger as any).setCache('key', 'value');
    expect(storage.storage['CloudWatchFrontLogger:key']).toBe('value');
  });

  it('should retrieve value', async (): Promise<void> => {
    await (logger as any).setCache('key', 'value');
    expect(await (logger as any).getCache('key')).toBe('value');
  });

  it('should unset value', async (): Promise<void> => {
    await (logger as any).setCache('key', 'value');
    expect(await (logger as any).deleteCache('key')).toBeUndefined();
  });
});

describe('Collecting errors', (): void => {
  it('should receive from uncaught', async (): Promise<void> => {
    await eventTarget.listeners.error(new Error('Something went wrong') as any);
    expect((logger as any).events).toStrictEqual([
      {
        message: JSON.stringify({
          message: 'Something went wrong',
          type: 'uncaught',
        }),
        timestamp: 0,
      },
    ]);
  });

  it('should receive from console', async (): Promise<void> => {
    await globalConsole.error(new Error('Something went wrong') as any);
    expect((logger as any).events).toStrictEqual([
      {
        message: JSON.stringify({
          message: 'Error: Something went wrong',
          type: 'console',
          level: 'error',
        }),
        timestamp: 0,
      },
    ]);
  });

  it('should receive from console with args', async (): Promise<void> => {
    await globalConsole.error({ a: 1 }, { b: 2 }, ['a'], 'b');
    expect((logger as any).events).toStrictEqual([
      {
        message: JSON.stringify({
          message: '{"a":1} {"b":2} ["a"] b',
          type: 'console',
          level: 'error',
        }),
        timestamp: 0,
      },
    ]);
  });

  it('should receive from custom trigger', async (): Promise<void> => {
    await logger.onError(new Error('Something went wrong'), { type: 'custom' });
    expect((logger as any).events).toStrictEqual([
      {
        message: JSON.stringify({
          message: 'Something went wrong',
          type: 'custom',
        }),
        timestamp: 0,
      },
    ]);
  });

  it('should use custom formatter', async (): Promise<void> => {
    install({
      messageFormatter: (e, info) =>
        `[ERROR] ${e.message} <type=${info ? info.type : ''}>`,
    });
    await logger.onError(new Error('Something went wrong'), { type: 'custom' });
    expect((logger as any).events).toStrictEqual([
      {
        message: '[ERROR] Something went wrong <type=custom>',
        timestamp: 0,
      },
    ]);
  });

  it('should halt when disabled', async (): Promise<void> => {
    logger.disable();
    await logger.onError(new Error('Something went wrong'));
    expect((logger as any).events).toStrictEqual([]);
  });
});

describe('Creating logStream', (): void => {
  it('should create new logStream', async (): Promise<void> => {
    const name = await (logger as any).getLogStreamName();
    expect(name).toBe('abc123');
    expect(await storage.getItem('CloudWatchFrontLogger:logStreamName')).toBe(
      'abc123'
    );
    expect((logger as any).client.sink['example/abc123']).toStrictEqual([]);
  });

  it('should return cached logStream', async (): Promise<void> => {
    await storage.setItem('CloudWatchFrontLogger:logStreamName', 'abc123');
    const name = await (logger as any).getLogStreamName();
    expect(name).toBe('abc123');
    expect((logger as any).client.sink['example/abc123']).toBeUndefined();
  });

  it('should recover from ResourceAlreadyExistsException', async (): Promise<void> => {
    (logger as any).client.send = jest
      .fn()
      .mockRejectedValue(
        new DummyAWSError(
          'Duplicate LogStream',
          'ResourceAlreadyExistsException'
        )
      );
    const name = await (logger as any).getLogStreamName();
    expect(name).toBe('abc123');
    expect(await storage.getItem('CloudWatchFrontLogger:logStreamName')).toBe(
      'abc123'
    );
    expect((logger as any).client.sink['example/abc123']).toBeUndefined();
  });

  it('should halt when other error occurred', async (): Promise<void> => {
    (logger as any).client.send = jest
      .fn()
      .mockRejectedValue(
        new DummyAWSError('Something went wrong', 'UnknownException')
      );
    const name = await (logger as any).getLogStreamName();
    expect(name).toBeNull();
    expect(globalConsole.messages).toStrictEqual([
      {
        message: new DummyAWSError('Something went wrong', 'UnknownException'),
        level: 'error',
      },
    ]);
    expect(
      await storage.getItem('CloudWatchFrontLogger:logStreamName')
    ).toBeNull();
  });

  it('should fallback to default logStreamName', async (): Promise<void> => {
    install({
      logStreamNameResolver: undefined,
    });
    const name = await (logger as any).getLogStreamName();
    expect(name).toBe('anonymous');
    expect(await storage.getItem('CloudWatchFrontLogger:logStreamName')).toBe(
      'anonymous'
    );
    expect((logger as any).client.sink['example/anonymous']).toStrictEqual([]);
  });
});

describe('Sending logs', (): void => {
  it('should send events', async (): Promise<void> => {
    (logger as any).events.push(
      {
        message: 'Error 1',
        timestamp: 1,
      },
      {
        message: 'Error 2',
        timestamp: 2,
      }
    );
    await logger.onInterval();
    expect((logger as any).events).toStrictEqual([]);
    expect((logger as any).client.sink['example/abc123']).toStrictEqual([
      {
        message: 'Error 1',
        timestamp: 1,
      },
      {
        message: 'Error 2',
        timestamp: 2,
      },
    ]);
    expect(storage.getItem('CloudWatchFrontLogger:sequenceToken')).toBe(
      'SEQUENCE_TOKEN_#'
    );
  });

  it('should reuse previous nextSequenceToken', async (): Promise<void> => {
    (logger as any).events.push({
      message: 'Error 1',
      timestamp: 1,
    });
    await logger.onInterval();
    (logger as any).events.push({
      message: 'Error 2',
      timestamp: 2,
    });
    await logger.onInterval();
    expect(storage.getItem('CloudWatchFrontLogger:sequenceToken')).toBe(
      'SEQUENCE_TOKEN_##'
    );
  });

  it('should recover from InvalidSequenceTokenException', async (): Promise<void> => {
    (logger as any).events.push({
      message: 'Error 1',
      timestamp: 1,
    });

    await logger.onInterval();
    const originalSend = (logger as any).client.send;
    (logger as any).client.send = jest.fn((command) => {
      if (!(command instanceof PutLogEventsCommand)) {
        return originalSend.call(logger, command);
      }
      (logger as any).client.sink[
        `${command.input.logGroupName}/${command.input.logStreamName}`
      ].push(...(command.input?.logEvents ?? []));
      return Promise.reject(
        new DummyAWSError(
          '... The next expected sequenceToken is  ...',
          'InvalidSequenceTokenException',
          'SEQUENCE_TOKEN_123'
        )
      );
    });
    (logger as any).events.push({
      message: 'Error 2',
      timestamp: 2,
    });

    await logger.onInterval();
    expect((logger as any).events).toStrictEqual([
      {
        message: 'Error 2',
        timestamp: 2,
      },
    ]);
    expect((logger as any).client.sink['example/abc123']).toStrictEqual([
      {
        message: 'Error 1',
        timestamp: 1,
      },
      {
        message: 'Error 2',
        timestamp: 2,
      },
    ]);
    expect(storage.getItem('CloudWatchFrontLogger:sequenceToken')).toBe(
      'SEQUENCE_TOKEN_123'
    );
  });

  it('should halt when other error occurred', async (): Promise<void> => {
    (logger as any).events.push({
      message: 'Error 1',
      timestamp: 1,
    });

    await logger.onInterval();

    const originalSend = (logger as any).client.send;
    (logger as any).client.send = jest.fn((command) => {
      if (!(command instanceof PutLogEventsCommand)) {
        return originalSend.call(logger, command);
      }

      (logger as any).client.sink[
        `${command.input.logGroupName}/${command.input.logStreamName}`
      ].push(...(command.input?.logEvents ?? []));
      return Promise.reject(
        new DummyAWSError(
          '... The next expected sequenceToken is: ?????  ...',
          'InvalidSequenceTokenException'
        )
      );
    });
    (logger as any).events.push({
      message: 'Error 2',
      timestamp: 2,
    });

    await logger.onInterval();
    expect((logger as any).events).toStrictEqual([]);
    expect((logger as any).client.sink['example/abc123']).toStrictEqual([
      {
        message: 'Error 1',
        timestamp: 1,
      },
      {
        message: 'Error 2',
        timestamp: 2,
      },
    ]);
    expect(storage.getItem('CloudWatchFrontLogger:sequenceToken')).toBeNull();
  });
});
