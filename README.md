# Babel Plugin to Cache Zod Schemas for Performance Optimization

Automatically transforms [Zod](https://zod.dev/) schema definitions into cached versions to improve performance by preventing re-initialization.

## Before and After

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

After you install the plugin, you have to define the `_buildZodSchema` helper in your project.

```ts
global._buildZodSchema = (hash: string, buildZodSchema: () => ZodSchema) => {}
```

Example:

```ts
const zodSchemaCache: Record<string, unknown> = {};

global._buildZodSchema = (hash: string, buildZodSchema: () => ZodSchema) => {
  if (zodSchemaCache[uid]) {
    return zodSchemaCache[uid];
  }

  zodSchemaCache[uid] = buildZodSchema();

  return zodSchemaCache[uid];
};
```

### Combining it with `zod-accelerator`

[`zod-accelerator`](https://www.npmjs.com/package/@duplojs/zod-accelerator) is a library that allows you to accelerate Zod schemas, and it can make a very big difference in performance. However, instrumenting every instance of `z.object()` is not practical. This plugin helps you to do that automatically.

```ts
import { ZodAccelerator } from '@duplojs/zod-accelerator';

const zodSchemaCache: Record<string, unknown> = {};

global._buildZodSchema = (uid: string, build: () => z.ZodTypeAny) => {
  if (zodSchemaCache[uid]) {
    return zodSchemaCache[uid];
  }

  zodSchemaCache[uid] = ZodAccelerator.build(build()) as unknown as z.ZodTypeAny;

  return zodSchemaCache[uid];
};
