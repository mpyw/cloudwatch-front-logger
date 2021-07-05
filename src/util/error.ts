import {
  AWSError,
  StreamAlreadyExistsError,
  UnrecoverableSequenceTokenError,
} from '../types';

export const isValidError = (value: unknown): value is Error => {
  return value instanceof Error;
};

export const isValidAWSError = (value: unknown): value is AWSError => {
  if (!isValidError(value)) {
    return false;
  }
  const e = value as AWSError;
  return (
    typeof e.expectedSequenceToken === 'string' ||
    typeof e.expectedSequenceToken === 'undefined'
  );
};

export const isStreamAlreadyExistsError = (
  value: unknown
): value is StreamAlreadyExistsError => {
  if (!isValidAWSError(value)) {
    return false;
  }
  return value.name === 'ResourceAlreadyExistsException';
};

export const isUnrecoverableSequenceTokenError = (
  value: unknown
): value is UnrecoverableSequenceTokenError => {
  if (!isValidAWSError(value)) {
    return false;
  }
  return (
    value.name !== 'DataAlreadyAcceptedException' &&
    value.name !== 'InvalidSequenceTokenException' &&
    !value.expectedSequenceToken
  );
};

export class BrowserPolyfillRequiredError extends Error {
  constructor(
    readonly missingComponents: readonly (keyof Window)[],
    message?: string
  ) {
    super(message ?? `Missing components: ${missingComponents.join(', ')}`);

    Object.setPrototypeOf(this, BrowserPolyfillRequiredError.prototype);
  }
}
