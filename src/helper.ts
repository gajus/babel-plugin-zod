import { type z } from 'zod';

export const defineBuildZodSchema = (
  build: (hash: string, buildZodSchema: () => z.ZodTypeAny) => void,
) => {
  // eslint-disable-next-line canonical/id-match
  global._buildZodSchema = build;
};
