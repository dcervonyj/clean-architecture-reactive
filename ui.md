# UI layer — provider, connector, components (React)

> **Prerequisites:** [README.md](./README.md) for the layer model.
> [reactive.md](./reactive.md) for how reactive state is shaped.
> [application.md](./application.md) for use cases and the rule that
> components only dispatch through `useCase.execute(...)`.

This file commits to **React**. The layers below it (`application/`, `api/`,
`repository/`, `presentation/`) stay framework-agnostic. The UI layer is
where you choose your view library.

It covers:

- **§15** Feature Provider — the component that owns the feature's composition root.
- **§16.1** Connector — a tiny self-contained utility (~30 lines) pairing `Provider` + `connect()`.
- **§16.2** Components — pure-rendering, observer-wrapped via the connector.
- **§Wiring subscribers** — how cross-feature event-bus subscriptions activate at runtime.

The MobX-React example below is the most common stack, but the pattern works
with any reactive library that exposes a `state` getter on `ReactiveView`.

---

## 15. Feature Provider

Every feature has a `<Feature>.tsx` file in `config/` that:

1. Calls the composition root function (`createTasksContext(cfg)`) to build the context.
2. Hooks lifecycle (mount/unmount) by dispatching `Open*` / `Close*` use cases.
3. Wires cross-feature subscribers (more below).
4. Wraps children in `<Provider value={context}>` from the feature's connector.

```tsx
// config/Tasks.tsx
import React, { useEffect, useMemo } from 'react';
import { observer } from 'mobx-react';

import { createTasksContext } from '@app/tasks/config/TasksContext';
import { PropsTasks } from '@app/tasks/config/types';
import { TasksContent } from '@app/tasks/ui/content/TasksContent';
import { Provider } from '@app/tasks/ui/connect/connector';

export const Tasks: React.FC<PropsTasks> = observer(({ workspaceId, httpClient }) => {
    const context = useMemo(
        () => createTasksContext({ workspaceId, httpClient }),
        // Re-create context on workspaceId change so each workspace is isolated.
        [workspaceId, httpClient],
    );

    useEffect(() => {
        context.openTasksUseCase.execute(workspaceId);
        return () => context.closeTasksUseCase.execute();
    }, [context, workspaceId]);

    return (
        <Provider value={context}>
            <TasksContent />
        </Provider>
    );
});
```

### Rules

- **`observer()` is fine here.** The Provider component itself depends on context identity. Inner components are wrapped by `connect(...)` (next section) — don't manually wrap them.
- **`useMemo` keyed on inputs.** The composition root re-runs only when the inputs that scope this feature change (e.g., `workspaceId`).
- **Lifecycle dispatches use cases.** Mount → `OpenTasksUseCase.execute()`. Unmount → `CloseTasksUseCase.execute()`. Avoid putting domain logic inline in `useEffect`.

---

## 16.1 The connector

The connector is a tiny utility that pairs a React `Provider` with a `connect(Component, selectContext)` HOC. The HOC wraps the component in MobX's `observer()` so state reads inside it are reactive.

You can use a library implementation if you prefer, but the contract is small
enough to inline. Here's a self-contained ~30-line version any project can
drop in as-is:

```ts
// shared/Connector.ts
import { createContext, useContext, type ComponentType, type ReactNode } from 'react';
import { observer } from 'mobx-react';

export class Connector<TContext> {
    private readonly reactContext = createContext<TContext | null>(null);

    Provider = ({ value, children }: { value: TContext; children: ReactNode }) => {
        const Ctx = this.reactContext;
        return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
    };

    connect = <P extends object, S extends object>(
        Component: ComponentType<P & S>,
        select: (ctx: TContext) => S,
    ): ComponentType<P> => {
        const Observed = observer(Component);
        return (props: P) => {
            const ctx = useContext(this.reactContext);
            if (ctx === null) {
                throw new Error(`Connector: provider missing for ${Component.displayName ?? Component.name}`);
            }
            return <Observed {...props} {...select(ctx)} />;
        };
    };
}
```

The feature's connector file is then trivial:

```ts
// ui/connect/connector.ts
import { Connector } from '@app/shared/Connector';

import { TasksContext } from '@app/tasks/ui/connect/TasksContext';

const connector = new Connector<TasksContext>();

export const Provider = connector.Provider;
export const connect = connector.connect;
```

And the context type matches whatever the composition root returns:

```ts
// ui/connect/TasksContext.ts
import { ReactiveView } from 'clean-architecture-reactive';

import { TasksState } from '@app/tasks/application/state/TasksState';
import { GetTasksUseCase } from '@app/tasks/application/use-cases/GetTasksUseCase';
import { CompleteTaskUseCase } from '@app/tasks/application/use-cases/CompleteTaskUseCase';
import { OpenTasksUseCase } from '@app/tasks/application/use-cases/OpenTasksUseCase';
import { CloseTasksUseCase } from '@app/tasks/application/use-cases/CloseTasksUseCase';
import { DueDatePresenter } from '@app/tasks/application/ports/DueDatePresenter';

export interface TasksContext {
    view: ReactiveView<TasksState>;
    getTasksUseCase: GetTasksUseCase;
    completeTaskUseCase: CompleteTaskUseCase;
    openTasksUseCase: OpenTasksUseCase;
    closeTasksUseCase: CloseTasksUseCase;
    dueDatePresenter: DueDatePresenter;
}
```

