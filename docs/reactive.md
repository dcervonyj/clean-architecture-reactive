# Reactive state — `ReactiveView`, `State`, selectors, reactions

> **Prerequisites:** [README.md](./README.md) for the layer model and naming
> convention. The reactive primitives described here come from
> [`clean-architecture-reactive`](https://github.com/dcervonyj/clean-architecture-reactive)
> — load that repo's README for the canonical type signatures.

This file covers how a feature owns and shapes its reactive state. The
patterns work with any reactive backend; the reference implementation ships
with MobX (`MobXReactiveView`), but the `ReactiveView` interface is
backend-agnostic — drop in your own implementation against signals, observables,
or any other reactive primitive.

---

## The library surface

What you import:

```ts
import {
    ReactiveView,
    State,
    SourceOf,
    ComputedOf,
    Selector,
    Reaction,
    UpdatableArray,
    UpdatableMap,
    UpdatableSet,
} from 'clean-architecture-reactive';

import {
    MobXReactiveView,
} from 'clean-architecture-reactive/mobx';
```

Mental model:

| Primitive | What it is |
|---|---|
| `State<Source, Computed>` | Symbolic union of the two halves of state. `SourceOf<S>` and `ComputedOf<S>` extract each half. |
| `ReactiveView<FullState>` | Interface — owns the state, exposes `state`, `update(partialSource)`, and `register(selectors, reactions?)`. |
| `MobXReactiveView<FullState>` | MobX-backed concrete implementation. The state object is wrapped in an `observable()`; `update()` is `@action`-bound. |
| `Selector<FullState, TResult>` | Pure function `select(state) => TResult`. Registered selectors auto-populate slices of computed state. |
| `Reaction<FullState, T>` | Pair of `extractReactionCause(state)` + `action(curr, prev)`. Triggered whenever the cause value changes. |
| `UpdatableArray<V>` / `UpdatableMap<K, V>` / `UpdatableSet<V>` | Type-safe wrappers for in-place mutation of collections inside source state, so the reactive backend still fires correctly without replacing the whole collection. |

Refer to the [GitHub repo](https://github.com/dcervonyj/clean-architecture-reactive) for full type signatures, version notes, and the React `MobXReactiveConnector` helper (which this guide describes inline in [ui.md](./ui.md) so the connector pattern is reproducible without depending on the lib's React export).

---

## SourceState vs. ComputedState

The split is the load-bearing idea of this whole approach:

- **SourceState** — the mutable side. Use cases call `view.update({...})` to change it.
- **ComputedState** — derived from SourceState by selectors. Never assigned directly. Recomputes automatically whenever any source slice it reads changes.

This means: **every domain value either lives in source state or is computed from it.** There is no third option. No `useState`, no `useMemo`, no transient component-local state.

### Example

```ts
// application/state/TasksSourceState.ts
import { TaskFilter } from '@app/tasks/application/models/TaskFilter';
import { Task } from '@app/tasks/application/models/Task';

export interface TasksSourceState {
    workspaceId: string | null;
    tasks: Task[];
    filter: TaskFilter;
    isLoading: boolean;
}

export const defaultTasksSourceState: TasksSourceState = {
    workspaceId: null,
    tasks: [],
    filter: 'all',
    isLoading: false,
};
```

```ts
// application/state/TasksComputedState.ts
import { Task } from '@app/tasks/application/models/Task';

export interface TasksComputedState {
    visibleTasks: Task[];
    activeCount: number;
    completedCount: number;
    isEmpty: boolean;
}
```

```ts
// application/state/TasksState.ts
import { State } from 'clean-architecture-reactive';

import { TasksComputedState } from '@app/tasks/application/state/TasksComputedState';
import { TasksSourceState } from '@app/tasks/application/state/TasksSourceState';

export type TasksState = State<TasksSourceState, TasksComputedState>;
```

### Class-based ComputedState

If a feature needs computed state that owns methods (e.g., a paged view with
its own cursor logic), put a `*ComputedState.ts` **class** with `@observable`
fields in `application/state/`, and register an instance as a source slot.
Its members are then read as computed values.

---

## Selectors

A `Selector<FullState, TResult>` is a pure function from state to a derived value:

```ts
// application/selectors/ActiveTaskCountSelector.ts
import { Selector } from 'clean-architecture-reactive';

import { TasksState } from '@app/tasks/application/state/TasksState';

export class ActiveTaskCountSelector implements Selector<TasksState, number> {
    select(state: TasksState): number {
        return state.tasks.filter((t) => t.status.type !== 'done').length;
    }
}
```

```ts
// application/selectors/VisibleTasksSelector.ts
import { Selector } from 'clean-architecture-reactive';

import { Task } from '@app/tasks/application/models/Task';
import { TasksState } from '@app/tasks/application/state/TasksState';

export class VisibleTasksSelector implements Selector<TasksState, Task[]> {
    select(state: TasksState): Task[] {
        if (state.filter === 'all') {
            return state.tasks;
        }
        if (state.filter === 'active') {
            return state.tasks.filter((t) => t.status.type !== 'done');
        }

        return state.tasks.filter((t) => t.status.type === 'done');
    }
}
```

Selectors are **pure**: no I/O, no `Date.now()`, no `Math.random()`. Same input → same output every time. This makes them trivially testable and lets the reactive backend memoise them.

### Registering selectors

Register every selector on the view at composition time. The key on the
right-hand side of `register(...)` becomes a key on the computed state:

```ts
view.register({
    visibleTasks: new VisibleTasksSelector(),
    activeCount: new ActiveTaskCountSelector(),
    completedCount: new CompletedTaskCountSelector(),
    isEmpty: new IsEmptySelector(),
});
```

After this, components can read `view.state.activeCount` (etc.) directly. The
type system sees it because of how `State<Source, Computed>` is shaped.

---

## Reactions

A `Reaction<FullState, T>` fires a side effect when a *cause* value changes.

The contract:
- `extractReactionCause(state)` — returns the value the reaction cares about. Triggers on change.
- `action(current, previous)` — runs the side effect.

```ts
// application/reactions/WorkspaceChangedReaction.ts
import { Reaction } from 'clean-architecture-reactive';

import { TasksState } from '@app/tasks/application/state/TasksState';
import { GetTasksUseCase } from '@app/tasks/application/use-cases/GetTasksUseCase';

export class WorkspaceChangedReaction implements Reaction<TasksState, string | null> {
    constructor(private readonly getTasks: GetTasksUseCase) {}

    extractReactionCause(state: TasksState): string | null {
        return state.workspaceId;
    }

    action(current: string | null, previous: string | null | undefined): void {
        if (current === null || current === previous) {
            return;
        }
        void this.getTasks.execute(current);
    }
}
```

### Registering reactions

`register(...)` takes a second argument:

```ts
view.register(
    {
        visibleTasks: new VisibleTasksSelector(),
        activeCount: new ActiveTaskCountSelector(),
    },
    [
        new WorkspaceChangedReaction(getTasksUseCase),
    ],
);
```

### Discipline

A reaction is the **only** place imperative side effects fire automatically from state changes. Components must not subscribe to state and trigger work in `useEffect` — model the dependency as a reaction instead. This keeps side-effect orchestration in one place (the composition root) rather than scattered across the UI tree.

Use reactions sparingly. Many features need none — just use cases dispatched from components. Reach for reactions when:
- You need to re-fetch when a parameter changes (workspace, filter, time range).
- You need to publish an event whenever a derived value crosses a threshold.
- You need to persist a slice of state to local storage on change.

---

## Updatable collections

When source state holds a large `Array`/`Map`/`Set`, replacing it whole on every
mutation is wasteful and breaks the identity-based reactivity some
implementations rely on. The library provides typed wrappers:

```ts
const tasksList: UpdatableArray<Task> = view.getUpdatableArray((state) => state.tasks);

tasksList.add(newTask);            // push
tasksList.remove(taskToRemove);    // splice
tasksList.clear();                 // empty
```

Use cases that mutate collection elements (insert, remove, reorder) should use
`UpdatableArray` / `UpdatableMap` / `UpdatableSet` rather than constructing a
new array and passing it to `view.update({...})`. The view still notifies
subscribers correctly, and the operation is O(1) instead of O(n).

For wholesale replacements (e.g., loaded a new page of items), prefer the
plain `view.update({ tasks: newTasks })`.

---

## Putting it together — what the DI factory does

A feature's composition root wires the view, registers selectors and reactions, and constructs use cases. The skeleton:

```ts
// config/TasksContext.ts
import { MobXReactiveView } from 'clean-architecture-reactive/mobx';

export function createTasksContext(cfg: TasksContextConfig): TasksContext {
    // 1. The reactive view
    const view = new MobXReactiveView<TasksState>(defaultTasksSourceState);

    // 2. Repositories (constructor-inject the HTTP client / other deps)
    const tasksRepository = new HttpTasksRepository(cfg.httpClient, new TaskMapper());

    // 3. Use cases (constructor-inject the view + ports)
    const getTasksUseCase = new GetTasksUseCase(view, tasksRepository);
    const openTasksUseCase = new OpenTasksUseCase(getTasksUseCase, view);

    // 4. Register selectors + reactions on the view
    view.register(
        {
            visibleTasks: new VisibleTasksSelector(),
            activeCount: new ActiveTaskCountSelector(),
            completedCount: new CompletedTaskCountSelector(),
            isEmpty: new IsEmptySelector(),
        },
        [
            new WorkspaceChangedReaction(getTasksUseCase),
        ],
    );

    // 5. Return the public surface
    return { view, openTasksUseCase };
}
```

See [bootstrap.md Step 7](./bootstrap.md#step-7--composition-root) for the
full scaffold with imports.

---

## How UI consumes reactive state

The UI layer never touches `view.update(...)` directly — that's reserved for
use cases. UI components read from `view.state` and dispatch actions through
use cases:

```tsx
function TasksContentView({ view, completeTaskUseCase }: PropsTasksContent) {
    if (view.state.isLoading) {
        return <div>Loading…</div>;
    }
    return (
        <ul>
            {view.state.visibleTasks.map((task) => (
                <li key={task.id}>
                    {task.title}
                    <button onClick={() => completeTaskUseCase.execute(task.id)}>
                        Done
                    </button>
                </li>
            ))}
        </ul>
    );
}
```

For the component to actually re-render when `view.state` changes, it needs to be subscribed via the connector. See [ui.md §16.1](./ui.md#161-the-connector).

---

## Reference

The reactive primitives library:
**[github.com/dcervonyj/clean-architecture-reactive](https://github.com/dcervonyj/clean-architecture-reactive)**

The repo contains:
- The `base/` interfaces (`ReactiveView`, `State`, `Selector`, `Reaction`, etc.) — framework-agnostic.
- The `mobx/` (or `react-mobx/`) implementation (`MobXReactiveView`, `MobXReactiveConnector`).
- Full type signatures with examples for each primitive.
- Version compatibility notes.

This guide describes how to *use* those primitives to structure a feature. For library internals or advanced types (`SourceOf`, `ComputedOf`, deep partial updates), consult the repo directly.
