# Testing strategy

> **Prerequisites:** [README.md](./README.md) for the layer model.
> [bootstrap.md](./bootstrap.md) shows the first use-case test in context.

This file covers what to test, where tests live, and how to write them.
The strategy follows directly from the architecture: layer-by-layer, each
layer has a different testability profile.

---

## 1. Where tests live

Tests mirror the `src/` tree exactly under `test/`:

```
src/tasks/application/use-cases/GetTasksUseCase.ts
test/tasks/application/use-cases/GetTasksUseCase.test.ts
```

The mirror keeps test-to-source navigation trivial and lets test tooling pick
up coverage by directory.

---

## 2. What to test

| Layer | Coverage expectation |
|---|---|
| `application/use-cases/` | **Full** — every public method, every branch. |
| `application/selectors/` | **Full** — each selector tested with representative source states. |
| `application/reactions/` | **Full** — assert the action runs only when the cause changes; assert it does **not** run on unrelated source mutations. |
| `api/mapper/` | **Full** — server fixture → domain fixture. Round-trip if mapping is bidirectional. |
| `api/repository/` | **Full** — verify URL, body, headers; verify the mapper is invoked. |
| `repository/` (non-HTTP) | **Full** — exercise the actual storage / cache behaviour. |
| `presentation/presenters/` | Recommended — formatting logic with edge cases (null, zero, negative, overflow). |
| `event-bus/` subscribers | **Full** — assert `onEvent` updates the view correctly. |
| `ui/` components | **Do NOT unit-test.** Covered by end-to-end tests (Playwright / Cypress). |

The line is drawn at the React boundary: anything that imports `react` is
e2e territory; everything else has a unit test.

---

## 3. Tooling

This guide takes no opinion on a specific runner. Pick what fits your repo:

