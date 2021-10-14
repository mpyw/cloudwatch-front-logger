import {
  Source,
  ConsoleMessage,
  EventSink,
  CustomMessage,
  ErrorEventMessage,
} from '../../src';

jest.mock('../../src/source/source');
const SourceMock = Source as jest.Mock<Source>;

const createDeps = ({ disabled = false } = {}) => {
  const messageFormatter: Source['messageFormatter'] = jest.fn((e) =>
    e.toJSON().message ? `${e.toJSON().message}(type=${e.toJSON().type})` : null
  );
  SourceMock.mockImplementationOnce(
    () => ({ messageFormatter } as unknown as Source)
  );
  const source = new SourceMock();
  const disabledGetter = jest.fn(() => disabled);
  Object.defineProperty(source, 'disabled', {
    get: disabledGetter,
  });
  return {
    source,
    disabledGetter,
    messageFormatter,
    timestampProvider: jest.fn(() => 123),
  };
};

describe('eventSink', () => {
  it('should ignore when disabled', async () => {
    const deps = createDeps({ disabled: true });
    const sink = new EventSink(deps.source, deps.timestampProvider);
    await sink.push(new ConsoleMessage('warn', 'Error!', []));
    expect(sink.flush()).toHaveLength(0);
    expect(deps.disabledGetter).toBeCalledTimes(1);
    expect(deps.messageFormatter).toBeCalledTimes(0);
    expect(deps.timestampProvider).toBeCalledTimes(0);
  });

  it('should filter empty messages', async () => {
    const deps = createDeps();
    const sink = new EventSink(deps.source, deps.timestampProvider);
    await sink.push(
      new ConsoleMessage('warn', 'Console Error', []),
      new ConsoleMessage('warn', '', []),
      new ErrorEventMessage({
        error: new Error('Error Event'),
      } as unknown as ErrorEvent),
      new ErrorEventMessage({ error: new Error('') } as unknown as ErrorEvent),
      new CustomMessage(new Error('Custom Error'), []),
      new CustomMessage(new Error(''), [])
    );
    const messages = sink.flush();
    expect(messages).toHaveLength(5);
    expect(messages).toEqual([
      { message: 'Console Error(type=console)', timestamp: 123 },
      { message: 'Error: Error Event(type=uncaught)', timestamp: 123 },
      { message: 'Error(type=uncaught)', timestamp: 123 },
      { message: 'Error: Custom Error(type=custom)', timestamp: 123 },
      { message: 'Error(type=custom)', timestamp: 123 },
    ]);
    expect(deps.disabledGetter).toBeCalledTimes(1);
    expect(deps.messageFormatter).toBeCalledTimes(6);
    expect(deps.timestampProvider).toBeCalledTimes(5);
  });

  it('should clear after flush', async () => {
    const deps = createDeps();
    const sink = new EventSink(deps.source, deps.timestampProvider);
    await sink.push(new ConsoleMessage('warn', 'Console Error', []));
    let messages = sink.flush();
    expect(messages).toHaveLength(1);
    expect(messages).toEqual([
      { message: 'Console Error(type=console)', timestamp: 123 },
    ]);
    messages = sink.flush();
    expect(messages).toHaveLength(0);
  });
});
