import * as Errors from '@lib/errors';

/** Prefix a hex string with 0x */
export function prefixHex (hex: string): string {
  return hex.startsWith('0x')
    ? hex
    : `0x${hex}`;
};

/** Turn a int192 into a prefixed hex string */
export function int192toHex (int192: number | string): string {
  return typeof int192 === 'string'
    ? prefixHex(int192)
    : prefixHex(int192.toString(16));
};

/** @internal */
export async function formatResponse (
  method: string,
  callback: () => Promise<any>
): Promise<any> {
  try {
    return await callback();
  } catch (error) {
    // sanitize joi validation errors
    if (error.name === 'ValidationError') {
      throw new Errors.ValidationError({
        message: error.details[0].message,
        stack: error.stack,
        method
      });
    }

    // wrap lib errors with passed method
    throw new Errors.OmgJSError({
      message: error.message,
      stack: error.stack,
      method
    });
  }
}
