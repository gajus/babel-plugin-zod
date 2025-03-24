import { declare } from '@babel/helper-plugin-utils';
import { type Visitor } from '@babel/traverse';
// eslint-disable-next-line id-length
import * as t from '@babel/types';
import { createHash } from 'node:crypto';

const calculateLocationHash = (filename: string, loc: t.SourceLocation) => {
  return createHash('sha256')
    .update(
      `${filename.split('/').slice(-2).join('/')}:${loc.start.line}:${loc.start.column}:${loc.end.line}:${loc.end.column}`,
    )
    .digest('hex');
};

export default declare((api) => {
  api.assertVersion(7);

  const visitor: Visitor = {
    CallExpression(path) {
      // Check if it's a MemberExpression (something.something())
      const callee = path.node.callee;

      if (!t.isMemberExpression(callee)) {
        return;
      }

      if (
        !t.isIdentifier(callee.object, { name: 'z' }) ||
        !t.isIdentifier(callee.property, { name: 'object' })
      ) {
        return;
      }

      // Get the location information
      const loc = path.node.loc;

      if (!loc) {
        return;
      }

      const locationHash = calculateLocationHash(
        this.filename ?? 'unknown',
        loc,
      );

      // Create the new function expression that wraps the original argument
      // const originalArgument = path.node.arguments[0];

      const wrappedArgument = t.arrowFunctionExpression(
        [],
        t.blockStatement([t.returnStatement(callee)]),
      );

      const newNode = t.callExpression(t.identifier('_buildZodSchema'), [
        t.stringLiteral(locationHash),
        wrappedArgument,
      ]);

      // Replace the old node with the new one
      path.replaceWith(newNode);
    },
  };

  return {
    name: 'build-zod-schema',
    visitor,
  };
});
