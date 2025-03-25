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
        const schema1 = z.object({ a: z.string() });
        const schema2 = z.object({ b: z.number() });
      `,
      output: multiline`
        const schema1 = globalThis._buildZodSchema(
          "57a076ef0f2fdfa31b30763a801dbe37081ae4b797887221e969fb1de3e80336",
          () => {
            return z.object({
              a: z.string(),
            });
          }
        );
        const schema2 = globalThis._buildZodSchema(
          "5509c4d2f307e994ab04c0f17a361f7e34902352db6728039c50bbb3093eeea9",
          () => {
            return z.object({
              b: z.number(),
            });
          }
        );
      `,
      title: 'handles multiple z.object instances in the same file',
    },
    {
      code: multiline`
        const result = z.object({ a: z.string() }).parse(input);
      `,
      output: multiline`
        const result = globalThis
          ._buildZodSchema(
            "29cf1d02b9ec7ac8b8c012ed363f46cb7b049488b47edbc0dbf1a5925128e0db",
            () => {
              return z.object({
                a: z.string(),
              });
            }
          )
          .parse(input);
      `,
      title: 'handles z.object in method chains',
    },
    {
      code: multiline`
        z.object({
          outer: z.string(),
          nested: z.object({
            inner: z.number()
          }).optional(),
        });
      `,
      output: multiline`
        globalThis._buildZodSchema(
          "d2064353ee7fca2b2a801a2120af429c397cffed9d97872051aa6aef1f3b1081",
          () => {
            return z.object({
              outer: z.string(),
              nested: z
                .object({
                  inner: z.number(),
                })
                .optional(),
            });
          }
        );
      `,
      title: 'handles z.object with nested z.object and chained methods',
    },
    {
      code: multiline`
        const obj = someOtherLib.object({ a: 1 });
        const notZ = notZ.object({ b: 2 });
      `,
      output: multiline`
        const obj = someOtherLib.object({
          a: 1,
        });
        const notZ = notZ.object({
          b: 2,
        });
      `,
      title: 'does not transform non-z.object calls',
    },
    {
      code: multiline`
        const zodLib = z;
        const schema = zodLib.object({ a: z.string() });
      `,
      output: multiline`
        const zodLib = z;
        const schema = zodLib.object({
          a: z.string(),
        });
      `,
      title: 'does not transform when z is referenced through another variable',
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
    {
      code: multiline`
        const PersonZodObject = z.object({ name: z.string() });
        
        const schema = z.object({
          person: PersonZodObject,
        });
      `,
      output: multiline`
        const PersonZodObject = globalThis._buildZodSchema(
          "2dbec3f5a819b8517fc5a0a136c58507ddb7801d70d3e0cb5549fad881c7bcdd",
          () => {
            return z.object({
              name: z.string(),
            });
          }
        );
        const schema = z.object({
          person: PersonZodObject,
        });
      `,
      title: 'does not transform z.object() that references external variables',
    },
  ],
});
