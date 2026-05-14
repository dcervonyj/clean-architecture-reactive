# Bootstrap a new feature module

> **Prerequisites:** [README.md](./README.md) — make sure you've internalised
> the layer model, naming convention (no `I` prefix), dependency rule, and
> TypeScript style before scaffolding.

This file is a **single-file recipe** for scaffolding a new feature module.
The worked example below scaffolds a `tasks` feature end to end — every file
you create, in the order you create them.

For anything beyond the first instance — more use cases, selectors,
reactions, cross-feature events — load the appropriate topic file from the
[README's topic map](./README.md#when-to-load-which-file).

---

## What this file scaffolds

One complete `tasks` feature module:

- Feature folder skeleton
- One port (`TasksRepository`) + one mapper + one HTTP adapter (`HttpTasksRepository`)
- One use case (`GetTasksUseCase`) + two lifecycle use cases (`OpenTasksUseCase`, `CloseTasksUseCase`)
- Reactive state (`TasksSourceState`, `TasksComputedState`, `TasksState`)
- One selector (`VisibleTasksSelector`)
- DI composition root (`createTasksContext`)
- Provider component (`Tasks.tsx`)
- Connector + exposed context type
- First UI component (`TasksContent.tsx`)
- First test (`GetTasksUseCase.test.ts`)

Path alias assumption: the app declares `@app/* → ./src/*`. Swap in your own
alias if different.

---

## Step 1 — Folder skeleton

```bash
cd <app-root>/src
mkdir -p tasks/{application/{models,ports,state,selectors,use-cases},api/{models,mapper,repository},config,presentation/presenters,ui/{connect,content}}
mkdir -p ../test/tasks/application/use-cases
```

Result:

```
src/tasks/
  application/
    models/
    ports/
    state/
    selectors/
    use-cases/
  api/
    models/
    mapper/
    repository/
  config/
  presentation/presenters/
  ui/
    connect/
    content/
test/tasks/application/use-cases/
```

---

## Step 2 — Domain model

```ts
// src/tasks/application/models/Task.ts
export interface Task {
    readonly id: string;
    readonly title: string;
    readonly status: TaskStatus;
    readonly dueDate: string | null;
}

export type TaskStatus =
    | { readonly type: 'open' }
    | { readonly type: 'done'; readonly completedAt: string };
```

```ts
// src/tasks/application/models/TaskFilter.ts
export type TaskFilter = 'all' | 'active' | 'completed';
```

---

## Step 3 — Port (no `I` prefix)

```ts
// src/tasks/application/ports/TasksRepository.ts
import { Task } from '@app/tasks/application/models/Task';

export interface TasksRepository {
    getTasks(workspaceId: string): Promise<Task[]>;
    completeTask(taskId: string): Promise<void>;
}
```

---

## Step 4 — Adapter (mapper + `Http*Repository`)

```ts
// src/tasks/api/models/TaskDto.ts
export interface TaskDto {
    id: string;
    title: string;
    status: 'open' | 'done';
    completed_at: string | null;
    due_date: string | null;
}
```

```ts
// src/tasks/api/mapper/TaskMapper.ts
import { TaskDto } from '@app/tasks/api/models/TaskDto';
import { Task, TaskStatus } from '@app/tasks/application/models/Task';

export class TaskMapper {
    fromServer(dto: TaskDto): Task {
        return {
            id: dto.id,
            title: dto.title,
            status: this.statusFromServer(dto),
            dueDate: dto.due_date,
        };
    }

    private statusFromServer(dto: TaskDto): TaskStatus {
        if (dto.status === 'done' && dto.completed_at !== null) {
            return { type: 'done', completedAt: dto.completed_at };
        }

        return { type: 'open' };
    }
}
```

```ts
// src/tasks/api/repository/HttpTasksRepository.ts
import { HttpClient } from '@app/shared/ports/HttpClient';

import { TaskDto } from '@app/tasks/api/models/TaskDto';
import { TaskMapper } from '@app/tasks/api/mapper/TaskMapper';
import { Task } from '@app/tasks/application/models/Task';
import { TasksRepository } from '@app/tasks/application/ports/TasksRepository';

export class HttpTasksRepository implements TasksRepository {
    constructor(
        private readonly http: HttpClient,
        private readonly mapper: TaskMapper,
    ) {}

    async getTasks(workspaceId: string): Promise<Task[]> {
        const dto = await this.http.get<TaskDto[]>(
            `/workspaces/${workspaceId}/tasks`,
        );

        return dto.map((d) => this.mapper.fromServer(d));
    }

    async completeTask(taskId: string): Promise<void> {
        await this.http.post(`/tasks/${taskId}/complete`, {});
    }
}
```

---

## Step 5 — Reactive state

```ts
// src/tasks/application/state/TasksSourceState.ts
import { Task } from '@app/tasks/application/models/Task';
import { TaskFilter } from '@app/tasks/application/models/TaskFilter';

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
// src/tasks/application/state/TasksComputedState.ts
import { Task } from '@app/tasks/application/models/Task';

export interface TasksComputedState {
    visibleTasks: Task[];
    isEmpty: boolean;
}
```

```ts
// src/tasks/application/state/TasksState.ts
import { State } from 'clean-architecture-reactive';

import { TasksComputedState } from '@app/tasks/application/state/TasksComputedState';
import { TasksSourceState } from '@app/tasks/application/state/TasksSourceState';

export type TasksState = State<TasksSourceState, TasksComputedState>;
```

---

## Step 6 — Selector

```ts
// src/tasks/application/selectors/VisibleTasksSelector.ts
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

```ts
// src/tasks/application/selectors/IsEmptySelector.ts
import { Selector } from 'clean-architecture-reactive';

import { TasksState } from '@app/tasks/application/state/TasksState';

export class IsEmptySelector implements Selector<TasksState, boolean> {
    select(state: TasksState): boolean {
        return !state.isLoading && state.tasks.length === 0;
    }
}
```

---

## Step 7 — Use cases (flat, one method each)

```ts
// src/tasks/application/use-cases/GetTasksUseCase.ts
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

```ts
// src/tasks/application/use-cases/OpenTasksUseCase.ts
import { ReactiveView } from 'clean-architecture-reactive';

import { TasksState } from '@app/tasks/application/state/TasksState';
import { GetTasksUseCase } from '@app/tasks/application/use-cases/GetTasksUseCase';

export class OpenTasksUseCase {
    constructor(
        private readonly getTasks: GetTasksUseCase,
        private readonly view: ReactiveView<TasksState>,
    ) {}

    execute(workspaceId: string): void {
        this.view.update({ workspaceId, tasks: [], filter: 'all' });
        void this.getTasks.execute(workspaceId);
    }
}
```

```ts
// src/tasks/application/use-cases/CloseTasksUseCase.ts
import { ReactiveView } from 'clean-architecture-reactive';

import { TasksState } from '@app/tasks/application/state/TasksState';

export class CloseTasksUseCase {
    constructor(private readonly view: ReactiveView<TasksState>) {}

    execute(): void {
        this.view.update({ workspaceId: null, tasks: [], filter: 'all' });
    }
}
```

```ts
// src/tasks/application/use-cases/CompleteTaskUseCase.ts
import { ReactiveView } from 'clean-architecture-reactive';

import { TasksRepository } from '@app/tasks/application/ports/TasksRepository';
import { TasksState } from '@app/tasks/application/state/TasksState';

export class CompleteTaskUseCase {
    constructor(
        private readonly view: ReactiveView<TasksState>,
        private readonly tasksRepository: TasksRepository,
    ) {}

    async execute(taskId: string): Promise<void> {
        await this.tasksRepository.completeTask(taskId);
        const updated = this.view.state.tasks.map((t) =>
            t.id === taskId
                ? { ...t, status: { type: 'done' as const, completedAt: new Date().toISOString() } }
                : t,
        );
        this.view.update({ tasks: updated });
    }
}
```

---

## Step 8 — Composition root

The composition root is a **plain function** that constructs every
dependency, registers selectors on the view, and returns a typed context
object. No DI containers required.

```ts
// src/tasks/config/TasksContextConfig.ts
import { HttpClient } from '@app/shared/ports/HttpClient';

export interface TasksContextConfig {
    workspaceId: string;
    httpClient: HttpClient;
}
```

```ts
// src/tasks/config/TasksContext.ts
import { MobXReactiveView } from 'clean-architecture-reactive/mobx';

import { TaskMapper } from '@app/tasks/api/mapper/TaskMapper';
import { HttpTasksRepository } from '@app/tasks/api/repository/HttpTasksRepository';
import { IsEmptySelector } from '@app/tasks/application/selectors/IsEmptySelector';
import { VisibleTasksSelector } from '@app/tasks/application/selectors/VisibleTasksSelector';
import {
    defaultTasksSourceState,
} from '@app/tasks/application/state/TasksSourceState';
import { TasksState } from '@app/tasks/application/state/TasksState';
import { CloseTasksUseCase } from '@app/tasks/application/use-cases/CloseTasksUseCase';
import { CompleteTaskUseCase } from '@app/tasks/application/use-cases/CompleteTaskUseCase';
import { GetTasksUseCase } from '@app/tasks/application/use-cases/GetTasksUseCase';
import { OpenTasksUseCase } from '@app/tasks/application/use-cases/OpenTasksUseCase';
import { TasksContext } from '@app/tasks/ui/connect/TasksContext';
import { TasksContextConfig } from '@app/tasks/config/TasksContextConfig';

export function createTasksContext(cfg: TasksContextConfig): TasksContext {
    // 1. Reactive view (the feature's single source of truth)
    const view = new MobXReactiveView<TasksState>(defaultTasksSourceState);

    // 2. Adapters
    const taskMapper = new TaskMapper();
    const tasksRepository = new HttpTasksRepository(cfg.httpClient, taskMapper);

    // 3. Use cases — constructor-inject the view + ports
    const getTasksUseCase = new GetTasksUseCase(view, tasksRepository);
    const completeTaskUseCase = new CompleteTaskUseCase(view, tasksRepository);
    const openTasksUseCase = new OpenTasksUseCase(getTasksUseCase, view);
    const closeTasksUseCase = new CloseTasksUseCase(view);

    // 4. Register selectors on the view (computed state)
    view.register({
        visibleTasks: new VisibleTasksSelector(),
        isEmpty: new IsEmptySelector(),
    });

    // 5. Public surface
    return {
        view,
        getTasksUseCase,
        completeTaskUseCase,
        openTasksUseCase,
        closeTasksUseCase,
    };
}
```

The `TasksContext` interface (in `ui/connect/`) **must match the return type exactly** — see next step.

---

## Step 9 — Connector + exposed context type

```ts
// src/tasks/ui/connect/TasksContext.ts
import { ReactiveView } from 'clean-architecture-reactive';

import { TasksState } from '@app/tasks/application/state/TasksState';
import { CloseTasksUseCase } from '@app/tasks/application/use-cases/CloseTasksUseCase';
import { CompleteTaskUseCase } from '@app/tasks/application/use-cases/CompleteTaskUseCase';
import { GetTasksUseCase } from '@app/tasks/application/use-cases/GetTasksUseCase';
import { OpenTasksUseCase } from '@app/tasks/application/use-cases/OpenTasksUseCase';

export interface TasksContext {
    view: ReactiveView<TasksState>;
    getTasksUseCase: GetTasksUseCase;
    completeTaskUseCase: CompleteTaskUseCase;
    openTasksUseCase: OpenTasksUseCase;
    closeTasksUseCase: CloseTasksUseCase;
}
```

```ts
// src/tasks/ui/connect/connector.ts
import { Connector } from '@app/shared/Connector';

import { TasksContext } from '@app/tasks/ui/connect/TasksContext';

const connector = new Connector<TasksContext>();

export const Provider = connector.Provider;
export const connect = connector.connect;
```

The `Connector` class is the ~30-line utility shown in [ui.md §16.1](./ui.md#161-the-connector).

---

## Step 10 — Provider component

```tsx
// src/tasks/config/Tasks.tsx
import React, { useEffect, useMemo } from 'react';
import { observer } from 'mobx-react';

import { HttpClient } from '@app/shared/ports/HttpClient';
import { createTasksContext } from '@app/tasks/config/TasksContext';
import { TasksContent } from '@app/tasks/ui/content/TasksContent';
import { Provider } from '@app/tasks/ui/connect/connector';

export interface PropsTasks {
    workspaceId: string;
    httpClient: HttpClient;
}

export const Tasks: React.FC<PropsTasks> = observer(({ workspaceId, httpClient }) => {
    const context = useMemo(
        () => createTasksContext({ workspaceId, httpClient }),
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

---

## Step 11 — First UI component

```tsx
// src/tasks/ui/content/TasksContent.tsx
import { ReactiveView } from 'clean-architecture-reactive';

import { TasksState } from '@app/tasks/application/state/TasksState';
import { CompleteTaskUseCase } from '@app/tasks/application/use-cases/CompleteTaskUseCase';
import { connect } from '@app/tasks/ui/connect/connector';

interface PropsTasksContent {
    view: ReactiveView<TasksState>;
    completeTaskUseCase: CompleteTaskUseCase;
}

function TasksContentView({ view, completeTaskUseCase }: PropsTasksContent) {
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
}));
```

---

## Step 12 — First test

```ts
// test/tasks/application/use-cases/GetTasksUseCase.test.ts
import { mock } from 'vitest-mock-extended'; // or jest-mock-extended; pick your stack
import { describe, expect, it } from 'vitest';

