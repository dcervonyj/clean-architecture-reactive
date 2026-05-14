# clean-architecture-reactive

A type-safe reactive state management abstraction layer built on React + MobX, following clean architecture principles.

## Features

- **Framework-agnostic base interfaces** — define your state shape without coupling to MobX or React
- **MobX implementation layer** — observable state, computed selectors, and side-effect reactions out of the box
- **Type-safe collection management** — `UpdatableArray`, `UpdatableMap`, `UpdatableSet` for in-place mutations
- **React integration** — Context Provider + HOC connect pattern via `MobXReactiveConnector`

## Install

```bash
npm install clean-architecture-reactive
# peer dependencies
npm install mobx mobx-react react
```

## Quick Start

```ts
import { MobXReactiveView } from 'clean-architecture-reactive';

type SourceState = { count: number; name: string };
type ComputedState = { label: string };

const view = new MobXReactiveView<State<SourceState, ComputedState>>(
    { count: 0, name: 'world' },
    {
        label: (s) => `${s.name}: ${s.count}`,
    },
);

view.update({ count: 1 });
console.log(view.state.label); // "world: 1"
```

## Architecture

```
src/
├── base/          # Framework-agnostic interfaces (State, ReactiveView, Selectors, Reactions, …)
└── react-mobx/    # MobX + React implementation
```

The `base/` layer has zero dependencies on MobX or React. The `react-mobx/` layer implements the interfaces using MobX observables and `mobx-react`.

## License

MIT
