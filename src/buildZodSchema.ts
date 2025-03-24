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
    CallExpression(path, state) {
      // Check if it's a MemberExpression (something.something())
      const callee = path.node.callee;

      if (!t.isMemberExpression(callee)) {
        return;
      }

      // Check if the object is 'z'
      if (!t.isIdentifier(callee.object, { name: 'z' })) {
        return;
      }

      // Check if the property is 'object'
      if (!t.isIdentifier(callee.property, { name: 'object' })) {
        return;
      }

      // Check if this z.object() is already inside a _buildZodSchema call
      let currentPath = path.parentPath;
      while (currentPath) {
        // If we're already inside a return statement inside an arrow function inside _buildZodSchema,
        // then we don't need to transform this node
        if (
          currentPath.isCallExpression() &&
          t.isIdentifier(currentPath.node.callee, { name: '_buildZodSchema' })
        ) {
          return;
        }

        currentPath = currentPath.parentPath;
      }

      // Get the location information
      const loc = path.node.loc;
      if (!loc) {
        return;
      }

      const filename = state.filename || 'unknown';
      const locationHash = calculateLocationHash(filename, loc);

      // Create the arrow function that wraps the original z.object call
      const wrappedArgument = t.arrowFunctionExpression(
        [],
        t.blockStatement([t.returnStatement(path.node)]),
      );

      const newNode = t.callExpression(t.identifier('_buildZodSchema'), [
        t.stringLiteral(locationHash),
        wrappedArgument,
      ]);

      // Replace the old node with the new one
      path.replaceWith(newNode);
      path.skip(); // Still skip processing the children to be safe
    },
  };

  return {
    name: 'babel-plugin-zod',
    visitor,
  };
});
