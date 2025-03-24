# Babel Plugin to Cache Zod Schemas

Automatically transforms [Zod](https://zod.dev/) schema definitions into cached versions to improve performance by preventing re-initialization, i.e.,

This:

```ts
z.object({
  bar: z.text(),
});
```

Becomes this:

```ts
_buildZodSchema(
  "8598d15279bd5e3eb41ae6d074d6b70568579dff7a7d27f096162eb373c1b344",
  () => {
    return z.object({
      bar: z.text(),
    });
  }
);
```

Where `_buildZodSchema` is a helper function that acts as a singleton.

## Motivation

Initializing [Zod](https://zod.dev/) schemas is expensive.

By using a build helper with a hash of the location, we can avoid re-initializing the schema every time we use it. This Babel plugin helps us to do that automatically without changing how we write our code.

## Why Use This?

- **Performance Boost**: Prevents unnecessary re-initialization and can leverage `zod-accelerator` to speed up the schema execution.
- **Zero Mental Overhead**: Write normal Zod code - the caching happens automatically.
- **No Code Changes Required**: Works with your existing codebase without modifications.

## Installation

```bash
npm install --save-dev babel-plugin-zod
```

## Usage

Add the plugin to your Babel configuration:

```json
{
  "plugins": ["babel-plugin-zod"]
}
```

After you install the plugin, you have to define the `_buildZodSchema` helper in your project, which you can do using the `defineBuildZodSchema` helper.

```ts
import { defineBuildZodSchema } from 'babel-plugin-zod/helper';

defineBuildZodSchema((hash, build) => {});
```

You have to do this once in your project, i.e. in your entry file.

> [!NOTE]
> Alternatively, you can just define a `global._buildZodSchema` variable and skip the `defineBuildZodSchema` helper.

Example:

```ts
import { defineBuildZodSchema } from 'babel-plugin-zod/helper';

const zodSchemaCache: Record<string, unknown> = {};

defineBuildZodSchema((hash, build) => {
  if (zodSchemaCache[uid]) {
    return zodSchemaCache[uid];
  }

  zodSchemaCache[uid] = build();

  return zodSchemaCache[uid];
});
```

### Combining it with `zod-accelerator`

[`zod-accelerator`](https://www.npmjs.com/package/@duplojs/zod-accelerator) is a library that allows you to accelerate Zod schemas, and it can make a very big difference in performance. However, instrumenting every instance of `z.object()` is not practical. This plugin helps you to do that automatically.

```ts
import { defineBuildZodSchema } from 'babel-plugin-zod/helper';
import { ZodAccelerator } from '@duplojs/zod-accelerator';

const zodSchemaCache: Record<string, unknown> = {};

defineBuildZodSchema((uid: string, build: () => z.ZodTypeAny) => {
  if (zodSchemaCache[uid]) {
    return zodSchemaCache[uid];
  }

  zodSchemaCache[uid] = ZodAccelerator.build(build()) as unknown as z.ZodTypeAny;

  return zodSchemaCache[uid];
});
```
