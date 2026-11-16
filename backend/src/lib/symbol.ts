import { z } from 'zod';

/** US ticker: letters/digits plus "." or "-" (e.g. BRK.B), stored uppercase. */
export const symbolSchema = z
  .string()
  .trim()
  .toUpperCase()
  .pipe(z.string().regex(/^[A-Z0-9][A-Z0-9.-]{0,9}$/, 'Invalid symbol'));
