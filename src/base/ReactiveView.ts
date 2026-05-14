import { PartialDeep } from 'type-fest';

import { Reaction } from './Reaction';
import { Selectors } from './Selectors';
import { SourceOf, State } from './State';
import { UpdatableArray } from './UpdatableArray';
import { UpdatableMap } from './UpdatableMap';
import { UpdatableSet } from './UpdatableSet';

export interface ReactiveView<FullState extends State<object, object>> {
    get state(): FullState;

    /**
     * Updates the state partially with the provided object.
     * This method works great when you want to update primitive values or objects.
     * However, if you want to update collections like *Arrays*,
     * *Sets*, or *Maps*, you may want to use `getUpdatableCollection` method,
     * because this method will override the whole collection with the provided one.
     *
     * @example
     *
     * ```ts
     * interface MyState {
     *   a: number;
     *   b: string;
     *   c: {
     *    d: boolean;
     *    e: string;
     *   }
     * }
     *
     * const view: ReactiveView<State<MyState, {}>> = ...;
     *
     * view.update({ a: 1, c: { d: true } });
     * ```
     * */
    update(toUpdate: object & PartialDeep<SourceOf<FullState>>): void;

    /**
     * Returns an `UpdatableArray` that can be used to modify the state.
     * It is recommended to use this method when you want to update an array in the state without completely overriding it with `view.update`.
     *
     * Takes callback that returns an `Array` from state to be updated.
     *
     * @example
     *
     * ```ts
     * interface MyState {
     *  a: number[];
     * }
     *
     * const view: ReactiveView<State<MyState, {}>> = ...;
     *
     * view.getUpdatableCollection((state) => state.a).addAll(1, 2, 3, 4);
     * ```
     * */
    getUpdatableCollection<V>(cb: (state: SourceOf<FullState>) => V[]): UpdatableArray<V>;
    /**
     * Returns an `UpdatableSet` that can be used to modify the state.
     * It is recommended to use this method when you want to update a set in the state without completely overriding it with `view.update`.
     *
     * Takes callback that returns a `Set` from state to be updated.
     *
     * @example
     *
     * ```ts
     * interface MyState {
     *  a: Set<number>;
     * }
     *
     * const view: ReactiveView<State<MyState, {}>> = ...;
     *
     * view.getUpdatableCollection((state) => state.a).addAll(1, 2, 3, 4);
     * ```
     * */
    getUpdatableCollection<V>(cb: (state: SourceOf<FullState>) => Set<V>): UpdatableSet<V>;

    /**
     * Returns an `UpdatableMap` that can be used to modify the state.
     * It is recommended to use this method when you want to update a map in the state without completely overriding it with `view.update`.
     *
     * Takes callback that returns a `Map` from state to be updated.
     *
     * @example
     *
     * ```ts
     * interface MyState {
     *  a: Map<string, number>;
     * }
     *
     * const view: ReactiveView<State<MyState, {}>> = ...;
     *
     * view.getUpdatableCollection((state) => state.a).setAll([['b', 3], ['c', 4]]);
     * ```
     * */
    getUpdatableCollection<K, V>(cb: (state: SourceOf<FullState>) => Map<K, V>): UpdatableMap<K, V>;

    register(selectors: Selectors<FullState>): void;
    register(selectors: Selectors<FullState>, reactions: Reaction<FullState, any>[]): void;

    registerReactions(reactions: Reaction<FullState, any>[]): void;
    deregisterReactions(reactions: Reaction<FullState, any>[]): void;

    deregisterSelectors(): void;
}
