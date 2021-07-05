import { EventSink, Source, SourceCollection } from '../../src';

jest.mock('../../src/source/eventSink');
const EventSinkMock = EventSink as jest.Mock<EventSink>;

const defaults = {
  muted: false,
  disabled: false,
  messageFormatter: () => 'dummy',
  timestampProvider: () => 1,
  eventSink: new EventSinkMock(),
};

const createSources = () =>
  new SourceCollection([
    new Source({ ...defaults, level: 'error' }),
    new Source({ ...defaults, level: 'error' }),
    new Source({ ...defaults, level: 'warn' }),
    new Source({ ...defaults, level: 'warn' }),
    new Source({ ...defaults, level: 'warn' }),
  ]);

describe('sourceCollection', () => {
  it('should filter by level', () => {
    const sources = createSources();
    expect(sources.filterByLevel('error').items).toHaveLength(2);
    expect(sources.filterByLevel('warn').items).toHaveLength(3);
  });

  it('should find by level', () => {
    const sources = createSources();
    expect(sources.findByLevel('error')).toBe(sources.items[0]);
    expect(sources.findByLevel('warn')).toBe(sources.items[2]);
    expect(sources.findByLevel('info')).toBeUndefined();
  });
});
