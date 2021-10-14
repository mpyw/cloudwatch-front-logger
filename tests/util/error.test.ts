import { isValidAWSError, isValidError } from '../../src';
import { DummyAWSError } from '../stub';

describe('isValidError', () => {
  it('should pass basic error', () => {
    expect(isValidError(new Error())).toBe(true);
  });
  it('should pass AWSError', () => {
    expect(
      isValidError(
        new DummyAWSError('message', 'DummyAWSError', 'sequenceToken')
      )
    ).toBe(true);
  });
  it('should block pure object', () => {
    expect(
      isValidError({
        name: 'Error',
        message: 'Message',
      })
    ).toBe(false);
  });
  it('should block null', () => {
    expect(isValidError(null)).toBe(false);
  });
});

describe('isValidAWSError', () => {
  it('should pass basic error', () => {
    expect(isValidAWSError(new Error())).toBe(true);
  });
  it('should block AWSError with invalid expectedSequenceToken', () => {
    expect(
      isValidAWSError(new DummyAWSError('message', 'DummyAWSError', 123 as any))
    ).toBe(false);
  });
  it('should pass AWSError', () => {
    expect(
      isValidAWSError(
        new DummyAWSError('message', 'DummyAWSError', 'sequenceToken')
      )
    ).toBe(true);
  });
  it('should block pure object', () => {
    expect(
      isValidAWSError({
        name: 'Error',
        message: 'Message',
      })
    ).toBe(false);
  });
  it('should block null', () => {
    expect(isValidAWSError(null)).toBe(false);
  });
});
