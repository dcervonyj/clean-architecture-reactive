# Code Style

> **Companion to** [README.md §5–6](./README.md#5-naming-cheat-sheet).
> Those sections list the rules; this file expands each with **❌ / ✅ pairs**
> so patterns can be matched against real code.

---

## 1. Interface naming — no `I` prefix

Ports are plain PascalCase nouns. The *implementation* carries the tech prefix, not the interface.

```ts
// ❌
export interface ITasksRepository {
    getTasks(workspaceId: string): Promise<ITask[]>;
}

export class TasksRepositoryImpl implements ITasksRepository { ... }
```

```ts
// ✅
export interface TasksRepository {
    getTasks(workspaceId: string): Promise<Task[]>;
}

export class HttpTasksRepository implements TasksRepository { ... }
```

This mirrors the reactive lib's own design: `ReactiveView` (interface) ↔ `MobXReactiveView` (impl).

---

## 2. Implementation tech prefixes

Every concrete implementation of a port is prefixed with the technology it uses.

| Technology | Prefix | Example |
|---|---|---|
| HTTP (fetch / axios) | `Http` | `HttpTasksRepository` |
| Browser LocalStorage | `LocalStorage` | `LocalStorageSettingsRepository` |
| In-memory / cache | `InMemory` | `InMemoryChartColorsRepository` |
| MobX observable store | `MobX` | `MobXNotificationsRepository` |

```ts
// ❌ — implementation name doesn't reveal the technology
export class TasksRepositoryImpl implements TasksRepository { ... }
export class TasksRepositoryHttp implements TasksRepository { ... }

// ✅
export class HttpTasksRepository implements TasksRepository { ... }
export class LocalStorageTasksRepository implements TasksRepository { ... }
```

Role-specific ports (`*Publisher`, `*Subscriber`) keep their role names as-is — the repository convention doesn't apply to them because their shape is fundamentally different.

---

## 3. File and folder naming

| Item | Convention | Example |
|---|---|---|
| Class file | PascalCase | `GetTasksUseCase.ts`, `HttpTasksRepository.ts` |
| Non-class module | camelCase | `connector.ts`, `defaultTasksSourceState.ts` |
| React component file | PascalCase + `.tsx` | `TasksContent.tsx` |
| Folder | kebab-case | `use-cases/`, `api/repository/`, `presentation/presenters/` |

```
// ❌
use-cases/
  get-tasks-use-case.ts         ← camelCase for a class
api/
  repositories/                 ← should be repository/ (singular)
    http-tasks-repository.ts

// ✅
use-cases/
  GetTasksUseCase.ts
api/
  repository/
    HttpTasksRepository.ts
```

### No `*Helper`, `*Utils`, `*Manager`, `*Service`

These names are architectural non-roles. Place logic in the role that fits:

| Instead of | Use |
|---|---|
| `TaskHelper` | `GetTasksUseCase`, `TaskMapper`, `TaskPresenter` |
| `StringUtils` | a pure function in `utils/`, or a presenter method |
| `DataManager` | a `*Repository` or `*UseCase` |
| `TaskService` | one or more `*UseCase` classes |

```ts
// ❌
export class TaskHelper {
    formatDueDate(date: string | null): string { ... }
    getVisibleTasks(tasks: Task[], filter: TaskFilter): Task[] { ... }
}

// ✅ — separate the concerns
export class DueDatePresenter implements DueDatePresenterPort {
    format(date: string | null): string { ... }
}

export class VisibleTasksSelector implements Selector<TasksState, Task[]> {
    select(state: TasksState): Task[] { ... }
}
```

---

## 4. No `let` — prefer `const` and method extraction

`let` in a method body usually signals a private method should be extracted.

```ts
// ❌
async execute(workspaceId: string): Promise<void> {
    let url: string;
    if (this.region === 'eu') {
        url = `/eu/workspaces/${workspaceId}/tasks`;
    } else {
        url = `/workspaces/${workspaceId}/tasks`;
    }
    const dto = await this.http.get<TaskDto[]>(url);
    this.view.update({ tasks: dto.map((d) => this.mapper.fromServer(d)) });
}

// ✅
async execute(workspaceId: string): Promise<void> {
    const dto = await this.http.get<TaskDto[]>(this.tasksUrl(workspaceId));
    this.view.update({ tasks: dto.map((d) => this.mapper.fromServer(d)) });
}

private tasksUrl(workspaceId: string): string {
    const prefix = this.region === 'eu' ? '/eu' : '';

    return `${prefix}/workspaces/${workspaceId}/tasks`;
}
```

When every path is a simple ternary, an inline ternary is fine — no extraction needed:

```ts
// ✅ — ternary is clear enough here
private tasksUrl(workspaceId: string): string {
    const prefix = this.region === 'eu' ? '/eu' : '';

    return `${prefix}/workspaces/${workspaceId}/tasks`;
}
```

---

## 5. Always braces on `if` / `else`

Never single-line guards. Always `{ }`, even for one-liners.

```ts
// ❌
if (tasks.length === 0) return [];
if (error) throw error;

// ✅
if (tasks.length === 0) {
    return [];
}
if (error) {
    throw error;
}
```

---

## 6. Blank line before `return`

Unless `return` is the **only** statement in the block, always leave an empty line before it.

```ts
// ❌
private statusFromServer(dto: TaskDto): TaskStatus {
    if (dto.status === 'done' && dto.completed_at !== null) {
        return { type: 'done', completedAt: dto.completed_at };
    }
    const mapped = this.mapOpenStatus(dto);
    return mapped;
}

// ✅
private statusFromServer(dto: TaskDto): TaskStatus {
    if (dto.status === 'done' && dto.completed_at !== null) {
        return { type: 'done', completedAt: dto.completed_at };
    }
    const mapped = this.mapOpenStatus(dto);

    return mapped;
}
```

`return` as the only statement — no blank line needed:

```ts
// ✅ — return is the only statement; no blank line required
private isOverdue(dueDate: string | null): boolean {
    return dueDate !== null && new Date(dueDate).getTime() < Date.now();
}
```

---

## 7. Public methods before private in a class

Layout: `constructor` → public methods → private methods. Readers see the public API first.

```ts
// ❌
export class HttpTasksRepository implements TasksRepository {
    private toUrl(workspaceId: string): string { ... }

    async getTasks(workspaceId: string): Promise<Task[]> { ... }
    async completeTask(taskId: string): Promise<void> { ... }

    constructor(private readonly http: HttpClient, private readonly mapper: TaskMapper) {}

    private mapDtos(dtos: TaskDto[]): Task[] { ... }
}

// ✅
export class HttpTasksRepository implements TasksRepository {
    constructor(
        private readonly http: HttpClient,
        private readonly mapper: TaskMapper,
    ) {}

    async getTasks(workspaceId: string): Promise<Task[]> { ... }
    async completeTask(taskId: string): Promise<void> { ... }

    private toUrl(workspaceId: string): string { ... }
    private mapDtos(dtos: TaskDto[]): Task[] { ... }
}
```

---

## 8. No arrow functions inside method bodies — extract as named private methods

Arrow functions defined inside a method body are anonymous, cannot be independently tested, and make stack traces harder to read.

```ts
// ❌ — inline arrow function
async getTasks(workspaceId: string): Promise<Task[]> {
    const dtos = await this.http.get<TaskDto[]>(`/workspaces/${workspaceId}/tasks`);

    return dtos.map((dto) => ({
        id: dto.id,
        title: dto.title,
        status: dto.status === 'done'
            ? { type: 'done' as const, completedAt: dto.completed_at! }
            : { type: 'open' as const },
        dueDate: dto.due_date,
    }));
}

// ✅ — extracted private method
async getTasks(workspaceId: string): Promise<Task[]> {
    const dtos = await this.http.get<TaskDto[]>(`/workspaces/${workspaceId}/tasks`);

    return dtos.map((dto) => this.mapper.fromServer(dto));
}
```

This rule applies to any non-trivial callback. For truly trivial expressions (`(x) => x.id`, `(t) => t.status !== 'done'`) an inline arrow is fine — extract when the body is more than one expression.

---

## 9. No `as` type assertions

`as SomeType` hides type errors. Fix the shape instead, or use narrowing.

```ts
// ❌
const error = caughtError as Error;
const repo = {} as TasksRepository;
const tasks = response as Task[];

// ✅ — narrow explicitly
if (caughtError instanceof Error) {
    this.view.update({ errorMessage: caughtError.message });
} else {
    this.view.update({ errorMessage: String(caughtError) });
}

// ✅ — in tests: use a typed mock library
import { mock } from 'vitest-mock-extended';
const repo = mock<TasksRepository>();   // full type, no as-any needed
```

The only exception is when wrapping a third-party API with an incompatible type. If you must use `as`, add a comment explaining why and make the scope as narrow as possible.

---

## 10. No `any` — use `unknown` and narrow

```ts
// ❌
function handleError(err: any): void {
    this.view.update({ errorMessage: err.message });
}

// ✅
function handleError(err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    this.view.update({ errorMessage: message });
}
```

In tests, `as any` to coerce mocks is equally banned — see §13.

---

## 11. Nullable types and `??` as design signals

`T | null`, `T | undefined`, and `??` are valid TypeScript but often mean the domain model can be improved. Before reaching for them, ask: can a discriminated union remove the possibility entirely?

```ts
// ❌ — nullability leaks into every consumer
interface TasksState {
    tasks: Task[] | null;      // null means "not loaded yet"?
    selectedTask: Task | null; // null means "nothing selected"?
}

// ✅ — explicit states
type LoadingState = { type: 'idle' } | { type: 'loading' } | { type: 'loaded'; tasks: Task[] };

interface TasksState {
    loadingState: LoadingState;
    selectedTaskId: string | null; // null IS a valid domain value here — no task selected
}
```

When `null` is genuinely a meaningful domain value (e.g., "no due date", "no selected item"), it is correct. The smell is using `null` as a stand-in for "not yet initialised" or "unknown state" — use explicit union types instead.

---

## 12. Props naming for React components

```ts
// ❌
interface TasksContentProps { ... }
interface IPropsTasksContent { ... }

// ✅ — Props<ComponentName>
interface PropsTasksContent {
    view: ReactiveView<TasksState>;
    completeTaskUseCase: CompleteTaskUseCase;
}
```

The `Props<ComponentName>` convention keeps props types consistently searchable and clearly tied to their component.

---

## 13. Test mock discipline — never `any()`, never `as any`

**Never use `any()` matchers** in verify/assertion blocks. Always construct the exact expected argument.

```ts
// ❌ — hides off-by-one errors and shape mismatches
expect(repo.getTasks).toHaveBeenCalledWith(anything());
verify(mock.update(any())).once();

// ✅ — exact argument
expect(repo.getTasks).toHaveBeenCalledWith('ws_1');
expect(view.update).toHaveBeenCalledWith({ isLoading: true });
```

**Never `as any` to coerce mocks.** Typed mock libraries generate the full type from the interface:

```ts
// ❌
const repo = { getTasks: vi.fn() } as any as TasksRepository;

// ✅
import { mock } from 'vitest-mock-extended';
const repo = mock<TasksRepository>();
repo.getTasks.mockResolvedValue(TASKS);
```

---

## 14. Path aliases for cross-layer imports

Relative imports (`../../`) are fine within the same folder. Across layer boundaries, always use the `@app/*` alias.

```ts
// ❌ — relative import crossing a layer boundary
import { TasksRepository } from '../../application/ports/TasksRepository';

// ✅
import { TasksRepository } from '@app/tasks/application/ports/TasksRepository';
```

Same folder — relative is fine:

```ts
// ✅ — sibling in the same folder
import { TaskMapper } from './TaskMapper';
```

---

## Quick reference — naming cheat sheet

| Concept | Pattern | Example |
|---|---|---|
| Port (interface) | Plain noun, **no `I`** | `TasksRepository`, `DueDatePresenter` |
| HTTP impl | `Http<Port>` | `HttpTasksRepository` |
| Storage impl | `LocalStorage<Port>` / `InMemory<Port>` / `MobX<Port>` | `LocalStorageSettingsRepository` |
| Use case | `<Verb><Noun>UseCase` | `GetTasksUseCase`, `CompleteTaskUseCase` |
| Lifecycle use case | `Open<Feature>UseCase`, `Close<Feature>UseCase` | `OpenTasksUseCase` |
| Selector | `<Subject>Selector` | `VisibleTasksSelector`, `IsEmptySelector` |
| Reaction | `<Cause>Reaction` | `WorkspaceChangedReaction` |
| Mapper | `<Subject>Mapper` | `TaskMapper` |
| Presenter port | `<Subject>Presenter` | `DueDatePresenter` |
| Presenter impl | same name (only one impl) | `DueDatePresenter` |
| State types | `<Feature>SourceState`, `<Feature>ComputedState`, `<Feature>State` | `TasksSourceState` |
| Composition root fn | `create<Feature>Context` | `createTasksContext` |
| Composition root type | `<Feature>Context` | `TasksContext` |
| Provider component | `<Feature>.tsx` | `Tasks.tsx` |
| Props type | `Props<ComponentName>` | `PropsTasksContent` |
| Publisher port | `<Event>Publisher` | `BatchUploadedPublisher` |
| Subscriber port | `<Event>Subscriber` | `BatchUploadedSubscriber` |
| Test file | `<ClassName>.test.ts` | `GetTasksUseCase.test.ts` |
| Class file | PascalCase | `HttpTasksRepository.ts` |
| Non-class module | camelCase | `connector.ts` |
| Folder | kebab-case | `use-cases/`, `api/repository/` |
