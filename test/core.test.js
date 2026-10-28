import { test } from 'node:test';
import assert from 'node:assert/strict';
import { topologicalSort, createTopologicalSorter } from '../src/index.js';

/**
 * Helper: build a Map from a plain object for terser test setup.
 * @param {Record<string, string[]>} obj
 * @returns {Map<string, string[]>}
 */
function mapFrom(obj) {
  return new Map(Object.entries(obj));
}

test('sorts a simple linear chain', () => {
  const deps = mapFrom({ c: ['b'], b: ['a'], a: [] });
  const result = topologicalSort(deps);
  assert.equal(result.ok, true);
  assert.deepEqual(result.cycles, []);
  // a must come before b, b before c.
  assert.ok(result.sorted.indexOf('a') < result.sorted.indexOf('b'));
  assert.ok(result.sorted.indexOf('b') < result.sorted.indexOf('c'));
});

test('sorts a diamond dependency', () => {
  // d depends on b and c; b and c both depend on a.
  const deps = mapFrom({ d: ['b', 'c'], b: ['a'], c: ['a'], a: [] });
  const result = topologicalSort(deps);
  assert.equal(result.ok, true);
  assert.deepEqual(result.cycles, []);
  assert.ok(result.sorted.indexOf('a') < result.sorted.indexOf('b'));
  assert.ok(result.sorted.indexOf('a') < result.sorted.indexOf('c'));
  assert.ok(result.sorted.indexOf('b') < result.sorted.indexOf('d'));
  assert.ok(result.sorted.indexOf('c') < result.sorted.indexOf('d'));
});

test('detects a simple two-node cycle and reports node names', () => {
  const deps = mapFrom({ a: ['b'], b: ['a'] });
  const result = topologicalSort(deps);
  assert.equal(result.ok, false);
  assert.deepEqual(result.sorted, []);
  assert.equal(result.cycles.length, 1);
  // The cycle must contain both a and b.
  const cycle = result.cycles[0];
  assert.ok(cycle.includes('a'));
  assert.ok(cycle.includes('b'));
  // The closing node appears at both ends.
  assert.equal(cycle[0], cycle[cycle.length - 1]);
});

test('detects a three-node cycle', () => {
  const deps = mapFrom({ a: ['c'], c: ['b'], b: ['a'] });
  const result = topologicalSort(deps);
  assert.equal(result.ok, false);
  assert.deepEqual(result.sorted, []);
  assert.equal(result.cycles.length, 1);
  const cycle = result.cycles[0];
  assert.equal(cycle.length, 4); // three nodes plus the repeated closer
  assert.equal(cycle[0], cycle[cycle.length - 1]);
});

test('reports a self-loop as a cycle', () => {
  const deps = mapFrom({ a: ['a'] });
  const result = topologicalSort(deps);
  assert.equal(result.ok, false);
  assert.deepEqual(result.sorted, []);
  assert.equal(result.cycles.length, 1);
  assert.deepEqual(result.cycles[0], ['a', 'a']);
});

test('allows dependency-only nodes (key absent from map)', () => {
  // b is referenced as a dependency but has no entry of its own.
  const deps = mapFrom({ a: ['b'] });
  const result = topologicalSort(deps);
  assert.equal(result.ok, true);
  assert.deepEqual(result.cycles, []);
  assert.ok(result.sorted.includes('b'));
  assert.ok(result.sorted.indexOf('b') < result.sorted.indexOf('a'));
});

test('handles an empty graph', () => {
  const result = topologicalSort(new Map());
  assert.equal(result.ok, true);
  assert.deepEqual(result.sorted, []);
  assert.deepEqual(result.cycles, []);
});

test('handles a node with no dependencies', () => {
  const deps = mapFrom({ x: [] });
  const result = topologicalSort(deps);
  assert.equal(result.ok, true);
  assert.deepEqual(result.sorted, ['x']);
  assert.deepEqual(result.cycles, []);
});

test('createTopologicalSorter returns an object with sort()', () => {
  const sorter = createTopologicalSorter(mapFrom({ b: ['a'], a: [] }));
  assert.equal(typeof sorter.sort, 'function');
  const result = sorter.sort();
  assert.equal(result.ok, true);
  assert.ok(result.sorted.indexOf('a') < result.sorted.indexOf('b'));
});

test('throws TypeError when deps is not a Map', () => {
  assert.throws(
    () => topologicalSort({ a: [] }),
    { name: 'TypeError' }
  );
});

test('does not mutate the input map', () => {
  const deps = mapFrom({ b: ['a'], a: [] });
  const snapshot = new Map(deps);
  topologicalSort(deps);
  assert.deepEqual(Array.from(deps.entries()), Array.from(snapshot.entries()));
});

test('deterministic order for the same input', () => {
  const deps = mapFrom({ c: ['a'], b: ['a'], a: [] });
  const r1 = topologicalSort(deps);
  const r2 = topologicalSort(new Map(deps));
  assert.deepEqual(r1.sorted, r2.sorted);
});
