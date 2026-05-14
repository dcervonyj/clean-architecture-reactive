# Clean Architecture Reactive — Frontend Guide

> A consumer-oriented blueprint for building **reactive frontend applications**
> on top of [`clean-architecture-reactive`](https://github.com/dcervonyj/clean-architecture-reactive)
> — a small TypeScript library providing the reactive state primitives
> (`ReactiveView`, `State<Source, Computed>`, `Selector`, `Reaction`) used
> throughout this guide.
>
> **Scope:** how to structure a frontend so that business logic is
> framework-free, state is observable, and feature modules follow a
> predictable shape.
>
> **Out of scope:** form libraries, theming/i18n, build tooling, routing.
> Those are concerns this guide takes no opinion on.
>
> **Stack assumption:** TypeScript everywhere. The reactive primitives ship a
> MobX-backed implementation; UI examples use React. Layers below the UI
> are framework-agnostic.

---

## When to load which file

This directory is structured so an AI agent (or a human) can load only the
files it needs for the current task. The pointer table below tells you which:

| Working on… | Load |
|---|---|
| **Bootstrapping a new feature module from zero** | this + [bootstrap.md](./bootstrap.md) |
| Adding a use case, port, model, presenter, or DI bean | this + [application.md](./application.md) + [adapters.md](./adapters.md) |
| Adding an HTTP endpoint, mapper, repository, or storage cache | this + [adapters.md](./adapters.md) |
| Touching reactive state — `ReactiveView`, source/computed split, selectors, reactions | this + [reactive.md](./reactive.md) |
| Building or modifying React components, connectors, or providers | this + [ui.md](./ui.md) |
| Publishing or subscribing to cross-feature events | this + [application.md §Event bus](./application.md#event-bus--publisher--subscriber-ports) + [ui.md §Subscriptions](./ui.md#wiring-subscribers) |
| Writing tests for use cases, mappers, repositories, selectors | this + [testing.md](./testing.md) |
| Reviewing naming conventions, TypeScript rules, or class/file layout | this + [code-style.md](./code-style.md) |

---

## 1. What this architecture buys you

- **Business logic is framework-free.** The `application/` layer imports no React, no MobX, no HTTP library. It can be unit-tested with plain mocks.
- **State is reactive and explicit.** Every feature owns a single `ReactiveView<State<Source, Computed>>` instance. Source state is mutated only by use cases via `view.update({...})`; computed state is derived by selectors registered on the view.
- **Wiring is auditable.** Every feature has a `<Feature>Context.ts` composition root — a plain function that constructs all dependencies, registers selectors/reactions, and returns a typed context object.
- **Layer boundaries are real.** A small set of import rules (enforced by ESLint or convention) makes layer violations either impossible or obvious.

When this architecture is a good fit:

| ✅ Good fit | ❌ Overkill |
|---|---|
| Long-lived application with 5+ features | Single-screen widget |
| Multiple developers / teams | Solo prototype |
| Charts, dashboards, async data flows | Static marketing page |
| Frontend may swap UI library someday | Tight coupling to one framework is fine |

---

## 2. Vocabulary

| Term | Definition |
|---|---|
| **Feature Module** | A self-contained directory under `src/` representing one business domain (e.g. `tasks`, `projects`, `notifications`). Each feature has its own `application/`, `api/`, `repository/`, `config/`, `ui/`. |
| **Reactive View** | An instance of `ReactiveView<State<Source, Computed>>` from the reactive lib. The single reactive state container backing a feature. |
| **Source State** | The mutable side of state — set imperatively by use cases via `view.update({...})`. |
| **Computed State** | The reactively-derived side — produced by selectors registered on the view. Never mutated by hand. |
| **Selector** | A class implementing `Selector<FullState, T>` with a single `select(state)` method. Produces a derived (computed) slice from source state. Registered with `view.register({ key: selectorInstance })`. Named `<Subject>Selector`. |
| **Reaction** | A class implementing `Reaction<FullState, T>` — pairs `extractReactionCause(state)` with `action(curr, prev)`. Fires whenever the extracted cause value changes. Named `<Cause>Reaction`. |
| **Port** | A plain TypeScript interface in `application/ports/` defining a capability the feature needs. **No `I` prefix.** |
| **Use Case** | A class with a single public `execute()` method (or domain-appropriate verb) that orchestrates ports. Lives in `application/use-cases/`, flat directory. |
| **Repository** | The standard name for a data-access port. The interface is `<Thing>Repository`; the implementation gets a tech prefix (`Http<Thing>Repository`, `LocalStorage<Thing>Repository`, etc.). |
| **Presenter** | A class that reads state and formats it for UI (currency, color, percentages). Pure — no side effects. |
| **Composition Root** | The `<Feature>Context.ts` function that wires every dependency together and exposes the typed context the UI consumes. |
| **Connector** | A tiny utility that pairs a React `Provider` with a `connect(Component, selectContext)` HOC so components subscribe reactively. |

---

## 3. Layer model

### 3.1 Top-level repo layout

```
<app>/
  src/
    root/                # App shell, routing, top-level providers
    shared/              # Cross-feature reusable primitives (UI components, generic ports)
    utils/               # Pure helpers (no UI, no I/O)
    contract/            # Cross-feature event/channel TYPES ONLY — zero logic

    <feature-a>/         # e.g. tasks/
    <feature-b>/         # e.g. projects/
    …
  test/                  # Mirror tree — see testing.md
  package.json
  tsconfig.json
```

### 3.2 Inside a feature module

```
<feature>/
  application/
    models/        # Domain models, enums
    ports/         # Interfaces — Repositories, Presenters, Publishers, Subscribers
    state/         # State<Source, Computed> type + default source state
    selectors/     # Pure: SourceState → ComputedState slice
    reactions/     # Side effects triggered by state changes
    use-cases/     # Flat — one class per operation, named *UseCase.ts
  api/
    models/        # Server DTOs
    mapper/        # DTO ↔ domain
    repository/    # Http<Thing>Repository adapters
  repository/      # Non-HTTP storage / in-memory / cache repos
  config/
    <Feature>.tsx              # React provider component
    <Feature>Context.ts        # Composition root (plain function)
    <Feature>ContextConfig.ts  # External config interface
  presentation/
    presenters/    # *Presenter classes — pure formatting
  ui/
    connect/
      connector.ts       # Connector<<Feature>Context>
      <Feature>Context.ts  # Type exposed to UI (matches what the composition root returns)
    content/             # Top-level feature components
  index.ts         # Public barrel re-exports
```

### 3.3 Layer table

| Layer | Folder | Responsibility | May import from |
|---|---|---|---|
| **Domain** | `application/models/` | Plain types, enums, immutable models | `application/`, `shared/` |
| **Ports** | `application/ports/` | Interfaces — Repositories, Presenters, Publishers, Subscribers | `application/`, `shared/` |
| **State** | `application/state/` | `State<S, C>` type + default source state | `application/`, lib |
| **Selectors** | `application/selectors/` | Pure transforms `source → computed` | `application/`, lib |
| **Reactions** | `application/reactions/` | Side effects on state changes | `application/`, lib |
| **Use Cases** | `application/use-cases/` | Business logic — one class per op | `application/`, lib |
| **API adapters** | `api/` | HTTP, DTOs, mappers, `Http*Repository` impls | `application/` |
| **Repositories** | `repository/` | Storage / in-memory / cache repos | `application/` |
| **Presenters** | `presentation/presenters/` | Format state for UI | `application/`, lib |
| **UI** | `ui/` | React components — render only | feature context (via `connect`) |
| **Config** | `config/` | DI wiring + Provider component | **everything** (this is the composition root) |
| **Contract** | `src/contract/` | Cross-feature event/channel TYPES — zero logic | nothing |

---

## 4. The dependency rule

> **Inner layers never import outer layers.** Everything flows toward `application/`.

The only place that imports from **every** layer is `config/<Feature>Context.ts`. Everywhere else, dependencies arrive through constructor injection.

### Forbidden imports

| In files under | Must NOT import from |
|---|---|
| `application/**` | `api/`, `repository/`, `ui/`, `config/`, `presentation/` |
| `api/**` | `ui/`, `config/`, `repository/`, `presentation/` |
| `repository/**` | `ui/`, `config/`, `api/` |
| `presentation/**` | `ui/`, `config/`, `api/`, `repository/` |
| `ui/**` | `api/`, `repository/` directly (everything arrives through `connect()` props) |
| `src/contract/**` | anywhere — types-only |

### Path aliases

Every app declares one root alias:

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@app/*": ["./src/*"]
    }
  }
}
```

**Rule:** never use relative imports across layer boundaries. Always go through the alias:

```ts
// ✅
import { TasksRepository } from '@app/tasks/application/ports/TasksRepository';

// ❌
import { TasksRepository } from '../../application/ports/TasksRepository';
```

### Optional — ESLint enforcement

```js
// eslint.config.js — feature-level
{
  files: ['src/**/application/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { group: ['*/api/*', '*/ui/*', '*/config/*', '*/repository/*', '*/presentation/*'],
          message: 'application/ must not import from outer layers' },
        { group: ['react', 'react-dom', 'mobx-react'],
          message: 'application/ is framework-free TypeScript' },
      ],
    }],
  },
}
```

---

## 5. Naming Cheat Sheet

| Concept | Convention | Example |
|---|---|---|
| **Interface (port)** | PascalCase noun, **no `I` prefix** | `TasksRepository`, `ChartPresenter`, `BatchUploadedPublisher` |
| **Implementation** | `<Tech><Interface>` | `HttpTasksRepository`, `LocalStorageTasksRepository`, `InMemoryTasksRepository` |
| **Use case** | `<Verb><Noun>UseCase` | `GetTasksUseCase`, `CompleteTaskUseCase`, `OpenTasksUseCase` |
| **Use case folder** | **Flat** in `application/use-cases/` | `use-cases/GetTasksUseCase.ts` — **not** `use-cases/get/GetTasksUseCase.ts` |
| **Selector** | `<Subject>Selector` | `ActiveTaskCountSelector`, `IsEmptySelector` |
| **Reaction** | `<Cause><Verb>Reaction` or `<Subject>Reaction` | `TasksFilterChangedReaction` |
| **Mapper** | `<Subject>Mapper` | `TaskMapper` |
| **Repository (port)** | `<Subject>Repository` | `TasksRepository`, `ChartColorsRepository` |
| **Repository (impl)** | `<Tech><Subject>Repository` | `HttpTasksRepository`, `LocalStorageTasksRepository` |
| **Presenter** | `<Subject>Presenter` | `TaskListPresenter`, `DueDatePresenter` |
| **State types** | `<Feature>SourceState`, `<Feature>ComputedState`, `<Feature>State` | `TasksSourceState`, `TasksComputedState`, `TasksState` |
| **Composition root** | `<Feature>Context.ts` (function) + `<Feature>Context` (type) | `createTasksContext()` returning `TasksContext` |
| **Composition config** | `<Feature>ContextConfig` | `TasksContextConfig` |
| **Provider component** | `<Feature>.tsx` | `Tasks.tsx` |
| **React component file** | PascalCase `.tsx` | `TasksContent.tsx` |
| **Component props type** | `Props<ComponentName>` | `PropsTasks`, `PropsTasksContent` |
| **Publisher port** | `<Event>Publisher` | `BatchUploadedPublisher` |
| **Subscriber port** | `<Event>Subscriber` | `BatchUploadedSubscriber` |
| **Path alias** | `@app/*` → `./src/*` | `@app/tasks/application/...` |
| **Class file** | PascalCase | `HttpTasksRepository.ts`, `GetTasksUseCase.ts` |
| **Non-class module** | camelCase | `connector.ts`, `defaultTasksSourceState.ts` |
| **Folder** | kebab-case | `use-cases/`, `api/repository/` |
| **Test file** | `<ClassName>.test.ts` | `GetTasksUseCase.test.ts` |

> **No `I` prefix.** Interfaces use plain PascalCase nouns. The implementation is what carries the tech prefix (`Http*`, `MobX*`, `LocalStorage*`, `InMemory*`). This mirrors the reactive lib's own design (`ReactiveView` interface ↔ `MobXReactiveView` impl).

---

## 6. TypeScript style rules

These rules shape how code is written across the entire app. They keep the layers honest and keep ESLint output focused on substance.

1. **No `let`.** If a variable needs reassignment, extract a private method that returns the final value via `const`, or use a ternary.
2. **No `any`.** Use `unknown` and narrow, or fix the type.
3. **No `as` type assertions** unless genuinely unavoidable. A typed mock library (`vitest-mock-extended`, `jest-mock-extended`, `ts-auto-mock`) accepts partial overrides without `as any`.
4. **No `*Helper`, `*Utils`, `*Manager`, or `*Service` names.** Place logic in a use case, selector, mapper, or presenter — pick the role that fits.
5. **Always braces on `if`/`else`** — never single-line `if (x) doThing();`.
6. **Blank line before `return`** unless it's the only statement in the block.
7. **Public methods before private methods** in a class.
8. **No arrow functions inside method bodies.** Extract as named `private` methods. (Trivial single-expression callbacks like `(x) => x.id` are fine inline.)
9. **Nullable types, `??`, and `as` are smell signals.** They usually mean the model can be improved. Reach for them only after considering whether the domain shape itself should change.
10. **Path aliases only** for cross-layer imports — never relative `../../`.
11. **Components contain no logic.** If a component has more than rendering + prop-passing, lift to a use case / selector / presenter.
12. **Props type name: `Props<ComponentName>`.** e.g. `PropsTasksContent`, `PropsTasks`. No `I` prefix, no trailing `Props`.
13. **Test mocks: never `any()` matchers or `as any`.** Use a typed mock library (`vitest-mock-extended`) and pass the exact expected argument. See [code-style.md §13](./code-style.md#13-test-mock-discipline--never-any-never-as-any).

---

## 7. Basic patterns at a glance

Shape-only versions of the common building blocks. For the full pattern with
edge cases, load the topic file referenced on each one.

### Port (interface, no `I` prefix) — see [application.md](./application.md#6-ports)

```ts
// application/ports/TasksRepository.ts
import { Task } from '@app/tasks/application/models/Task';

export interface TasksRepository {
    getTasks(workspaceId: string): Promise<Task[]>;
    completeTask(taskId: string): Promise<void>;
}
```

### HTTP adapter — see [adapters.md](./adapters.md#101-api--http)

```ts
// api/repository/HttpTasksRepository.ts
export class HttpTasksRepository implements TasksRepository {
    constructor(
        private readonly http: HttpClient,
        private readonly mapper: TaskMapper,
    ) {}

    async getTasks(workspaceId: string): Promise<Task[]> {
        const dto = await this.http.get<TaskDto[]>(`/workspaces/${workspaceId}/tasks`);

        return dto.map((d) => this.mapper.fromServer(d));
    }

    async completeTask(taskId: string): Promise<void> {
        await this.http.post(`/tasks/${taskId}/complete`, {});
    }
}
```

### Use case — see [application.md](./application.md#7-use-cases)

```ts
// application/use-cases/GetTasksUseCase.ts
import { ReactiveView } from 'clean-architecture-reactive';

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

### Reactive state — see [reactive.md](./reactive.md)

```ts
// application/state/TasksState.ts
import { State } from 'clean-architecture-reactive';

export interface TasksSourceState {
    tasks: Task[];
    filter: TaskFilter;
    isLoading: boolean;
}

export interface TasksComputedState {
    activeCount: number;
    visibleTasks: Task[];
}

export type TasksState = State<TasksSourceState, TasksComputedState>;
```

### DI factory shape — see [bootstrap.md](./bootstrap.md#step-7--composition-root)

```ts
// config/TasksContext.ts
import { MobXReactiveView } from 'clean-architecture-reactive';

export function createTasksContext(cfg: TasksContextConfig): TasksContext {
    const view = new MobXReactiveView<TasksState>(defaultTasksSourceState);
    const tasksRepository = new HttpTasksRepository(cfg.httpClient, new TaskMapper());
    const getTasksUseCase = new GetTasksUseCase(view, tasksRepository);

    view.register({
        activeCount: new ActiveTaskCountSelector(),
        visibleTasks: new VisibleTasksSelector(),
    });

    return { view, getTasksUseCase };
}
```

### Provider + connector — see [ui.md](./ui.md)

```tsx
// config/Tasks.tsx
export const Tasks: React.FC<PropsTasks> = ({ workspaceId }) => {
    const context = useMemo(() => createTasksContext({ workspaceId }), [workspaceId]);

    return <Provider value={context}><TasksContent /></Provider>;
};
```

---

## 8. Quick-Start Checklist

Bootstrapping a new feature module called `<feature>`:

1. **Folder skeleton** — see [bootstrap.md Step 1](./bootstrap.md#step-1--folder-skeleton).
2. **Domain models** in `application/models/` — see [application.md §5](./application.md#5-domain-models).
3. **Ports** in `application/ports/` (no `I` prefix) — see [application.md §6](./application.md#6-ports).
4. **State types** — `<Feature>SourceState.ts`, `<Feature>ComputedState.ts`, `<Feature>State.ts` — see [reactive.md](./reactive.md).
5. **Selectors** in `application/selectors/` — see [reactive.md §Selectors](./reactive.md#selectors).
6. **Use cases** — flat under `application/use-cases/`. See [application.md §7](./application.md#7-use-cases).
7. **HTTP / storage adapters** — see [adapters.md](./adapters.md).
8. **Presenters** — see [adapters.md §11](./adapters.md#11-presenters).
9. **Composition root** `config/<Feature>Context.ts` — plain function returning typed context. See [bootstrap.md Step 7](./bootstrap.md#step-7--composition-root).
10. **Connector** `ui/connect/connector.ts` — see [ui.md §16.1](./ui.md#161-the-connector).
11. **Provider component** `config/<Feature>.tsx` — see [ui.md §15](./ui.md#15-feature-provider).
12. **First UI component** `ui/content/<Feature>Content.tsx` — see [ui.md §16.2](./ui.md#162-components).
13. **Tests** in `test/<feature>/...` — see [testing.md](./testing.md).

For a single-file walk-through of all of this with concrete code, load
[bootstrap.md](./bootstrap.md).

---

## 9. License & contributions

This guide is published alongside the reactive primitives at
[`clean-architecture-reactive`](https://github.com/dcervonyj/clean-architecture-reactive).
The library is the **reference implementation** of the reactive layer this
guide describes; everything around it (use cases, adapters, DI, UI wiring) is
deliberately library-agnostic so you can swap MobX for another reactive
backend by implementing the `ReactiveView` interface against it.

Patterns here are derived from a production codebase running multiple
microfrontends in TypeScript + React + MobX. They have been validated across
dozens of features and a few years of evolution.
