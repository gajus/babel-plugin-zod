/* eslint-disable canonical/id-match */

import { type z } from 'zod';

export const defineBuildZodSchema = (
  build: (hash: string, buildZodSchema: () => z.ZodTypeAny) => void,
) => {
  globalThis._buildZodSchema = build;
};
