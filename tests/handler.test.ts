import { Handler, SourceCollection, ConsoleMessage } from '../src';
import { DummyConsole } from './stub';

jest.mock('./stub');
const ConsoleMock = DummyConsole as jest.Mock<DummyConsole>;

jest.mock('../src/channel/channelCollection');
const SourceCollectionMock =
  SourceCollection as unknown as jest.Mock<SourceCollection>;

const prepareDeps = ({ muted = false } = {}) => {
  const originalConsole = new ConsoleMock();
  const sources = new SourceCollectionMock();
  const filteredSources = new SourceCollectionMock();
  const mutedGetter = jest.fn(() => muted);
  sources.filterByLevel = jest.fn(() => filteredSources);
  Object.defineProperty(filteredSources, 'muted', {
    get: mutedGetter,
  });
  filteredSources.push = jest.fn();
  return { originalConsole, sources, filteredSources, mutedGetter };
};

describe('Handler', () => {
  it('should call console and push messages', async () => {
    const deps = prepareDeps();
    const handler = new Handler(deps.originalConsole, deps.sources);
    await handler.warn('msg', 'foo', 'bar');
    expect(deps.mutedGetter).toBeCalledTimes(1);
    expect(deps.originalConsole.warn).toBeCalledTimes(1);
    expect(deps.originalConsole.warn).toBeCalledWith('msg', 'foo', 'bar');
    expect(deps.filteredSources.push).toBeCalledTimes(1);
    expect(deps.filteredSources.push).toBeCalledWith(
      new ConsoleMessage('warn', 'msg', ['foo', 'bar'])
    );
  });

  it('should ignore console when muted', async () => {
    const deps = prepareDeps({ muted: true });
    const handler = new Handler(deps.originalConsole, deps.sources);
    await handler.warn('msg', 'foo', 'bar');
    expect(deps.mutedGetter).toBeCalledTimes(1);
    expect(deps.originalConsole.warn).not.toBeCalled();
    expect(deps.filteredSources.push).toBeCalledTimes(1);
    expect(deps.filteredSources.push).toBeCalledWith(
      new ConsoleMessage('warn', 'msg', ['foo', 'bar'])
    );
  });
});
