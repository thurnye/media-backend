import {
  ASTVisitor,
  FragmentDefinitionNode,
  GraphQLError,
  OperationDefinitionNode,
  SelectionNode,
  ValidationContext,
  ValidationRule,
} from 'graphql';

const MAX_QUERY_DEPTH = Number(process.env.GRAPHQL_MAX_DEPTH ?? 10);
const MAX_QUERY_COMPLEXITY = Number(process.env.GRAPHQL_MAX_COMPLEXITY ?? 300);

const getDepth = (
  selections: readonly SelectionNode[],
  fragments: Map<string, FragmentDefinitionNode>,
  depth: number,
  visitedFragments: Set<string>,
): number => {
  let max = depth;
  for (const selection of selections) {
    if (selection.kind === 'Field') {
      if (!selection.selectionSet) {
        max = Math.max(max, depth + 1);
        continue;
      }
      max = Math.max(
        max,
        getDepth(selection.selectionSet.selections, fragments, depth + 1, visitedFragments),
      );
      continue;
    }

    if (selection.kind === 'InlineFragment') {
      max = Math.max(
        max,
        getDepth(selection.selectionSet.selections, fragments, depth + 1, visitedFragments),
      );
      continue;
    }

    if (selection.kind === 'FragmentSpread') {
      const fragmentName = selection.name.value;
      if (visitedFragments.has(fragmentName)) continue;
      const fragment = fragments.get(fragmentName);
      if (!fragment) continue;
      visitedFragments.add(fragmentName);
      max = Math.max(
        max,
        getDepth(fragment.selectionSet.selections, fragments, depth + 1, visitedFragments),
      );
      visitedFragments.delete(fragmentName);
    }
  }
  return max;
};

const getComplexity = (
  selections: readonly SelectionNode[],
  fragments: Map<string, FragmentDefinitionNode>,
  visitedFragments: Set<string>,
): number => {
  let complexity = 0;
  for (const selection of selections) {
    if (selection.kind === 'Field') {
      complexity += 1;
      if (selection.selectionSet) {
        complexity += getComplexity(selection.selectionSet.selections, fragments, visitedFragments);
      }
      continue;
    }

    if (selection.kind === 'InlineFragment') {
      complexity += getComplexity(selection.selectionSet.selections, fragments, visitedFragments);
      continue;
    }

    if (selection.kind === 'FragmentSpread') {
      const fragmentName = selection.name.value;
      if (visitedFragments.has(fragmentName)) continue;
      const fragment = fragments.get(fragmentName);
      if (!fragment) continue;
      visitedFragments.add(fragmentName);
      complexity += getComplexity(fragment.selectionSet.selections, fragments, visitedFragments);
      visitedFragments.delete(fragmentName);
    }
  }
  return complexity;
};

export const depthAndComplexityValidationRule: ValidationRule = (
  context: ValidationContext,
): ASTVisitor => {
  return {
    OperationDefinition(node: OperationDefinitionNode) {
      const fragments = new Map<string, FragmentDefinitionNode>();
      for (const definition of context.getDocument().definitions) {
        if (definition.kind === 'FragmentDefinition') {
          fragments.set(definition.name.value, definition);
        }
      }

      const depth = getDepth(node.selectionSet.selections, fragments, 0, new Set());
      if (depth > MAX_QUERY_DEPTH) {
        context.reportError(
          new GraphQLError(
            `GraphQL query depth ${depth} exceeds maximum allowed depth ${MAX_QUERY_DEPTH}`,
            { nodes: node },
          ),
        );
        return;
      }

      const complexity = getComplexity(node.selectionSet.selections, fragments, new Set());
      if (complexity > MAX_QUERY_COMPLEXITY) {
        context.reportError(
          new GraphQLError(
            `GraphQL query complexity ${complexity} exceeds maximum allowed complexity ${MAX_QUERY_COMPLEXITY}`,
            { nodes: node },
          ),
        );
      }
    },
  };
};
