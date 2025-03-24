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
        _buildZodSchema(
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
        _buildZodSchema("existing-hash", () => {
          return z.object({
            bar: z.text(),
          });
        });
      `,
      output: multiline`
        _buildZodSchema("existing-hash", () => {
          return z.object({
            bar: z.text(),
          });
        });
      `,
      title: 'does not transform z.object() inside existing _buildZodSchema',
    },
  ],
});