Whatever the composition root's return type is, the connector's context type **must match it exactly**. Keep them in sync (or share a single type).

---

## 16.2 Components

Components contain **no logic** — only rendering and prop-passing. They receive state and use cases as props from `connect(...)`.

```tsx
// ui/content/TasksContent.tsx
import { connect } from '@app/tasks/ui/connect/connector';

interface PropsTasksContent {
    view: import('clean-architecture-reactive').ReactiveView<
        import('@app/tasks/application/state/TasksState').TasksState
    >;
    completeTaskUseCase: import('@app/tasks/application/use-cases/CompleteTaskUseCase').CompleteTaskUseCase;
    dueDatePresenter: import('@app/tasks/application/ports/DueDatePresenter').DueDatePresenter;
}

function TasksContentView({ view, completeTaskUseCase, dueDatePresenter }: PropsTasksContent) {
    if (view.state.isLoading) {
        return <div>Loading…</div>;
    }
    if (view.state.isEmpty) {
        return <div>No tasks yet.</div>;
    }

    return (
        <ul>
            {view.state.visibleTasks.map((task) => (
                <li key={task.id}>
                    <span>{task.title}</span>
                    <small>{dueDatePresenter.format(task.dueDate)}</small>
                    <button onClick={() => completeTaskUseCase.execute(task.id)}>
                        Mark done
                    </button>
                </li>
            ))}
        </ul>
    );
}

export const TasksContent = connect(TasksContentView, (ctx) => ({
    view: ctx.view,
    completeTaskUseCase: ctx.completeTaskUseCase,
    dueDatePresenter: ctx.dueDatePresenter,
}));
```

### Anti-patterns to avoid

- **Don't `useState` for domain state.** Domain state lives in the reactive view. If a component thinks it needs `useState`, the data probably belongs in source state.
- **Don't call repositories from components.** Always go through a use case.
- **Don't `new` use cases in components.** Always receive them via context.
- **Don't manually wrap inner components in `observer()`.** `connect()` already does it.
- **Don't pass the whole context to a component.** Use the `select` argument of `connect()` to pull out only what the component reads.
- **Don't put `useEffect` work that mutates domain state.** Use a reaction instead (see [reactive.md §Reactions](./reactive.md#reactions)).

### When local state IS okay

A component may use `useState` for **purely-UI ephemeral state** that doesn't survive remount and doesn't matter to other components: hover state, an open/closed disclosure, a transient animation phase. If multiple components need to see it, lift it to the view.

---

## Wiring subscribers

Cross-feature subscribers (implementations of `*Subscriber` ports from [application.md](./application.md#event-bus--publisher--subscriber-ports)) need to be registered to whichever channel the publisher writes to. That registration is a one-liner in the Provider:

```tsx
// config/Tasks.tsx — with a subscriber
useEffect(() => {
    const handle = appEventBus.subscribe(context.taskCompletedSubscriber);
    return () => handle.unsubscribe();
}, [context.taskCompletedSubscriber]);
```

The `appEventBus` is whatever cross-feature bus your application uses — a singleton instance of an `EventTarget`, an RxJS subject, a custom typed channel.

### Bus contract — a tiny interface

To keep the application layer agnostic, define the bus contract once and inject the concrete bus through DI (or import it as a module singleton if you prefer):

```ts
// shared/EventBus.ts
export interface EventBus {
    publish<TEvent extends { type: string }>(event: TEvent): void;
    subscribe<TEvent extends { type: string }>(
        type: TEvent['type'],
        subscriber: { onEvent(event: TEvent): void },
    ): { unsubscribe(): void };
}
```

The `*Publisher` and `*Subscriber` ports defined in `application/ports/` are
**thin wrappers** over this bus. Use cases depend on the wrappers, not on the
bus directly — so swapping the bus implementation never touches use cases.

---

## React-specific best practices

- **Memoise list items** with stable keys (`task.id`, not array index).
- **Keep render trees shallow.** A 1000-row table doesn't need to re-render the whole list when one row's status flips — let MobX's fine-grained tracking handle it. Just put `connect(...)` on the row component, not on a parent that re-maps the whole list.
- **Hoist event handlers.** A handler that depends on `useCase.execute(id)` for a specific id should be created inline (it's cheap). A handler that doesn't depend on the iteration variable should be defined outside the render path.
- **Skip `React.memo` unless profiled.** With `connect(...)` wrapping in `observer()`, MobX already tracks reads — `React.memo` adds noise without measured benefit in most cases.

---

## Testing components — don't

This guide intentionally **does not** unit-test components. UI is verified by
end-to-end tests (Playwright / Cypress / WebdriverIO). Unit-testing
components mostly verifies that React works, not that your feature does.

For unit-test coverage strategy across the rest of the codebase, see
[testing.md](./testing.md).
