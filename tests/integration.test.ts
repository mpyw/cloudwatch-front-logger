// import { PutLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import {
  ChannelFactory,
  CollectorFactory,
  SourceFactory,
  Environment,
  Installer,
  Logger,
} from '../src';

import {
  // DummyAWSError,
  DummyClient,
  DummyConsole,
  DummyEventTarget,
  DummyStorage,
} from './stub';

let logger: Logger;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
let storage: DummyStorage;
let globalConsole: DummyConsole;
let eventTarget: DummyEventTarget;
let client: DummyClient;
const originalDateConstructor = Date;

const freezeDate = (at: number): void => {
  const date = new originalDateConstructor(at);
  jest
    .spyOn(global, 'Date')
    .mockImplementation(() => date as unknown as string);
};

const install = (): Logger => {
  const environment = new Environment({
    storage: (storage = new DummyStorage()),
    console: (globalConsole = new DummyConsole()),
    eventTarget: (eventTarget = new DummyEventTarget()),
    setInterval: (() => 0) as unknown as typeof global.setInterval,
  });
  const channelFactory = new ChannelFactory({
    client: (client = new DummyClient()),
    logGroupName: 'group',
  });
  const sourceFactory = new SourceFactory();
  return new Installer(environment).install(
    new CollectorFactory().createCollector(
      channelFactory.createChannel('app'),
      sourceFactory.createSources(['warn', 'error'])
    )
  );
};

beforeEach(() => {
  jest.useFakeTimers();
  freezeDate(0);
  logger = install();
});

afterEach(() => {
  jest.useRealTimers();
  global.Date = originalDateConstructor;
});

describe('Collecting errors via handler', (): void => {
  it('should receive from uncaught', async (): Promise<void> => {
    await eventTarget.listeners.error({
      error: new Error('Something went wrong'),
    } as unknown as ErrorEvent);
    expect(logger.sources.items[0].events).toHaveLength(0);
    expect(logger.sources.items[1].events).toStrictEqual([
      {
        message: JSON.stringify({
          type: 'uncaught',
          message: 'Error: Something went wrong',
        }),
        timestamp: 0,
      },
    ]);
  });

  it('should receive from console', async (): Promise<void> => {
    await globalConsole.error(new Error('Something went wrong'));
    await globalConsole.warn('Something got worse');
    expect(logger.sources.items[0].events).toStrictEqual([
      {
        message: JSON.stringify({
          type: 'console',
          message: 'Something got worse',
          level: 'warn',
          params: [],
        }),
        timestamp: 0,
      },
    ]);
    expect(logger.sources.items[1].events).toStrictEqual([
      {
        message: JSON.stringify({
          type: 'console',
          message: 'Error: Something went wrong',
          level: 'error',
          params: [],
        }),
        timestamp: 0,
      },
    ]);
  });

  it('should receive from custom trigger', async (): Promise<void> => {
    await logger.notify('error', new Error('Something went wrong'));
    await logger.notify('warn', 'Something got worse');
    expect(logger.sources.items[0].events).toStrictEqual([
      {
        message: JSON.stringify({
          type: 'custom',
          message: 'Something got worse',
          params: [],
        }),
        timestamp: 0,
      },
    ]);
    expect(logger.sources.items[1].events).toStrictEqual([
      {
        message: JSON.stringify({
          type: 'custom',
          message: 'Error: Something went wrong',
          params: [],
        }),
        timestamp: 0,
      },
    ]);
  });
});

describe('Creating logStream', (): void => {
  it('should create new logStream', async (): Promise<void> => {
    // const name = await logger.channels.items[0].name;
    // expect(name).toBe('app');
    // expect(await storage.getItem('CloudWatchFrontLogger:logStreamName')).toBe('app');
    // expect(logger.sources.items[0].events.sink['example/abc123']).toStrictEqual([]);
  });
  //
  // it('should return cached logStream', async (): Promise<void> => {
  //   await storage.setItem('CloudWatchFrontLogger:logStreamName', 'abc123');
  //   const name = await (logger as any).getLogStreamName();
  //   expect(name).toBe('abc123');
  //   expect((logger as any).client.sink['example/abc123']).toBeUndefined();
  // });
  //
  // it('should recover from ResourceAlreadyExistsException', async (): Promise<void> => {
  //   (logger as any).client.send = jest
  //     .fn()
  //     .mockRejectedValue(
  //       new DummyAWSError(
  //         'Duplicate LogStream',
  //         'ResourceAlreadyExistsException'
  //       )
  //     );
  //   const name = await (logger as any).getLogStreamName();
  //   expect(name).toBe('abc123');
  //   expect(await storage.getItem('CloudWatchFrontLogger:logStreamName')).toBe(
  //     'abc123'
  //   );
  //   expect((logger as any).client.sink['example/abc123']).toBeUndefined();
  // });
  //
  // it('should halt when other error occurred', async (): Promise<void> => {
  //   (logger as any).client.send = jest
  //     .fn()
  //     .mockRejectedValue(
  //       new DummyAWSError('Something went wrong', 'UnknownException')
  //     );
  //   const name = await (logger as any).getLogStreamName();
  //   expect(name).toBeNull();
  //   expect(globalConsole.messages).toStrictEqual([
  //     {
  //       message: new DummyAWSError('Something went wrong', 'UnknownException'),
  //       level: 'error',
  //     },
  //   ]);
  //   expect(
  //     await storage.getItem('CloudWatchFrontLogger:logStreamName')
  //   ).toBeNull();
  // });
  //
  // it('should fallback to default logStreamName', async (): Promise<void> => {
  //   install({
  //     logStreamNameResolver: undefined,
  //   });
  //   const name = await (logger as any).getLogStreamName();
  //   expect(name).toBe('anonymous');
  //   expect(await storage.getItem('CloudWatchFrontLogger:logStreamName')).toBe(
  //     'anonymous'
  //   );
  //   expect((logger as any).client.sink['example/anonymous']).toStrictEqual([]);
  // });
});

