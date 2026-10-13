/**
 * CardioVision E2E Test Suite Assertion Helper
 * Provides strict, zero-dependency assertions compatible with both Node.js execution
 * and strict TypeScript compiler settings (no @types/node required).
 */

export class AssertionError extends Error {
  public actual: unknown;
  public expected: unknown;

  constructor(message: string, actual?: unknown, expected?: unknown) {
    super(message);
    this.name = 'AssertionError';
    this.actual = actual;
    this.expected = expected;
  }
}

export function assert(condition: boolean, message = 'Assertion failed'): void {
  if (!condition) {
    throw new AssertionError(message, condition, true);
  }
}

export function strictEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    const msg = message || `Expected ${JSON.stringify(actual)} to strictly equal ${JSON.stringify(expected)}`;
    throw new AssertionError(msg, actual, expected);
  }
}

export function notStrictEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual === expected) {
    const msg = message || `Expected ${JSON.stringify(actual)} NOT to strictly equal ${JSON.stringify(expected)}`;
    throw new AssertionError(msg, actual, expected);
  }
}

export function closeTo(actual: number, expected: number, delta = 0.005, message?: string): void {
  const diff = Math.abs(actual - expected);
  if (diff > delta) {
    const msg = message || `Expected ${actual} to be close to ${expected} (diff: ${diff} > delta: ${delta})`;
    throw new AssertionError(msg, actual, expected);
  }
}

export function deepStrictEqual<T>(actual: T, expected: T, message?: string): void {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    const msg = message || `Deep equality mismatch:\nActual:   ${actualStr}\nExpected: ${expectedStr}`;
    throw new AssertionError(msg, actual, expected);
  }
}

export function throws(fn: () => void, expectedPattern?: RegExp | string, message?: string): void {
  let didThrow = false;
  let thrownError: unknown = null;
  try {
    fn();
  } catch (err) {
    didThrow = true;
    thrownError = err;
  }

  if (!didThrow) {
    throw new AssertionError(message || 'Expected function to throw, but it did not throw.');
  }

  if (expectedPattern && thrownError instanceof Error) {
    if (typeof expectedPattern === 'string') {
      if (!thrownError.message.includes(expectedPattern)) {
        throw new AssertionError(
          `Expected error message "${thrownError.message}" to include "${expectedPattern}"`
        );
      }
    } else if (!expectedPattern.test(thrownError.message)) {
      throw new AssertionError(
        `Expected error message "${thrownError.message}" to match pattern ${expectedPattern}`
      );
    }
  }
}

export function doesNotThrow(fn: () => void, message?: string): void {
  try {
    fn();
  } catch (err) {
    throw new AssertionError(
      message || `Expected function not to throw, but it threw: ${(err as Error).message}`
    );
  }
}
