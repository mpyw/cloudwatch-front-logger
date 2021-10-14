import {
  ConsoleInterface,
  EnvironmentalOptions,
  StorageInterface,
} from '../types';
import { BrowserPolyfillRequiredError } from '../util';

export class Environment implements EnvironmentalOptions {
  readonly storage: StorageInterface;
  readonly console: ConsoleInterface;
  readonly setInterval: typeof setInterval;
  readonly clearInterval: typeof clearInterval;
  readonly setTimeout: typeof setTimeout;
  readonly eventTarget: EventTarget;

  constructor(options?: EnvironmentalOptions) {
    this.storage = getStorageImpl(options);
    this.console = options?.console ?? console;
    this.setInterval = options?.setInterval ?? setInterval;
    this.clearInterval = options?.clearInterval ?? clearInterval;
    this.setTimeout = options?.setTimeout ?? setTimeout;
    this.eventTarget = getEventTargetImpl(options);
  }
}

const getStorageImpl = (options?: EnvironmentalOptions): StorageInterface => {
  return (
    options?.storage ??
    (typeof localStorage !== 'undefined'
      ? localStorage
      : needsPolyfill(['localStorage']))
  );
};

const getEventTargetImpl = (options?: EnvironmentalOptions): EventTarget => {
  if (options?.eventTarget) {
    return options?.eventTarget;
  }
  const top = typeof window !== 'undefined' ? window : globalThis;
  if (!top.addEventListener || !top.dispatchEvent) {
    needsPolyfill(['addEventListener', 'dispatchEvent']);
  }
  return top;
};

const needsPolyfill = (components: readonly (keyof Window)[]): never => {
  throw new BrowserPolyfillRequiredError(components);
};