- **Test runners:** [Vitest](https://vitest.dev) (recommended for new TypeScript projects), [Jest](https://jestjs.io), [uvu](https://github.com/lukeed/uvu) (smaller dependency footprint).
- **Typed mocks:** [`vitest-mock-extended`](https://www.npmjs.com/package/vitest-mock-extended), [`jest-mock-extended`](https://www.npmjs.com/package/jest-mock-extended), [`ts-auto-mock`](https://typescript-tdd.github.io/ts-auto-mock/) — pick whichever pairs with your runner. All of them generate typed mocks from interfaces so you never need `as any`.
- **Test doubles for the reactive view:** treat `ReactiveView<TState>` as a port and mock it (`mock<ReactiveView<TasksState>>()`). Assert on calls to `view.update(...)`. For tests that need real reactive behaviour, construct a `MobXReactiveView` instance and assert on `view.state` after dispatches.

### Discipline

- **Never use `as any` or `as unknown as T` to coerce mocks.** Typed mock libraries make this unnecessary. If you find yourself reaching for `as any`, your port shape is probably leaking implementation details.
- **Never use `any()` matchers** (`verify(mock.method(any())).called()` style). Always construct the exact expected argument and assert on equality. `any()` hides off-by-one bugs and lets the wrong shape pass.
- **One assertion focus per test.** A test that asserts both "the repo was called" and "the view was updated" is two tests glued together — split them.

---

## 4. Use case test template

```ts
// test/tasks/application/use-cases/GetTasksUseCase.test.ts
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { ReactiveView } from 'clean-architecture-reactive';

import { Task } from '@app/tasks/application/models/Task';
import { TasksRepository } from '@app/tasks/application/ports/TasksRepository';
import { TasksState } from '@app/tasks/application/state/TasksState';
import { GetTasksUseCase } from '@app/tasks/application/use-cases/GetTasksUseCase';

describe('GetTasksUseCase', () => {
    const WORKSPACE_ID = 'ws_1';
    const TASKS: Task[] = [
        { id: 't1', title: 'First', status: { type: 'open' }, dueDate: null },
    ];

    it('writes loading flag, fetches, writes tasks, clears loading flag', async () => {
        const view = mock<ReactiveView<TasksState>>();
        const repo = mock<TasksRepository>();
        repo.getTasks.mockResolvedValue(TASKS);

        const useCase = new GetTasksUseCase(view, repo);
        await useCase.execute(WORKSPACE_ID);

        expect(repo.getTasks).toHaveBeenCalledWith(WORKSPACE_ID);
        expect(view.update).toHaveBeenNthCalledWith(1, { isLoading: true });
        expect(view.update).toHaveBeenNthCalledWith(2, { tasks: TASKS });
        expect(view.update).toHaveBeenNthCalledWith(3, { isLoading: false });
    });

    it('clears the loading flag even when the repository rejects', async () => {
        const view = mock<ReactiveView<TasksState>>();
        const repo = mock<TasksRepository>();
        repo.getTasks.mockRejectedValue(new Error('boom'));

        const useCase = new GetTasksUseCase(view, repo);
        await expect(useCase.execute(WORKSPACE_ID)).rejects.toThrow('boom');

        expect(view.update).toHaveBeenLastCalledWith({ isLoading: false });
    });
});
```

Notes:
- Mock the **view** and the **repository**. Don't construct a real reactive view unless the test depends on computed state.
- Assert on the **calls** to `view.update`, not on `view.state` (which a mock doesn't have meaningful state).
- Cover both the happy path and the failure path.

---

## 5. Selector test template

```ts
// test/tasks/application/selectors/VisibleTasksSelector.test.ts
import { describe, expect, it } from 'vitest';

import { Task } from '@app/tasks/application/models/Task';
import { VisibleTasksSelector } from '@app/tasks/application/selectors/VisibleTasksSelector';
import { TasksState } from '@app/tasks/application/state/TasksState';

describe('VisibleTasksSelector', () => {
    const OPEN: Task = { id: 't1', title: 'Open', status: { type: 'open' }, dueDate: null };
    const DONE: Task = { id: 't2', title: 'Done', status: { type: 'done', completedAt: '2026-01-01' }, dueDate: null };

    const makeState = (filter: TasksState['filter']): TasksState => ({
        workspaceId: 'ws_1',
        tasks: [OPEN, DONE],
        filter,
        isLoading: false,
        // computed slots — not read by this selector, so default-initialised
        visibleTasks: [],
        isEmpty: false,
    });

    it('returns all tasks when filter is "all"', () => {
        const result = new VisibleTasksSelector().select(makeState('all'));
        expect(result).toEqual([OPEN, DONE]);
    });

    it('returns only open tasks when filter is "active"', () => {
        const result = new VisibleTasksSelector().select(makeState('active'));
        expect(result).toEqual([OPEN]);
    });

    it('returns only done tasks when filter is "completed"', () => {
        const result = new VisibleTasksSelector().select(makeState('completed'));
        expect(result).toEqual([DONE]);
    });
});
```

Selectors are pure — no mocks needed, just feed in state and assert the output.

---

## 6. Reaction test template

```ts
// test/tasks/application/reactions/WorkspaceChangedReaction.test.ts
import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { GetTasksUseCase } from '@app/tasks/application/use-cases/GetTasksUseCase';
import { TasksState } from '@app/tasks/application/state/TasksState';
import { WorkspaceChangedReaction } from '@app/tasks/application/reactions/WorkspaceChangedReaction';

describe('WorkspaceChangedReaction', () => {
    const state = (workspaceId: string | null): TasksState => ({
        workspaceId, tasks: [], filter: 'all', isLoading: false,
        visibleTasks: [], isEmpty: true,
    });

    it('extracts workspaceId as the cause', () => {
        const reaction = new WorkspaceChangedReaction(mock<GetTasksUseCase>());
        expect(reaction.extractReactionCause(state('ws_1'))).toBe('ws_1');
    });

    it('fetches tasks when workspaceId changes to a non-null value', () => {
        const getTasks = mock<GetTasksUseCase>();
        getTasks.execute.mockResolvedValue(undefined);

        new WorkspaceChangedReaction(getTasks).action('ws_2', 'ws_1');

        expect(getTasks.execute).toHaveBeenCalledWith('ws_2');
    });

    it('does nothing when current equals previous', () => {
        const getTasks = mock<GetTasksUseCase>();
        new WorkspaceChangedReaction(getTasks).action('ws_1', 'ws_1');
        expect(getTasks.execute).not.toHaveBeenCalled();
    });

    it('does nothing when current is null', () => {
        const getTasks = mock<GetTasksUseCase>();
        new WorkspaceChangedReaction(getTasks).action(null, 'ws_1');
        expect(getTasks.execute).not.toHaveBeenCalled();
    });
});
```

Reactions split naturally into two tests: one for `extractReactionCause`, several for `action(curr, prev)` covering each branch.

---

## 7. Mapper test template

```ts
// test/tasks/api/mapper/TaskMapper.test.ts
import { describe, expect, it } from 'vitest';

import { TaskDto } from '@app/tasks/api/models/TaskDto';
import { TaskMapper } from '@app/tasks/api/mapper/TaskMapper';

describe('TaskMapper.fromServer', () => {
    const mapper = new TaskMapper();

    it('maps an open task', () => {
        const dto: TaskDto = {
            id: 't1', title: 'Buy milk',
            status: 'open', completed_at: null, due_date: '2026-05-20',
        };
        expect(mapper.fromServer(dto)).toEqual({
            id: 't1', title: 'Buy milk',
            status: { type: 'open' }, dueDate: '2026-05-20',
        });
    });

    it('maps a done task with completedAt', () => {
        const dto: TaskDto = {
            id: 't2', title: 'Ship feature',
            status: 'done', completed_at: '2026-05-13T10:00:00Z', due_date: null,
        };
        expect(mapper.fromServer(dto)).toEqual({
            id: 't2', title: 'Ship feature',
            status: { type: 'done', completedAt: '2026-05-13T10:00:00Z' },
            dueDate: null,
        });
    });
});
```

Mappers are pure. Fixtures in, domain models out, no mocks.

---

## 8. Repository (HTTP) test template

```ts
// test/tasks/api/repository/HttpTasksRepository.test.ts
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { HttpClient } from '@app/shared/ports/HttpClient';

import { TaskMapper } from '@app/tasks/api/mapper/TaskMapper';
import { TaskDto } from '@app/tasks/api/models/TaskDto';
import { HttpTasksRepository } from '@app/tasks/api/repository/HttpTasksRepository';

describe('HttpTasksRepository.getTasks', () => {
    it('GETs the workspace tasks endpoint and maps the result', async () => {
        const dto: TaskDto[] = [{
            id: 't1', title: 'First', status: 'open', completed_at: null, due_date: null,
        }];
        const http = mock<HttpClient>();
        http.get.mockResolvedValue(dto);
        const mapper = new TaskMapper();

        const result = await new HttpTasksRepository(http, mapper).getTasks('ws_1');

        expect(http.get).toHaveBeenCalledWith('/workspaces/ws_1/tasks');
        expect(result[0].id).toBe('t1');
    });
});
```

For HTTP repos, verify URL/method/body and verify the mapper is called. Don't
mock the mapper unless its construction is heavy — let the real mapper run so
the test also exercises the mapping contract.

---

## 9. What not to test

- **React components** — covered by e2e.
- **The connector** — its body is ~20 lines of pass-through; trust React's tests.
- **The composition root** — testing `createTasksContext` mostly verifies that constructors don't throw. Skip it; the first integration test (or the app itself starting up) does the same job.
- **Library code** — the reactive primitives ship with their own tests. Don't re-test `MobXReactiveView`'s reactivity in your codebase.
- **Type declarations** — TypeScript's checker covers them.

---

## 10. Coverage targets

These are pragmatic defaults, not gospel:

| Layer | Target |
|---|---|
| `application/` | **≥ 95% line, ≥ 90% branch** |
| `api/` + `repository/` | **≥ 90% line** |
| `presentation/presenters/` | ≥ 80% line |
| `ui/` | not measured (e2e instead) |

If a use case has a branch that's hard to test (e.g., an unreachable error path the type system can't narrow), prefer refactoring the use case shape to eliminate the branch rather than chasing the coverage number with a contrived test.
