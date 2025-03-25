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

      // Check if this z.object() is already inside a globalThis._buildZodSchema call
      // or inside another z.object call
      let currentPath = path.parentPath;
      let isInsideZObject = false;
      let isInsideBuildZodSchema = false;

      while (currentPath && !isInsideZObject && !isInsideBuildZodSchema) {
        // Check if we're inside a globalThis._buildZodSchema call
        if (
          currentPath.isCallExpression() &&
          t.isMemberExpression(currentPath.node.callee) &&
          t.isIdentifier(currentPath.node.callee.property, {
            name: '_buildZodSchema',
          }) &&
          // Direct globalThis._buildZodSchema
          (t.isIdentifier(currentPath.node.callee.object, {
            name: 'globalThis',
          }) ||
            // In case it's represented differently in the AST
            (t.isMemberExpression(currentPath.node.callee.object) &&
              t.isIdentifier(currentPath.node.callee.object.property, {
                name: 'globalThis',
              })))
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

      // Skip transformation if the node is already inside globalThis._buildZodSchema or another z.object
      if (isInsideBuildZodSchema || isInsideZObject) {
        return;
      }

      // Check if there are any non-z variable references within the z.object definition
      // First, make sure we have arguments
      if (path.node.arguments.length === 0) {
        return;
      }

      // Expect the first argument to be an object expression
      const firstArgument = path.node.arguments[0];
      if (!t.isObjectExpression(firstArgument)) {
        return; // Skip if first arg is not an object
      }

      // Function to check if a node is z-related
      const isZRelated = (node) => {
        // Direct z reference like z.string()
        if (
          t.isCallExpression(node) &&
          t.isMemberExpression(node.callee) &&
          t.isIdentifier(node.callee.object, { name: 'z' })
        ) {
          // Check arguments for non-z references
          for (const argument of node.arguments) {
            if (!isZRelated(argument) && !t.isLiteral(argument)) {
              return false;
            }
          }

          return true;
        }

        // Nested z.object calls
        if (
          t.isCallExpression(node) &&
          t.isMemberExpression(node.callee) &&
          t.isCallExpression(node.callee.object)
        ) {
          return isZRelated(node.callee.object);
        }

        // Allow chained methods on z objects like z.object().optional()
        if (t.isCallExpression(node) && t.isMemberExpression(node.callee)) {
          return isZRelated(node.callee.object);
        }

        // Allow literals (strings, numbers, booleans)
        if (t.isLiteral(node)) {
          return true;
        }

        // For object expressions (like in nested schemas), check all properties
        if (t.isObjectExpression(node)) {
          return node.properties.every((property) => {
            if (t.isObjectProperty(property)) {
              return isZRelated(property.value);
            }

            if (t.isSpreadElement(property)) {
              return isZRelated(property.argument);
            }

            return false;
          });
        }

        // Any other type of node is considered non-z
        return false;
      };

      // Check each property in the z.object for non-z references
      let hasNonZReferences = false;

      for (const property of firstArgument.properties) {
        if (t.isObjectProperty(property)) {
          if (!isZRelated(property.value)) {
            hasNonZReferences = true;
            break;
          }
        } else if (t.isSpreadElement(property)) {
          if (!isZRelated(property.argument)) {
            hasNonZReferences = true;
            break;
          }
        } else {
          // For any other property type, be conservative and skip transformation
          hasNonZReferences = true;
          break;
        }
      }

      // Skip transformation if non-z references are found
      if (hasNonZReferences) {
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

      // Create globalThis._buildZodSchema member expression
      const buildZodSchemaMemberExpr = t.memberExpression(
        t.identifier('globalThis'),
        t.identifier('_buildZodSchema'),
      );

      const newNode = t.callExpression(buildZodSchemaMemberExpr, [
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