import { ReactiveView } from 'clean-architecture-reactive';
import { Task } from '@app/tasks/application/models/Task';
import { TasksRepository } from '@app/tasks/application/ports/TasksRepository';
import { TasksState } from '@app/tasks/application/state/TasksState';
import { GetTasksUseCase } from '@app/tasks/application/use-cases/GetTasksUseCase';

describe('GetTasksUseCase', () => {
    it('loads tasks for the workspace and writes them to the view', async () => {
        const tasks: Task[] = [
            { id: 't1', title: 'First', status: { type: 'open' }, dueDate: null },
        ];

        const view = mock<ReactiveView<TasksState>>();
        const repo = mock<TasksRepository>();
        repo.getTasks.mockResolvedValue(tasks);

        const useCase = new GetTasksUseCase(view, repo);
        await useCase.execute('ws_1');

        expect(repo.getTasks).toHaveBeenCalledWith('ws_1');
        expect(view.update).toHaveBeenCalledWith({ isLoading: true });
        expect(view.update).toHaveBeenCalledWith({ tasks });
        expect(view.update).toHaveBeenCalledWith({ isLoading: false });
    });
});
```

---

## Step 13 — Register, lint, test

Plug the feature into your app shell (wherever features mount):

```tsx
<Tasks workspaceId={currentWorkspaceId} httpClient={httpClient} />
```

Run lint and tests in parallel:

```bash
yarn lint & yarn test & wait
```

Both must pass before the feature is considered done.

---

## Where to go next

The scaffold above gives you one feature with HTTP, a use case, a selector,
and a component. For anything beyond, load the relevant topic file:

| Next step | Load |
|---|---|
| Add a reaction that re-fetches on filter change | [reactive.md §Reactions](./reactive.md#reactions) |
| Publish or subscribe to a cross-feature event | [application.md §Event bus](./application.md#event-bus--publisher--subscriber-ports) + [ui.md §Wiring subscribers](./ui.md#wiring-subscribers) |
| Add a presenter for formatted display values | [adapters.md §11](./adapters.md#11-presenters) |
| Cache HTTP results in memory or local storage | [adapters.md §10.2](./adapters.md#102-repository--non-http-storage) |
| Test selectors, reactions, mappers, repositories | [testing.md](./testing.md) |
| Understand the reactive library internals | the [reference repo](https://github.com/dcervonyj/clean-architecture-reactive) |
