# Application layer — models, ports, use cases

> **Prerequisites:** [README.md](./README.md) for the layer model, naming
> convention (no `I` prefix), dependency rule, and TypeScript style.

This file is the day-to-day reference for the **framework-free core** of a
feature:

- **§5** Domain models
- **§6** Ports
- **§7** Use cases
- **§Event bus — Publisher & Subscriber ports**

For the **reactive state primitives** (`State<Source, Computed>`, selectors,
reactions), see [reactive.md](./reactive.md). For **adapters** (HTTP,
storage, presenters), see [adapters.md](./adapters.md).

The running example throughout this directory is a generic `tasks` feature.

---

## 5. Domain Models

Live in `<feature>/application/models/`.

### Principles

- **Plain TypeScript** — no React, no MobX, no decorators.
- **Immutable by convention** — `readonly` properties; produce new objects via spread.
- **Discriminated unions** for variants.

```ts
// application/models/Task.ts
export interface Task {
    readonly id: string;
    readonly title: string;
    readonly status: TaskStatus;
    readonly dueDate: string | null;
    readonly assigneeId: string | null;
}

export type TaskStatus =
    | { readonly type: 'open' }
    | { readonly type: 'in-progress'; readonly startedAt: string }
    | { readonly type: 'done'; readonly completedAt: string };
```

```ts
// application/models/TaskFilter.ts
export type TaskFilter = 'all' | 'active' | 'completed';
```

```ts
// application/models/AppError.ts
export type ErrorCode = 'network' | 'not_found' | 'forbidden' | 'unknown';

export class AppError extends Error {
    constructor(
        readonly code: ErrorCode,
        readonly messageKey: string,
    ) {
        super(messageKey);
        this.name = 'AppError';
    }
}
```

---

## 6. Ports

Live in `<feature>/application/ports/`. **No `I` prefix.**

### 6.1 The three port families

Every port falls into one of three role-based categories. Pick the right
name shape for the role; do not blur them.

| Role | Port shape | Example |
|---|---|---|
| **Data access** (read/write a thing) | `<Thing>Repository` | `TasksRepository`, `ChartColorsRepository` |
| **Pure formatting** (state → string) | `<Subject>Presenter` | `DueDatePresenter`, `TaskListPresenter` |
| **One-way notification** (event bus) | `<Event>Publisher` / `<Event>Subscriber` | `TaskCompletedPublisher`, `TaskCompletedSubscriber` |

> **No `*Requester`, `*Uploader`, `*Fetcher`, `*Client`.** A read/write capability against the backend is always `<Thing>Repository`. The transport (HTTP, GraphQL, gRPC, IndexedDB) is an implementation detail of the adapter — the port should not leak it.

### 6.2 Naming pairs — port to impl

| Port (`application/ports/`) | HTTP impl (`api/repository/`) | Storage impl (`repository/`) |
|---|---|---|
| `TasksRepository` | `HttpTasksRepository` | `LocalStorageTasksRepository` |
| `WorkspacesRepository` | `HttpWorkspacesRepository` | — |
| `ChartColorsRepository` | `HttpChartColorsRepository` | `InMemoryChartColorsRepository` |
| `TaskListPresenter` | — | — (presenters live in `presentation/presenters/`) |

The interface name stays stable; the implementation carries the technology prefix. This lets you swap implementations (e.g., HTTP → in-memory for Storybook or tests) without renaming the port or the consumer.

### 6.3 Examples by role

```ts
// 1. Data-access port — Repository
// application/ports/TasksRepository.ts
import { Task } from '@app/tasks/application/models/Task';

export interface TasksRepository {
    getTasks(workspaceId: string): Promise<Task[]>;
    completeTask(taskId: string): Promise<void>;
    deleteTask(taskId: string): Promise<void>;
}
```

```ts
// 2. Pure formatting port — Presenter
// application/ports/DueDatePresenter.ts
export interface DueDatePresenter {
    format(dueDate: string | null): string;       // e.g. "Tomorrow", "Mar 5"
    isOverdue(dueDate: string | null): boolean;
}
```

```ts
// 3a. Event-bus port — Publisher (one-way notification)
// application/ports/TaskCompletedPublisher.ts
import { TaskCompletedEvent } from '@app/contract/events/TaskCompletedEvent';

export interface TaskCompletedPublisher {
    publish(event: TaskCompletedEvent): void;
}
```

```ts
// 3b. Event-bus port — Subscriber (one-way notification)
// application/ports/TaskCompletedSubscriber.ts
import { TaskCompletedEvent } from '@app/contract/events/TaskCompletedEvent';

export interface TaskCompletedSubscriber {
    onEvent(event: TaskCompletedEvent): void;
}
```

### 6.4 Why ports

- **Testability.** Use cases depend on interfaces. Tests pass a mock that satisfies the interface.
- **Replaceability.** Swap `Http*` for an `InMemory*` impl in Storybook or in tests.
- **Layer boundary.** Ports live in `application/`; their implementations live in outer layers (`api/`, `repository/`, `presentation/`, `event-bus/`).

---

## 7. Use Cases

Live **flat** in `<feature>/application/use-cases/`, **one `*UseCase.ts` file per operation**.

### 7.1 Structure

