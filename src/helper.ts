/* eslint-disable no-negated-condition */

import { type z } from 'zod';

export const defineBuildZodSchema = (
  build: (hash: string, buildZodSchema: () => z.ZodTypeAny) => void,
) => {
  if (typeof global !== 'undefined') {
    // eslint-disable-next-line canonical/id-match
    global._buildZodSchema = build;
    // @ts-expect-error - window is not defined in Node.js
  } else if (typeof window !== 'undefined') {
    // @ts-expect-error - window is not defined in Node.js
    // eslint-disable-next-line canonical/id-match
    window._buildZodSchema = build;
  } else {
    throw new TypeError('Could not define _buildZodSchema');
  }
};
