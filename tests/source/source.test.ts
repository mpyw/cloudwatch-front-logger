import { Source, SourceOptions, ConsoleMessage, EventSink } from '../../src';
import { InputLogEvent } from '@aws-sdk/client-cloudwatch-logs';

jest.mock('../../src/source/eventSink');
const EventSinkMock = EventSink as jest.Mock;

const createDefaultSourceOptions = (options?: {
  muted?: boolean;
  disabled?: boolean;
  now?: number;
}): SourceOptions => ({
  level: 'error',
  muted: options?.muted ?? false,
  disabled: options?.disabled ?? false,
  messageFormatter: (e) => String(e.error),
  timestampProvider: () => options?.now ?? new Date().getTime(),
});

describe('source', () => {
  it('should mute', () => {
    const source = new Source(createDefaultSourceOptions());
    source.mute();
    expect(source.muted).toBe(true);
  });

  it('should unmute', () => {
    const source = new Source(createDefaultSourceOptions({ muted: true }));
    source.unmute();
    expect(source.muted).toBe(false);
  });

  it('should disable', () => {
    const source = new Source(createDefaultSourceOptions());
    source.disable();
    expect(source.disabled).toBe(true);
  });

  it('should enable', () => {
    const source = new Source(createDefaultSourceOptions({ disabled: true }));
    source.enable();
    expect(source.disabled).toBe(false);
  });

  it('should push into sink', () => {
    const push = jest.fn();
    EventSinkMock.mockImplementation(() => {
      return { push } as unknown as EventSink;
    });
    const source = new Source(createDefaultSourceOptions());
    source.push(new ConsoleMessage('warn', 'msg', []));
    expect(push).toBeCalledTimes(1);
    expect(push).toBeCalledWith(new ConsoleMessage('warn', 'msg', []));
  });

  it('should flush from sink', () => {
    const flush = jest.fn().mockReturnValue([
      {
        message: 'foo',
        timestamp: 1,
      },
    ] as InputLogEvent[]);
    EventSinkMock.mockImplementation(() => {
      return { flush } as unknown as EventSink;
    });
    const source = new Source(createDefaultSourceOptions());
    expect(source.flush()).toEqual([
      {
        message: 'foo',
        timestamp: 1,
      },
    ]);
    expect(flush).toBeCalledTimes(1);
  });
});
