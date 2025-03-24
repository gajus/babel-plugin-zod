import { type z } from 'zod';

export const buildZodSchema = (
  build: (hash: string, buildZodSchema: () => z.ZodTypeAny) => void,
) => {
  // eslint-disable-next-line canonical/id-match
  global._buildZodSchema = build;
};
