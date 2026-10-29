# topological-sort-utils

Orders a dependency graph topologically and reports any cycles by the names of the nodes involved.

```js
import { topologicalSort } from 'topological-sort-utils';

const deps = new Map([
  ['app', ['router', 'store']],
  ['router', ['routes']],
  ['store', ['state']],
  ['routes', []],
  ['state', []],
]);

const { ok, sorted, cycles } = topologicalSort(deps);
// ok === true
// sorted === ['routes', 'state', 'router', 'store', 'app']
```

If the graph contains a cycle, `ok` is `false`, `sorted` is empty, and `cycles` is an array of arrays — each inner array is the list of node names that form the loop, with the closing node repeated at the end.

## Why this exists

Most topological sort implementations either silently skip cycles or throw a generic error. When you are building a task runner or a module loader, the first thing you want to know on failure is *which* nodes form the loop, by name. This library returns every cycle it finds in a single pass so you can surface them all at once instead of fixing them one at a time.

The trade-off: the API takes a `Map<string, string[]>` and returns plain arrays. There is no graph builder object or node abstraction. If your nodes carry payload data, keep a separate lookup map keyed by the same string. This keeps the sort itself allocation-light and the API trivial to learn.

## Edge cases

A node that appears as a dependency but has no key of its own in the map is treated as a leaf node with no dependencies. This means `{ a: ['b'] }` (with no `b` entry) is valid and `b` sorts before `a`. If you prefer strict validation, check that every dependency has its own key before calling `topologicalSort`.

`createTopologicalSorter` captures the map by reference. If you mutate the map after creating the sorter, the next call to `sort()` reflects the mutation. This is intentional but easy to overlook.
