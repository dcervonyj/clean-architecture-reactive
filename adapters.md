# Adapters — HTTP, repositories, mappers, presenters

> **Prerequisites:** [README.md](./README.md) for the layer model and naming
> convention. [application.md §6](./application.md#6-ports) for the
> port naming pairs (`<Thing>Repository` interface ↔ `Http<Thing>Repository`
> impl).

This file covers the **outer ring** — everything that touches HTTP, storage,
or formatting:

- **§10.1** `api/` — HTTP repositories + mappers + server DTOs
- **§10.2** `repository/` — non-HTTP storage / in-memory / cache repositories
- **§11** Presenters

For the **framework-free core** (models, ports, use cases), see
[application.md](./application.md).

---

## The HTTP client contract

Adapters don't depend on a specific HTTP library. They depend on a small
`HttpClient` interface that you implement once at the application boundary
(wrapping `fetch`, `axios`, or anything else):

```ts
// shared/ports/HttpClient.ts
export interface HttpClient {
    get<T>(url: string): Promise<T>;
    post<T>(url: string, body: unknown): Promise<T>;
    put<T>(url: string, body: unknown): Promise<T>;
    delete(url: string): Promise<void>;
}
```

A minimal `fetch`-based implementation might live in `shared/http/FetchHttpClient.ts`. The point: the rest of the codebase only knows the interface.

---

## 10.1 `api/` — HTTP

```
api/
  models/                      # Server DTOs (one file per endpoint family)
    TaskDto.ts
  mapper/
    TaskMapper.ts              # DTO ↔ domain
  repository/
    HttpTasksRepository.ts     # implements TasksRepository from application/ports/
```

### Server DTO

```ts
// api/models/TaskDto.ts
export interface TaskDto {
    id: string;
    title: string;
    status: 'open' | 'in_progress' | 'done';
    started_at: string | null;
    completed_at: string | null;
    due_date: string | null;
    assignee_id: string | null;
}
```

DTOs match the server's shape **exactly**, including snake_case if that's
what the server returns. They never leak past `api/`.

### Mapper

DTO ↔ domain transformations are pure functions or classes. They live in
`api/mapper/` (singular) so there's one mapper per domain concept.

```ts
// api/mapper/TaskMapper.ts
import { TaskDto } from '@app/tasks/api/models/TaskDto';
import { Task, TaskStatus } from '@app/tasks/application/models/Task';

export class TaskMapper {
    fromServer(dto: TaskDto): Task {
        return {
            id: dto.id,
            title: dto.title,
            status: this.statusFromServer(dto),
            dueDate: dto.due_date,
            assigneeId: dto.assignee_id,
        };
    }

    private statusFromServer(dto: TaskDto): TaskStatus {
        if (dto.status === 'open') {
            return { type: 'open' };
        }
        if (dto.status === 'in_progress' && dto.started_at !== null) {
            return { type: 'in-progress', startedAt: dto.started_at };
        }
        if (dto.status === 'done' && dto.completed_at !== null) {
            return { type: 'done', completedAt: dto.completed_at };
        }
        throw new Error(`Unexpected task DTO shape: ${JSON.stringify(dto)}`);
    }
}
```

Why a class (and not a free function)?
- It can be constructor-injected if it needs collaborators.
- It groups multiple mappings (`fromServer`, `toServer`) on one object.
- It's trivially mockable in tests of repositories.

For trivial mappers without dependencies, a free function is also fine —
pick whichever reads better.

### HTTP repository (the adapter)

```ts
// api/repository/HttpTasksRepository.ts
import { HttpClient } from '@app/shared/ports/HttpClient';

import { TaskDto } from '@app/tasks/api/models/TaskDto';
import { TaskMapper } from '@app/tasks/api/mapper/TaskMapper';
import { TasksRepository } from '@app/tasks/application/ports/TasksRepository';
import { Task } from '@app/tasks/application/models/Task';

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

    async deleteTask(taskId: string): Promise<void> {
        await this.http.delete(`/tasks/${taskId}`);
    }
}
```

Rules:
- The adapter is **thin** — it makes the request, maps the response, and returns. No business logic.
- It implements a `Repository` port from `application/ports/`. The port name doesn't mention HTTP — the *impl* does (`Http*`).
- Errors propagate. The use case is responsible for catching them and updating the view's error slot.

---

## 10.2 `repository/` — non-HTTP storage

Anything that isn't an HTTP adapter lives here: local storage, in-memory caches, IndexedDB, browser-API-backed repositories.

### LocalStorage example

```ts
// repository/LocalStorageTasksRepository.ts
import { Task } from '@app/tasks/application/models/Task';
import { TasksRepository } from '@app/tasks/application/ports/TasksRepository';

const STORAGE_KEY = 'app.tasks';

export class LocalStorageTasksRepository implements TasksRepository {
    async getTasks(): Promise<Task[]> {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === null) {
            return [];
        }

        return JSON.parse(raw) as Task[];
    }

    async completeTask(taskId: string): Promise<void> {
        const tasks = await this.getTasks();
        const next = tasks.map((t) =>
            t.id === taskId
                ? { ...t, status: { type: 'done' as const, completedAt: new Date().toISOString() } }
                : t,
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }

    async deleteTask(taskId: string): Promise<void> {
        const tasks = await this.getTasks();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks.filter((t) => t.id !== taskId)));
    }
}
```

### In-memory cache example

```ts
// repository/InMemoryChartColorsRepository.ts
import { ChartColorsRepository } from '@app/shared/application/ports/ChartColorsRepository';

export class InMemoryChartColorsRepository implements ChartColorsRepository {
    private cache: string[] | null = null;

    constructor(private readonly source: ChartColorsRepository) {}

    async getColors(): Promise<string[]> {
        if (this.cache !== null) {
            return this.cache;
        }
        this.cache = await this.source.getColors();

        return this.cache;
    }
}
```

This is a **decorator** — it implements the same port and delegates to another instance. The composition root chooses whether the production wiring uses `InMemoryChartColorsRepository` wrapping `HttpChartColorsRepository`, or just `HttpChartColorsRepository` directly.

### When `repository/` vs. `api/repository/`

| Implementation | Folder |
|---|---|
| Talks HTTP | `api/repository/Http*Repository.ts` |
| Talks local storage / IndexedDB | `repository/LocalStorage*Repository.ts` |
| Pure in-memory / decorator | `repository/InMemory*Repository.ts` |
| MobX-observable storage | `repository/MobX*Repository.ts` |

The split keeps HTTP-specific concerns (DTOs, mappers, base URL) in one place.

---

## 11. Presenters

Presenters read state and format it for UI. They are pure (no side effects beyond reading view state and calling other presenters or formatters).

```ts
// presentation/presenters/DueDatePresenter.ts
import { DueDatePresenter as DueDatePresenterPort }
    from '@app/tasks/application/ports/DueDatePresenter';

export class DueDatePresenter implements DueDatePresenterPort {
    format(dueDate: string | null): string {
        if (dueDate === null) {
            return 'No deadline';
        }
        const date = new Date(dueDate);
        const now = new Date();
        const diffDays = Math.floor((date.getTime() - now.getTime()) / 86_400_000);

        if (diffDays === 0) {
            return 'Today';
        }
        if (diffDays === 1) {
            return 'Tomorrow';
        }
        if (diffDays < 0) {
            return `${-diffDays} days overdue`;
        }

        return date.toLocaleDateString();
    }

    isOverdue(dueDate: string | null): boolean {
        if (dueDate === null) {
            return false;
        }

        return new Date(dueDate).getTime() < Date.now();
    }
}
```

### Rules

- **Pure.** No `fetch`, no `localStorage`, no `Date.now()` outside of `format(...)` (and even there, prefer to inject a `Clock` port if testability matters).
- **Implements a port.** The port lives in `application/ports/` (so use cases and components depend on the abstraction). The implementation lives in `presentation/presenters/`.
- **Constructor-injected dependencies.** Presenters can depend on other presenters, on the reactive view, or on translator/formatter ports.
- **No data access.** Presenters never call repositories. If they need data, it must already be in the view (placed there by a use case).

### When a presenter vs. a selector?

- A **selector** derives a value from state and stores it in computed state.
- A **presenter** converts a value (which might come from state or from a method argument) into a UI-ready string or style.

Rule of thumb: if the output is a string for human display, it's a presenter. If the output is structured data the rest of the application needs, it's a selector.

---

## Naming summary

| Concept | Folder | Pattern |
|---|---|---|
| Data port | `application/ports/` | `<Thing>Repository` (no `I` prefix) |
| HTTP impl | `api/repository/` | `Http<Thing>Repository` |
| Storage impl | `repository/` | `LocalStorage<Thing>Repository`, `InMemory<Thing>Repository`, `MobX<Thing>Repository` |
| Server DTO | `api/models/` | `<Thing>Dto` |
| Mapper | `api/mapper/` | `<Thing>Mapper` |
| Presenter port | `application/ports/` | `<Subject>Presenter` |
| Presenter impl | `presentation/presenters/` | `<Subject>Presenter` (same name; only one impl typically) |

Role-specific ports (Publisher, Subscriber) keep their role names — see [application.md §6 Event bus](./application.md#event-bus--publisher--subscriber-ports). They don't fit the Repository convention because their shape is fundamentally different (one-way notification, not read/write).
