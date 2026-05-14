# CLAUDE.md — AI Agent Guide

This file is the source of truth for any AI agent working on this repository. Read it fully before making changes.

---

## What This Repo Is

`clean-architecture-reactive` is a **TypeScript library** that provides a reactive state management abstraction layer for React + MobX applications. It is published to npm as `clean-architecture-reactive`.

The library has two layers:

1. **`src/base/`** — Pure TypeScript interfaces. Zero dependencies on MobX or React. This is the "port" layer in clean architecture terms.
2. **`src/react-mobx/`** — Concrete MobX + React implementations of those interfaces.

**Dependency rule (strict):** `src/base/` must never import from `src/react-mobx/`. The arrow always points inward: `react-mobx → base`.

---

## Commands

```bash
yarn install          # Install dependencies
yarn unit:test        # Run all tests with Vitest
yarn lint             # ESLint check
yarn lint:fix         # ESLint auto-fix
yarn build            # Compile to lib/ using tsc
```

Single test file: `npx vitest run path/to/test.ts`

CI runs on every push to `main`. Publishing to npm is triggered by a `v*.*.*` git tag (see `.github/workflows/release.yml`).

---

## Architecture Deep-Dive

### The State Type System

The core of the library is the `State<Source, Computed>` generic type in `src/base/State.ts`.

```ts
const sourceType = Symbol('Fake field to save source type');
const computedType = Symbol('Fake field to save computed type');

type State<Source, Computed> = Source &
    Computed & {
        [sourceType]?: Source;
        [computedType]?: Computed;
    };
```

The symbols are **phantom type carriers** — they never hold runtime values but allow TypeScript to recover the original `Source` and `Computed` type parameters later via:

```ts
type SourceOf<S> = Required<S>[typeof sourceType];
type ComputedOf<S> = Required<S>[typeof computedType];
```

**Why this matters:** once you merge `Source & Computed` into a single object, you lose the ability to distinguish which keys are mutable vs derived. The symbols preserve that information so the rest of the API can enforce the boundary statically. `SourceOf<MyState>` gives you the writable half; `ComputedOf<MyState>` gives you the derived half.

**The `Without<>` constraint** on the `Computed` type parameter prevents keys from overlapping between `Source` and `Computed`. The TypeScript compiler will reject a `State<S, C>` where `C` has the same key as `S` at the same nesting level.

### ReactiveView

`ReactiveView<FullState>` (`src/base/ReactiveView.ts`) is the central abstraction. It owns the observable state and exposes:

- `state` — the merged observable state object
- `update(partial)` — deep-partial merge into the **source** fields only
- `register(selectors, reactions?)` — sets up computed values and side-effect listeners
- `getUpdatableCollection(cb)` — returns a typed wrapper for in-place collection mutation

`MobXReactiveView` (`src/react-mobx/MobXReactiveView.ts`) implements this using:

- `observable(defaultSourceState)` to make the state observable
- `makeObservable(this, { update: action })` to mark mutation methods
- `autorun()` for selectors — they re-run whenever accessed observables change
- `reaction()` for reactions — they fire on change after a snapshot comparison

### Selectors

A `Selector<FullState, ComputedValue>` has a single `select(sourceState)` method. Selectors receive `SourceOf<FullState>` — NOT the full state — to prevent circular computation.

`Selectors<FullState>` is a mapped type that requires one selector per key in `ComputedOf<FullState>`. This is enforced at compile time; you cannot register selectors for a subset of computed fields.

The `MobXReactiveView.registerSelectors()` implementation wraps each selector in an `autorun()`. When the autorun fires, it calls `mergeState()` to write the computed result back into the observable state. The `prevComputed` variable tracks the previous value so `mergeState` can correctly delete keys that disappear between renders.

### Reactions

`Reaction<FullState, T>` models a side effect:

- `extractReactionCause(state)` — extracts the value to watch (T)
- `action(current, previous)` — fires on change; `previous` is `undefined` on first call

The implementation uses MobX `reaction()` with `{ fireImmediately: true }` and deep-clones the extracted value to avoid false negatives when the value is a mutable object.

### mergeState

`mergeState(target, source, prevSource)` in `src/react-mobx/mergeState.ts` is the engine behind `update()` and selector integration. It recursively merges `source` into `target`:

- Keys present in `prevSource` but absent from `source` are **deleted** from `target` (computed values that are no longer produced get cleaned up)
- Functions are wrapped with `computedFn` from `mobx-utils` (memoized computed functions)
- MobX observable collections (arrays, maps, sets) are replaced rather than recursively merged, preserving MobX's internal tracking
- Plain objects are merged recursively
- Primitives are set directly if changed

### UpdatableCollections

`MobXUpdatableArray`, `MobXUpdatableMap`, and `MobXUpdatableSet` each wrap a getter `() => collection` (not the collection itself). This is intentional: the getter is always called fresh to ensure we operate on the current observable reference. All mutation methods use `makeObservable(this, { method: action })`.

