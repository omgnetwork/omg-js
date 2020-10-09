/** @internal */
export function prefixHex (hex: string): string {
  return hex.startsWith('0x')
    ? hex
    : `0x${hex}`;
};

/** @internal */
export function int192toHex (int192: number | string): string {
  return typeof int192 === 'string'
    ? prefixHex(int192)
    : prefixHex(int192.toString(16));
};
