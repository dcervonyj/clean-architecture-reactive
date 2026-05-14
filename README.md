# clean-architecture-reactive

A type-safe reactive state management library built on React + MobX, following clean architecture principles. It provides a framework-agnostic abstraction layer for state — separating _what_ your state looks like from _how_ it is observed and updated.

---

## Table of Contents

- [Why this library?](#why-this-library)
- [Install](#install)
- [Core Concepts](#core-concepts)
    - [State](#state)
    - [ReactiveView](#reactiveview)
    - [Selectors](#selectors)
    - [Reactions](#reactions)
    - [Updatable Collections](#updatable-collections)
    - [CollectionsReactiveView](#collectionsreactiveview)
    - [React Integration](#react-integration)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Contributing](#contributing)

---

## Why this library?

Standard MobX usage couples your state logic to MobX-specific primitives (`observable`, `computed`, `reaction`) everywhere in your codebase. This library wraps those primitives behind clean interfaces so that:

- Your domain/use-case code depends only on the **base interfaces** — no MobX imports required.
- The MobX implementation is an interchangeable detail you can swap out.
- Source state (writable) and computed state (derived, read-only) are **type-level distinct** — the TypeScript compiler enforces the boundary.

---

## Install

```bash
npm install clean-architecture-reactive
# peer dependencies
npm install mobx mobx-react react
```

Requires TypeScript 5+ and React 19+.

---

## Core Concepts

### State

`State<Source, Computed>` is the central type. It encodes two separate concerns into one merged object:

| Part       | Description                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `Source`   | The writable, mutable part of your state. You control this directly via `update()` or updatable collections.                  |
| `Computed` | Derived values calculated automatically by selectors. They appear on the same state object but cannot be written to directly. |

```ts
import { State } from 'clean-architecture-reactive';

type Source = {
    firstName: string;
    lastName: string;
    items: string[];
};

type Computed = {
    fullName: string; // derived — will be computed by a Selector
    itemCount: number; // derived — will be computed by a Selector
};

type MyState = State<Source, Computed>;
```

Two utility types let you navigate the boundary:

```ts
import { SourceOf, ComputedOf } from 'clean-architecture-reactive';

type S = SourceOf<MyState>; // → { firstName, lastName, items }
type C = ComputedOf<MyState>; // → { fullName, itemCount }
```

> **Rule:** keys in `Computed` must not overlap with keys in `Source`. The `Without<>` constraint enforces this at compile time.

---

### ReactiveView

`ReactiveView<FullState>` is the central abstraction. It holds the observable state and exposes methods to read and mutate it.

```ts
import { MobXReactiveView } from 'clean-architecture-reactive';

const view = new MobXReactiveView<MyState>({
    firstName: 'Jane',
    lastName: 'Doe',
    items: [],
});

// read
console.log(view.state.firstName); // 'Jane'

// write — deep-partial update of source fields only
view.update({ firstName: 'John' });
console.log(view.state.firstName); // 'John'
```

`update()` does a **deep partial merge** — you only provide the fields you want to change. Nested objects are merged recursively. It does _not_ replace arrays, sets, or maps in place; use [Updatable Collections](#updatable-collections) for those.

---

### Selectors

A `Selector` is a pure function that computes a derived value from the current source state. Selectors are registered on a view and run automatically whenever their dependencies change.

```ts
import { Selector, Selectors } from 'clean-architecture-reactive';

// A Selector for the `fullName` computed field
const fullNameSelector: Selector<MyState, string> = {
    select: (state) => `${state.firstName} ${state.lastName}`,
};

// A Selector for the `itemCount` computed field
const itemCountSelector: Selector<MyState, number> = {
    select: (state) => state.items.length,
};

// `Selectors<MyState>` is a typed map — one entry per Computed key
const selectors: Selectors<MyState> = {
    fullName: fullNameSelector,
    itemCount: itemCountSelector,
};

// Register — from this point on, computed fields are kept in sync automatically
view.register(selectors);

console.log(view.state.fullName); // 'John Doe'
console.log(view.state.itemCount); // 0
```

Selectors receive only the **source** part of the state (`SourceOf<FullState>`), so they cannot accidentally depend on other computed values.

---

### Reactions

A `Reaction` runs a side effect whenever a specific piece of state changes. It is composed of two methods:

| Method                        | Purpose                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| `extractReactionCause(state)` | Extracts the value to watch. The library snapshots it and compares on each tick.        |
| `action(current, previous)`   | Runs whenever the extracted value changes. `previous` is `undefined` on the first call. |

```ts
import { Reaction } from 'clean-architecture-reactive';

const logNameChange: Reaction<MyState, string> = {
    extractReactionCause: (state) => state.firstName,
    action: (current, previous) => {
        console.log(`Name changed from "${previous}" to "${current}"`);
    },
};

view.register(selectors, [logNameChange]);

// later, if you no longer need it:
view.deregisterReactions([logNameChange]);
```

Reactions fire immediately on registration (with `previous = undefined`) and then on every subsequent change.

---

### Updatable Collections

`update()` replaces a collection wholesale when it encounters one. If you need to **mutate** an array, set, or map in place — without losing MobX observability — use `getUpdatableCollection()`.

```ts
// Arrays
const items = view.getUpdatableCollection((state) => state.items);
items.add('apple');
items.add(0, 'banana'); // insert at index 0
items.removeFirst();
items.removeAll(['banana']);
items.removeAllBy((item) => item.startsWith('a'));
items.clear();

// Sets (same API shape)
type SetSource = { tags: Set<string> };
type SetState = State<SetSource, {}>;

const tags = view.getUpdatableCollection((state) => state.tags);
tags.add('typescript');
tags.remove('typescript');

// Maps
type MapSource = { scores: Map<string, number> };
type MapState = State<MapSource, {}>;

const scores = view.getUpdatableCollection((state) => state.scores);
scores.set('alice', 42);
scores.setAll([
    ['bob', 7],
    ['carol', 99],
]);
scores.removeAllBy((key, value) => value < 10);
```

Each call returns a typed `UpdatableArray<V>`, `UpdatableSet<V>`, or `UpdatableMap<K, V>`. All mutation methods are MobX actions.

#### UpdatableArray methods

| Method                   | Description                                       |
| ------------------------ | ------------------------------------------------- |
| `add(value)`             | Appends a value                                   |
| `add(index, value)`      | Inserts at index                                  |
| `addAll(values)`         | Appends multiple values                           |
| `addAll(index, values)`  | Inserts multiple values at index                  |
| `remove(value)`          | Removes first occurrence, returns `true` if found |
| `removeAll(values)`      | Removes all occurrences of provided values        |
| `removeAllBy(predicate)` | Removes all values matching predicate             |
| `removeFirst()`          | Removes and returns first element                 |
| `removeLast()`           | Removes and returns last element                  |
| `removeAt(index)`        | Removes and returns element at index              |
| `set(index, value)`      | Replaces element at index                         |
| `reverse()`              | Reverses in place                                 |
| `clear()`                | Empties the array                                 |

#### UpdatableSet methods

| Method                   | Description                           |
| ------------------------ | ------------------------------------- |
| `add(value)`             | Adds a value                          |
| `addAll(values)`         | Adds multiple values                  |
| `remove(value)`          | Removes a value                       |
| `removeAll(values)`      | Removes multiple values               |
| `removeAllBy(predicate)` | Removes all values matching predicate |
| `clear()`                | Empties the set                       |

#### UpdatableMap methods

| Method                   | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| `set(key, value)`        | Sets a key                                                       |
| `setAll(entries)`        | Sets multiple keys                                               |
| `remove(key)`            | Removes a key                                                    |
| `removeAll(keys)`        | Removes multiple keys                                            |
| `removeAllBy(predicate)` | Removes all entries matching predicate `(key, value) => boolean` |
| `clear()`                | Empties the map                                                  |

---

### CollectionsReactiveView

When your state contains named collections of entities (each with an `id` or similar key), `MobXCollectionReactiveView` provides typed CRUD operations without manual array traversal.

```ts
import { MobXCollectionReactiveView, State } from 'clean-architecture-reactive';

type User = { id: string; name: string; age: number };

type Source = { users: User[]; adminCount: number };
type Computed = { userCount: number };
type AppState = State<Source, Computed>;

const view = new MobXCollectionReactiveView<AppState, { users: User }>({ users: [], adminCount: 0 }, [
    {
        collectionName: 'users', // key used to address this collection
        path: 'users', // lodash-style path into the state
        idKey: 'id', // property used to identify items
    },
]);

// CRUD
view.pushItem('users', { id: '1', name: 'Alice', age: 30 });
view.pushItem('users', { id: '2', name: 'Bob', age: 25 });

view.getItem('users', '1'); // → { id: '1', name: 'Alice', age: 30 }
view.getItem('users', 'missing'); // → null

view.updateItem('users', '1', { age: 31 }); // partial update
view.deleteItem('users', '2');

view.clear('users'); // removes all items
```

The second generic parameter `{ users: User }` is a **collections map** — it tells TypeScript what item type each collection holds, enabling fully typed `getItem`/`pushItem`/`updateItem`/`deleteItem` calls.

---

### React Integration

`MobXReactiveConnector` wires a view into a React component tree via Context.

```tsx
import React from 'react';
import { MobXReactiveConnector, MobXReactiveContext, MobXReactiveContextProps } from 'clean-architecture-reactive';

// 1. Define the context shape
interface AppContext extends MobXReactiveContext<AppState> {
    onRename: (id: string, name: string) => void;
}

// 2. Create the connector — one instance per feature
const connector = new MobXReactiveConnector<AppContext>();

// 3. Build the context from the view + use-case methods
const context: AppContext = {
    view,
    onRename: (id, name) => view.updateItem('users', id, { name }),
};

// 4. Wrap your component tree with the Provider
function App() {
    return (
        <connector.Provider context={context}>
            <UserList />
        </connector.Provider>
    );
}

// 5. Connect leaf components — they receive `state` + any extra context fields
interface UserListProps extends MobXReactiveContextProps<AppContext> {}

function UserListInner({ state, onRename }: UserListProps) {
    return (
        <ul>
            {state.users.map((u) => (
                <li key={u.id} onClick={() => onRename(u.id, 'New Name')}>
                    {u.name}
                </li>
            ))}
        </ul>
    );
}

const UserList = connector.connect(UserListInner);
```

`connect()` wraps the component with `observer()` so it re-renders only when the specific state fields it reads actually change.

> `MobXReactiveContextProps<Context>` is `Context` minus `view`, with `view.state` promoted to a top-level `state` prop. Components never receive the view directly — they work with state and action callbacks.

---

## Quick Start

End-to-end example — a counter with a derived label:

```ts
import { MobXReactiveView, State, Selectors } from 'clean-architecture-reactive';

// 1. Define state shape
type Source = { count: number };
type Computed = { label: string };
type AppState = State<Source, Computed>;

// 2. Create the view with initial source state
const view = new MobXReactiveView<AppState>({ count: 0 });

// 3. Register selectors — computed fields update automatically
const selectors: Selectors<AppState> = {
    label: { select: ({ count }) => `Count is ${count}` },
};
view.register(selectors);

// 4. Read
console.log(view.state.count); // 0
console.log(view.state.label); // 'Count is 0'

// 5. Write
view.update({ count: 1 });
console.log(view.state.label); // 'Count is 1'
```

---

## API Reference

### `State<Source, Computed>`

```ts
type State<
  Source extends object,
  Computed extends object & Without<Computed, Source>
>
```

Merges `Source` and `Computed` into a single type. Keys must not overlap (enforced at compile time).

### `SourceOf<S>` / `ComputedOf<S>`

Utility types that extract the Source or Computed half from a `State` type.

### `MobXReactiveView<FullState>`

```ts
new MobXReactiveView(defaultSourceState: Required<SourceOf<FullState>>)
```

| Member                            | Description                                        |
| --------------------------------- | -------------------------------------------------- |
| `state`                           | The full observable state object                   |
| `update(partial)`                 | Deep-partial merge into source state               |
| `register(selectors, reactions?)` | Register computed selectors and optional reactions |
| `registerReactions(reactions)`    | Register reactions independently                   |
| `deregisterReactions(reactions)`  | Dispose reactions                                  |
| `getUpdatableCollection(cb)`      | Get a mutable wrapper for an array, set, or map    |

### `MobXCollectionReactiveView<FullState, CollectionsList>`

```ts
new MobXCollectionReactiveView(
  defaultSourceState,
  collections: Array<{ collectionName, path, idKey }>
)
```

Extends `MobXReactiveView` with CRUD operations: `getItem`, `pushItem`, `updateItem`, `deleteItem`, `clear`.

### `MobXReactiveConnector<Context>`

```ts
new MobXReactiveConnector<Context>();
```

| Member               | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `Provider`           | React component — wraps a subtree with the context   |
| `connect(Component)` | HOC — injects state + context props into a component |

---

## Contributing

```bash
yarn install
yarn unit:test     # run tests
yarn lint          # ESLint check
yarn build         # compile to lib/
```

Publishing to npm is triggered automatically by pushing a `v*.*.*` git tag. A `release.yml` workflow handles it; set the `NPM_TOKEN` secret in your repository settings first.
