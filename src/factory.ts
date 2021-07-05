import { Channel, ChannelFactory } from './channel';
import { Source, SourceCollection, SourceFactory } from './source';
import { Collector, CollectorCollection, CollectorFactory } from './collector';
import { Installer } from './installer';
import {
  ChannelFactoryOptions,
  ChannelOptions,
  CreateSourceOptionsWithoutLevel,
  EnvironmentalOptions,
  Exact,
  FactoryHelper,
  Level,
  SourceFactoryOptions,
} from './types';
import { Logger } from './logger';
import { Environment } from './environment';
import { BrowserPolyfillRequiredError } from './util';

export const createFactory = <O extends Partial<ChannelFactoryOptions>>({
  channelFactoryOptions,
  sourceFactoryOptions,
  environment,
}: {
  channelFactoryOptions?: Exact<O, Partial<ChannelFactoryOptions>>;
  sourceFactoryOptions?: SourceFactoryOptions;
  environment?: Environment | EnvironmentalOptions;
} = {}): FactoryHelper<O> => {
  const instance = {
    channel: new ChannelFactory(channelFactoryOptions),
    source: new SourceFactory(sourceFactoryOptions),
    collector: new CollectorFactory(),
    installer: new Installer(environment),
  };
  return {
    install(
      collectors: Collector | readonly Collector[] | CollectorCollection
    ): Logger {
      return instance.installer.install(collectors);
    },
    createChannel(name: string, options: ChannelOptions) {
      return instance.channel.createChannel(name, options);
    },
    createSource(...args: unknown[]): Source {
      return instance.source.createSource(
        ...(args as Parameters<FactoryHelper<O>['createSource']>)
      );
    },
    createSources(
      levels: readonly Level[],
      options?: CreateSourceOptionsWithoutLevel
    ): SourceCollection {
      return instance.source.createSources(levels, options);
    },
    createCollector(
      channel: Channel,
      sources: Source | readonly Source[] | SourceCollection
    ): Collector {
      return instance.collector.createCollector(channel, sources);
    },
  };
};

let defaultFactoryForBrowser = null as unknown as FactoryHelper<any>;
try {
  defaultFactoryForBrowser = createFactory();
} catch (e: unknown) {
  if (!(e instanceof BrowserPolyfillRequiredError)) {
    throw e;
  }
}
export const factory = defaultFactoryForBrowser;
