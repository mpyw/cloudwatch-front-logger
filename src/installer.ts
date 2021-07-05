import { ConsoleInterface, EnvironmentalOptions, Level } from './types';
import { Environment, InstalledEnvironment } from './environment';
import { Handler } from './handler';
import { Logger } from './logger';
import { Collector, CollectorCollection } from './collector';
import { Worker, WorkerCollection } from './worker';

export class Installer {
  protected environment: Environment;

  constructor(environment?: Environment | EnvironmentalOptions) {
    this.environment =
      environment instanceof Environment
        ? environment
        : new Environment(environment);
  }

  install(
    collectors: Collector | readonly Collector[] | CollectorCollection
  ): Logger {
    if (this.environment instanceof InstalledEnvironment) {
      throw new Error('Already installed!');
    }

    const collectorCollection = CollectorCollection.wrap(collectors);
    const originalConsole = {} as ConsoleInterface;
    const handler = new Handler(originalConsole, collectorCollection.sources);

    const installedEnvironment = (this.environment = this.injectHandler(
      handler,
      originalConsole
    ));
    this.listenUncaughtError(handler);
    const workers = this.setUpWorkers(
      installedEnvironment,
      collectorCollection
    );

    const logger = new Logger(installedEnvironment, handler, workers);
    logger.workers.start();

    return logger;
  }

  protected injectHandler(
    handler: Handler,
    originalConsole: ConsoleInterface
  ): InstalledEnvironment {
    const levels: readonly Level[] = ['debug', 'info', 'log', 'warn', 'error'];

    for (const level of levels) {
      // Swap window.console.*() functions and overridden ones (type="console")
      originalConsole[level] = this.environment.console[level].bind(
        this.environment.console
      );
      this.environment.console[level] = handler[level];
    }

    return new InstalledEnvironment(originalConsole, this.environment);
  }

  protected listenUncaughtError(handler: Handler): void {
    // Listen "error" event on window (type="uncaught")
    this.environment.eventTarget.addEventListener(
      'error',
      handler.uncaught as (evt: Event) => Promise<void>
    );
  }

  protected setUpWorkers(
    environment: InstalledEnvironment,
    collectors: CollectorCollection
  ): WorkerCollection {
    // Start timer that executes this.onInterval()
    return WorkerCollection.wrap(
      collectors.items.map((collector) => new Worker(environment, collector))
    );
  }
}
