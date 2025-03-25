import buildZodSchema from './buildZodSchema';
import { pluginTester } from 'babel-plugin-tester';
import multiline from 'multiline-ts';

pluginTester({
  filepath: 'test.ts',
  plugin: buildZodSchema,
  tests: [
    {
      code: multiline`
        z.object({
          bar: z.text(),
        });
      `,
      output: multiline`
        globalThis._buildZodSchema(
          "c1c2373eb425b16698f3f429aabce7df0b6ac8aa6b33c81dae70f2fa64b29815",
          () => {
            return z.object({
              bar: z.text(),
            });
          }
        );
      `,
      title: 'replaces z.object() with _buildZodSchema()',
    },
    {
      code: multiline`
        globalThis._buildZodSchema("existing-hash", () => {
          return z.object({
            bar: z.text(),
          });
        });
      `,
      output: multiline`
        globalThis._buildZodSchema("existing-hash", () => {
          return z.object({
            bar: z.text(),
          });
        });
      `,
      title: 'does not transform z.object() inside existing _buildZodSchema',
    },
    {
      code: multiline`
        const schema = z.object({
          name: z.string(),
          nested: z.object({
            foo: z.string(),
            bar: z.number(),
          }),
        });
      `,
      output: multiline`
        const schema = globalThis._buildZodSchema(
          "9328f27e5ba0f8474eb620a7bdc90396f6d18ac92f2969666e95b43cff6f961b",
          () => {
            return z.object({
              name: z.string(),
              nested: z.object({
                foo: z.string(),
                bar: z.number(),
              }),
            });
          }
        );
      `,
      title: 'only transforms top-level z.object() calls (ignores nested)',
    },
  ],
});
