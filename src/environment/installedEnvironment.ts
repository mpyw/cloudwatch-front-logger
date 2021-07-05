import { ConsoleInterface } from '../types';
import { Environment } from './environment';

export class InstalledEnvironment extends Environment {
  constructor(
    readonly originalConsole: ConsoleInterface,
    environment: Environment
  ) {
    super(environment);
  }
}
