import { SourceFactory, Message, ConsoleMessage } from '../../src';

describe('sourceFactory', () => {
  it('should create with global default values', async () => {
    const factory = new SourceFactory();
    const source = factory.createSource('error');
    expect(source.muted).toBe(false);
    expect(source.disabled).toBe(false);
    expect(
      await source.messageFormatter(new ConsoleMessage('error', 'Error!', []))
    ).toBe('{"type":"console","message":"Error!","level":"error","params":[]}');
  });

  it('should create with factory default values', async () => {
    const factoryOptions = {
      muted: true,
      disabled: true,
      messageFormatter: async (m: Message) => `${m.type} error`,
    };
    const factory = new SourceFactory(factoryOptions);
    const source = factory.createSource('error');
    expect(source.muted).toBe(true);
    expect(source.disabled).toBe(true);
    expect(
      await source.messageFormatter(new ConsoleMessage('error', 'Error!', []))
    ).toBe('console error');
  });

  it('should create with artificial values(1)', async () => {
    const sourceOptions = {
      muted: true,
      disabled: true,
      messageFormatter: async (m: Message) => `${m.type} error`,
    };
    const factory = new SourceFactory();
    const source = factory.createSource('error', sourceOptions);
    expect(source.muted).toBe(true);
    expect(source.disabled).toBe(true);
    expect(
      await source.messageFormatter(new ConsoleMessage('error', 'Error!', []))
    ).toBe('console error');
  });

  it('should create with artificial values(2)', async () => {
    const sourceOptions = {
      level: 'error' as const,
      muted: true,
      disabled: true,
      messageFormatter: async (m: Message) => `${m.type} error`,
    };
    const factory = new SourceFactory();
    const source = factory.createSource(sourceOptions);
    expect(source.muted).toBe(true);
    expect(source.disabled).toBe(true);
    expect(
      await source.messageFormatter(new ConsoleMessage('error', 'Error!', []))
    ).toBe('console error');
  });

  it('should create multiple channels', async () => {
    const factory = new SourceFactory();
    const sources = factory.createSources(['error', 'warn'], { muted: true });
    expect(sources.items[0].level).toBe('error');
    expect(sources.items[0].muted).toBe(true);
    expect(sources.items[0].disabled).toBe(false);
    expect(sources.items[1].level).toBe('warn');
    expect(sources.items[1].muted).toBe(true);
    expect(sources.items[1].disabled).toBe(false);
  });
});
