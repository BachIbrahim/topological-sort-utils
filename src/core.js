/**
 * Core implementation of topological sort with named cycle reporting.
 *
 * Design decisions:
 * - Nodes are plain string keys. Dependencies are given as a Map<string, string[]>.
 *   This keeps the API explicit and lets the caller manage node identity without
 *   forcing a wrapper type.
 * - We pick the interpretation that a node listed in a dependency array but absent
 *   as a key in the map is still a valid node (it has no dependencies of its own).
 *   This avoids surprising "missing node" errors for edges like `a -> b` where b
 *   simply has no further dependencies.
 * - When a cycle is detected, we report the cycle as the list of node names in the
 *   order they were traversed, starting from the node that closed the loop. We
 *   return ALL independent cycles found during a single pass, not just the first.
 * - Sort order among independent nodes is insertion order of the Map iteration,
 *   which is deterministic for a given input Map.
 */

/**
 * Result of a topological sort attempt.
 *
 * @typedef {Object} SortResult
 * @property {boolean} ok          - True when a complete ordering was found.
 * @property {string[]} sorted     - The ordered node names. Empty when ok is false.
 * @property {string[][]} cycles   - Each cycle is an array of node names. Empty when ok is true.
 */

/**
 * Orders the nodes of a dependency graph so that every node appears after all
 * of the nodes it depends on.
 *
 * @param {Map<string, string[]>} deps - A map from node name to the list of
 *   node names it depends on.
 * @returns {SortResult}
 */
export function topologicalSort(deps) {
  return createTopologicalSorter(deps).sort();
}

/**
 * Builds a reusable sorter bound to a specific dependency map. Useful when you
 * expect to re-sort the same graph after small mutations, though note the map
 * is captured by reference.
 *
 * @param {Map<string, string[]>} deps
 * @returns {{ sort: () => SortResult }}
 */
export function createTopologicalSorter(deps) {
  if (!(deps instanceof Map)) {
    throw new TypeError('deps must be a Map<string, string[]>');
  }

  return {
    sort() {
      // Collect the full node set: every key plus every name mentioned as a dependency.
      // We use a plain object for the visit state rather than a Set so we can store
      // the phase (0 = unvisited, 1 = in progress, 2 = done) which is needed for
      // cycle detection.
      const allNodes = collectAllNodes(deps);
      const state = Object.create(null);
      for (const n of allNodes) state[n] = 0;

      const sorted = [];
      const cycles = [];

      /**
       * DFS visit. Returns true if a cycle was found while visiting this subtree.
       * @param {string} node
       * @param {string[]} path - the stack of ancestors, for cycle reporting.
       */
      function visit(node, path) {
        if (state[node] === 2) return false;
        if (state[node] === 1) {
          // We re-entered a node currently on the stack: that is a cycle.
          // Slice from the first occurrence of `node` in path to capture the loop.
          const start = path.indexOf(node);
          const cycle = path.slice(start).concat(node);
          cycles.push(cycle);
          return true;
        }

        state[node] = 1;
        path.push(node);

        const neighbors = deps.get(node) || [];
        for (const dep of neighbors) {
          visit(dep, path);
        }

        path.pop();
        state[node] = 2;
        sorted.push(node);
        return false;
      }

      // Iterate in Map insertion order for deterministic output across runs with
      // the same input. Node insertion order is the order keys appear in `deps`,
      // followed by any dependency-only nodes in the order first encountered.
      for (const node of allNodes) {
        if (state[node] === 0) {
          visit(node, []);
        }
      }

      const ok = cycles.length === 0;
      return {
        ok,
        sorted: ok ? sorted : [],
        cycles,
      };
    }
  };
}

/**
 * Returns the complete set of node names: every key in the map and every name
 * that appears in any dependency array, in deterministic order (keys first in
 * Map insertion order, then dependency-only names in first-seen order).
 *
 * @param {Map<string, string[]>} deps
 * @returns {string[]}
 */
function collectAllNodes(deps) {
  const seen = Object.create(null);
  const ordered = [];

  // First pass: keys.
  for (const key of deps.keys()) {
    if (!(key in seen)) {
      seen[key] = true;
      ordered.push(key);
    }
  }

  // Second pass: dependency names that are not themselves keys.
  for (const key of deps.keys()) {
    const list = deps.get(key) || [];
    for (const dep of list) {
      if (!(dep in seen)) {
        seen[dep] = true;
        ordered.push(dep);
      }
    }
  }

  return ordered;
}
