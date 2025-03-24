import { declare } from '@babel/helper-plugin-utils';
import { type Visitor } from '@babel/traverse';
// eslint-disable-next-line id-length
import * as t from '@babel/types';
import { createHash } from 'node:crypto';

export const buildZodSchema = (
  hash: string,
  build: () => t.ObjectExpression,
) => {
  // eslint-disable-next-line canonical/id-match
  global._buildZodSchema = buildZodSchema(hash, build);
};

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
      // or inside another z.object call
      let currentPath = path.parentPath;
      let isInsideZObject = false;
      let isInsideBuildZodSchema = false;

      while (currentPath && !isInsideZObject && !isInsideBuildZodSchema) {
        // Check if we're inside a _buildZodSchema call
        if (
          currentPath.isCallExpression() &&
          t.isIdentifier(currentPath.node.callee, { name: '_buildZodSchema' })
        ) {
          isInsideBuildZodSchema = true;
          break;
        }

        // Check if we're inside another z.object call
        if (
          currentPath.isCallExpression() &&
          t.isMemberExpression(currentPath.node.callee) &&
          t.isIdentifier(currentPath.node.callee.object, { name: 'z' }) &&
          t.isIdentifier(currentPath.node.callee.property, { name: 'object' })
        ) {
          isInsideZObject = true;
          break;
        }

        currentPath = currentPath.parentPath;
      }

      // Skip transformation if the node is already inside _buildZodSchema or another z.object
      if (isInsideBuildZodSchema || isInsideZObject) {
        return;
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
      path.skip(); // Skip processing the children to avoid infinite recursion
    },
  };

  return {
    name: 'babel-plugin-zod',
    visitor,
  };
});