describe('Sending logs', (): void => {
  it('should send events', async (): Promise<void> => {
    // await globalConsole.error(new Error('Something went wrong'));
    // await globalConsole.warn('Something got worse');
    // await logger.workers.items[0].tick();
    // expect((logger as any).events).toStrictEqual([]);
    // expect((logger as any).client.sink['example/abc123']).toStrictEqual([
    //   {
    //     message: 'Error 1',
    //     timestamp: 1,
    //   },
    //   {
    //     message: 'Error 2',
    //     timestamp: 2,
    //   },
    // ]);
    // expect(storage.getItem('CloudWatchFrontLogger:sequenceToken')).toBe(
    //   'SEQUENCE_TOKEN_#'
    // );
  });
  //
  //   it('should reuse previous nextSequenceToken', async (): Promise<void> => {
  //     (logger as any).events.push({
  //       message: 'Error 1',
  //       timestamp: 1,
  //     });
  //     await logger.onInterval();
  //     (logger as any).events.push({
  //       message: 'Error 2',
  //       timestamp: 2,
  //     });
  //     await logger.onInterval();
  //     expect(storage.getItem('CloudWatchFrontLogger:sequenceToken')).toBe(
  //       'SEQUENCE_TOKEN_##'
  //     );
  //   });
  //
  //   it('should recover from InvalidSequenceTokenException', async (): Promise<void> => {
  //     (logger as any).events.push({
  //       message: 'Error 1',
  //       timestamp: 1,
  //     });
  //
  //     await logger.onInterval();
  //     const originalSend = (logger as any).client.send;
  //     (logger as any).client.send = jest.fn((command) => {
  //       if (!(command instanceof PutLogEventsCommand)) {
  //         return originalSend.call(logger, command);
  //       }
  //       (logger as any).client.sink[
  //         `${command.input.logGroupName}/${command.input.logStreamName}`
  //       ].push(...(command.input?.logEvents ?? []));
  //       return Promise.reject(
  //         new DummyAWSError(
  //           '... The next expected sequenceToken is  ...',
  //           'InvalidSequenceTokenException',
  //           'SEQUENCE_TOKEN_123'
  //         )
  //       );
  //     });
  //     (logger as any).events.push({
  //       message: 'Error 2',
  //       timestamp: 2,
  //     });
  //
  //     await logger.onInterval();
  //     expect((logger as any).events).toStrictEqual([
  //       {
  //         message: 'Error 2',
  //         timestamp: 2,
  //       },
  //     ]);
  //     expect((logger as any).client.sink['example/abc123']).toStrictEqual([
  //       {
  //         message: 'Error 1',
  //         timestamp: 1,
  //       },
  //       {
  //         message: 'Error 2',
  //         timestamp: 2,
  //       },
  //     ]);
  //     expect(storage.getItem('CloudWatchFrontLogger:sequenceToken')).toBe(
  //       'SEQUENCE_TOKEN_123'
  //     );
  //   });
  //
  //   it('should halt when other error occurred', async (): Promise<void> => {
  //     (logger as any).events.push({
  //       message: 'Error 1',
  //       timestamp: 1,
  //     });
  //
  //     await logger.onInterval();
  //
  //     const originalSend = (logger as any).client.send;
  //     (logger as any).client.send = jest.fn((command) => {
  //       if (!(command instanceof PutLogEventsCommand)) {
  //         return originalSend.call(logger, command);
  //       }
  //
  //       (logger as any).client.sink[
  //         `${command.input.logGroupName}/${command.input.logStreamName}`
  //       ].push(...(command.input?.logEvents ?? []));
  //       return Promise.reject(
  //         new DummyAWSError(
  //           '... The next expected sequenceToken is: ?????  ...',
  //           'InvalidSequenceTokenException'
  //         )
  //       );
  //     });
  //     (logger as any).events.push({
  //       message: 'Error 2',
  //       timestamp: 2,
  //     });
  //
  //     await logger.onInterval();
  //     expect((logger as any).events).toStrictEqual([]);
  //     expect((logger as any).client.sink['example/abc123']).toStrictEqual([
  //       {
  //         message: 'Error 1',
  //         timestamp: 1,
  //       },
  //       {
  //         message: 'Error 2',
  //         timestamp: 2,
  //       },
  //     ]);
  //     expect(storage.getItem('CloudWatchFrontLogger:sequenceToken')).toBeNull();
  //   });
});