```ts
// application/use-cases/GetTasksUseCase.ts
import { ReactiveView } from 'clean-architecture-reactive';

import { TasksRepository } from '@app/tasks/application/ports/TasksRepository';
import { TasksState } from '@app/tasks/application/state/TasksState';

export class GetTasksUseCase {
    constructor(
        private readonly view: ReactiveView<TasksState>,
        private readonly tasksRepository: TasksRepository,
    ) {}

    async execute(workspaceId: string): Promise<void> {
        this.view.update({ isLoading: true });
        try {
            const tasks = await this.tasksRepository.getTasks(workspaceId);
            this.view.update({ tasks });
        } finally {
            this.view.update({ isLoading: false });
        }
    }
}
```

### 7.2 Rules

1. **One class, one public method.** If you need two public methods, split into two classes.
2. **Constructor injection only.** Every dependency is a port interface (or the reactive view), never a concrete class.
3. **Flat directory.** `use-cases/<Verb><Noun>UseCase.ts`. No sub-folder per use case. Tiny supporting pure functions live alongside as separate files (e.g. `validateDueDate.ts`).
4. **`execute(...)` is the default verb.** Use a domain-appropriate verb (`get`, `submit`, `open`, `close`, `reset`) only when it reads more naturally.
5. **State mutations live here.** `view.update({...})` is only ever called from a use case — never from a React component, never from a presenter, never from a repository. Components funnel every user action through `useCase.execute(...)`.
6. **Lifecycle is a use case too.** Opening, closing, and resetting a feature are first-class use cases: `OpenTasksUseCase`, `CloseTasksUseCase`, `ResetTasksUseCase`.
7. **Errors:** catch transport errors at the use case boundary and surface them through the view's error slot (or a feature-specific `errorPresenter` port — whatever fits your domain).

### 7.3 Lifecycle use cases

When a feature mounts or unmounts, the lifecycle is explicit:

```ts
// application/use-cases/OpenTasksUseCase.ts
export class OpenTasksUseCase {
    constructor(
        private readonly getTasks: GetTasksUseCase,
        private readonly view: ReactiveView<TasksState>,
    ) {}

    execute(workspaceId: string): void {
        this.view.update({ workspaceId, tasks: [], isLoading: false });
        void this.getTasks.execute(workspaceId);
    }
}
```

```ts
// application/use-cases/CloseTasksUseCase.ts
export class CloseTasksUseCase {
    constructor(private readonly view: ReactiveView<TasksState>) {}

    execute(): void {
        this.view.update({ workspaceId: null, tasks: [], filter: 'all' });
    }
}
```

The provider component (see [ui.md §15](./ui.md#15-feature-provider)) calls
`openTasksUseCase.execute(workspaceId)` on mount and
`closeTasksUseCase.execute()` on unmount.

### 7.4 Multi-step use cases

Compose smaller use cases inside a larger one. The composition is explicit in the constructor.

```ts
// application/use-cases/RetryTaskUseCase.ts
export class RetryTaskUseCase {
    constructor(
        private readonly deleteTask: DeleteTaskUseCase,
        private readonly createTask: CreateTaskUseCase,
    ) {}

    async execute(failedTask: Task): Promise<void> {
        await this.deleteTask.execute(failedTask.id);
        await this.createTask.execute({ title: failedTask.title });
    }
}
```

Avoid use cases calling other use cases through the view — always compose through constructor injection.

---

## Event bus — Publisher & Subscriber ports

For cross-feature communication, define event types under `src/contract/events/` (types only, zero logic) and pair them with Publisher/Subscriber ports.

### Event type — in `src/contract/`

```ts
// src/contract/events/TaskCompletedEvent.ts
export interface TaskCompletedEvent {
    readonly type: 'TaskCompletedEvent';
    readonly taskId: string;
    readonly completedAt: string;
}
```

### Publishing — use case calls a `Publisher` port

```ts
// application/use-cases/CompleteTaskUseCase.ts
export class CompleteTaskUseCase {
    constructor(
        private readonly view: ReactiveView<TasksState>,
        private readonly tasksRepository: TasksRepository,
        private readonly publisher: TaskCompletedPublisher,
    ) {}

    async execute(taskId: string): Promise<void> {
        await this.tasksRepository.completeTask(taskId);
        this.publisher.publish({
            type: 'TaskCompletedEvent',
            taskId,
            completedAt: new Date().toISOString(),
        });
    }
}
```

The concrete `Publisher` implementation lives in `event-bus/` (or in the
composition root if you prefer to inline a tiny impl). It might write to a
`postMessage` channel, an `EventTarget`, an RxJS subject, or anything else —
the use case doesn't care.

### Subscribing — a class implementing the `Subscriber` port

```ts
// application/event-bus/NotificationsTaskCompletedSubscriber.ts
import { TaskCompletedSubscriber }
    from '@app/notifications/application/ports/TaskCompletedSubscriber';

export class NotificationsTaskCompletedSubscriber implements TaskCompletedSubscriber {
    constructor(private readonly view: ReactiveView<NotificationsState>) {}

    onEvent(event: TaskCompletedEvent): void {
        this.view.update({
            toasts: [...this.view.state.toasts, { message: `Task ${event.taskId} completed` }],
        });
    }
}
```

The subscriber is registered to the event-bus channel in the consuming
feature's composition root (see [bootstrap.md](./bootstrap.md) and
[ui.md §Wiring subscribers](./ui.md#wiring-subscribers) for where the
subscription actually happens at runtime).

### Hard rule for `src/contract/`

`src/contract/` contains **types and channel constants only — no logic, no
behaviour, no functions.** This is what makes it safe for every feature to
depend on without creating import cycles between features.