The custom `reverse()` implementation in `MobXUpdatableArray` avoids `Array.prototype.reverse()` due to a MobX bug where calling it directly on an observable array does not trigger reactivity.

### CollectionsReactiveView

`MobXCollectionReactiveView` extends `MobXReactiveView` and adds CRUD for named entity collections. It stores a list of `CollectionSettings`:

```ts
type CollectionSettings = {
    collectionName: string; // how you address the collection in CRUD calls
    path: string; // lodash-style path into state (e.g. 'users' or 'nested.items')
    idKey: string; // property name used as the entity's ID (e.g. 'id', 'uuid')
};
```

`getItem`/`deleteItem`/`updateItem` all use `Array.find()` on the observable array accessed via lodash `get(state, path)`.

### React Integration

`MobXReactiveConnector<Context>` provides:

- `Provider` — a `memo`-wrapped React component that calls `autoBindContext()` to bind all class methods in the context, then renders a React Context Provider
- `connect(Component)` — returns a new component wrapped in `observer()` that reads from the React Context and maps `view.state` to a `state` prop

`MobXReactiveContextProps<Context>` is the prop shape that connected components receive: `Context` minus `view`, with `view.state` promoted to `state`. Components never touch the view directly.

---

## File Map

```
src/
├── index.ts                              Re-exports everything
├── base/
│   ├── State.ts                          State<S,C>, SourceOf<>, ComputedOf<>
│   ├── ReactiveView.ts                   Core interface (update, register, getUpdatableCollection)
│   ├── CollectionsReactiveView.ts        CRUD interface extending ReactiveView
│   ├── Selector.ts                       Selector<FullState, ComputedValue> interface
│   ├── Selectors.ts                      Selectors<FullState> mapped type
│   ├── Reaction.ts                       Reaction<FullState, T> interface
│   ├── UpdatableArray.ts                 UpdatableArray<V> interface
│   ├── UpdatableMap.ts                   UpdatableMap<K,V> interface
│   ├── UpdatableSet.ts                   UpdatableSet<V> interface
│   └── index.ts                          Re-exports base layer
└── react-mobx/
    ├── MobXReactiveView.ts               Implements ReactiveView with MobX observables
    ├── MobXCollectionReactiveView.ts     Implements CollectionsReactiveView
    ├── MobXUpdatableArray.ts             Implements UpdatableArray with makeObservable actions
    ├── MobXUpdatableMap.ts               Implements UpdatableMap with makeObservable actions
    ├── MobXUpdatableSet.ts               Implements UpdatableSet with makeObservable actions
    ├── mergeState.ts                     Deep-partial merge engine used by update() and selectors
    ├── MobXReactiveConnector.tsx         Provider + connect HOC for React integration
    ├── MobXReactiveContext.ts            MobXReactiveContext<FullState> interface
    ├── MobXReactiveContextProps.ts       Utility type for connected component props
    ├── MobXReactiveConnect.ts            Type alias for the connect HOC signature
    └── index.ts                          Re-exports react-mobx layer

test/
└── react-mobx/
    ├── MobXUpdatableArray.test.ts
    ├── MobXUpdatableMap.test.ts
    ├── MobXUpdatableSet.test.ts
    ├── MobXCollectionReactiveView.test.ts
    └── mergeState.test.ts
```

---

## Testing Approach

- **Vitest** is the test runner, configured in `vitest.config.ts`
- The `@reactive/*` path alias is resolved via `resolve.alias` in the Vitest config (not a plugin)
- Tests use plain manual test data — no mocking frameworks required for this library
- Tests for `MobXUpdatable*` verify that methods are MobX actions via `isAction(instance.method) === true`
- Tests for `mergeState` are the most comprehensive — 40+ cases covering edge cases in the merge logic

When adding a new source class with mutation methods, always add `makeObservable(this, { methodName: action })` in the constructor and add `isAction` assertions in the corresponding test file.

---

## What NOT to Do

- **Never import `src/react-mobx/*` from `src/base/*`** — this would violate the dependency rule
- **Never use `@action` decorator syntax** — the library uses `makeObservable()` instead, which works with any modern bundler/transformer without special TypeScript flags
- **Never call `Array.prototype.reverse()` directly on an observable array** — use the custom `reverse()` method in `MobXUpdatableArray` which works around a MobX reactivity bug
- **Never add `experimentalDecorators: true` to `tsconfig.json`** — it is intentionally absent because `makeObservable` is used instead of decorators
- **Never import the full `lodash`** — the project uses `lodash-es` for tree-shaking; always import from `lodash-es`
- **Never bypass MobX actions for mutations** — all state mutations must happen inside a MobX action; use `makeObservable` or `runInAction`

---

## Adding a New Feature — Checklist

1. Define the interface in `src/base/` if it is framework-agnostic
2. Implement it in `src/react-mobx/` referencing the interface
3. Export from the appropriate `index.ts` files
4. Add tests in `test/react-mobx/`
5. Run `yarn unit:test && yarn lint && yarn build` — all must pass before opening a PR
