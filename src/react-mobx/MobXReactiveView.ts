import { cloneDeepWith, forEach, isArray, isMap, isSet } from 'lodash-es';
import {
    action,
    autorun,
    isObservableArray,
    isObservableMap,
    isObservableSet,
    makeObservable,
    observable,
    reaction,
    runInAction,
} from 'mobx';
import { PartialDeep } from 'type-fest';

import { UpdatableArray } from '@reactive/base/UpdatableArray';
import { UpdatableMap } from '@reactive/base/UpdatableMap';
import { UpdatableSet } from '@reactive/base/UpdatableSet';
import { MobXUpdatableArray } from '@reactive/react-mobx/MobXUpdatableArray';
import { MobXUpdatableMap } from '@reactive/react-mobx/MobXUpdatableMap';
import { MobXUpdatableSet } from '@reactive/react-mobx/MobXUpdatableSet';

import { mergeState } from './mergeState';
import { Reaction } from '../base/Reaction';
import { ReactiveView } from '../base/ReactiveView';
import { Selectors } from '../base/Selectors';
import { ComputedOf, SourceOf, State } from '../base/State';

export class MobXReactiveView<FullState extends State<object, object>> implements ReactiveView<FullState> {
    private reactionDisposers = new WeakMap<Reaction<FullState, any>, () => void>();
    private selectorDisposers: Array<() => void> = [];

    readonly state: FullState;

    constructor(defaultSourceState: Required<SourceOf<FullState>>) {
        this.state = observable(defaultSourceState) as unknown as FullState;
        makeObservable(this, {
            update: action,
        });
    }

    register(selectors: Selectors<FullState>, reactions: Reaction<FullState, any>[] = []): void {
        this.registerSelectors(selectors);
        this.registerReactions(reactions);
    }

    registerReactions(reactions: Reaction<FullState, any>[]): void {
        reactions.forEach((it) => {
            if (this.reactionDisposers.has(it)) {
                return;
            }

            const disposer = reaction(
                () => this.cloneDeep(it.extractReactionCause(this.state)),
                (value, prev) => it.action(value, prev),
                { fireImmediately: true },
            );

            this.reactionDisposers.set(it, disposer);
        });
    }

    deregisterReactions(reactions: Reaction<FullState, any>[]): void {
        reactions.forEach((r) => this.reactionDisposers.get(r)?.());
    }

    update(toUpdate: object & PartialDeep<SourceOf<FullState>>): void {
        mergeState(this.state, toUpdate, {});
    }

    getUpdatableCollection<V>(cb: (state: SourceOf<FullState>) => V[]): UpdatableArray<V>;
    getUpdatableCollection<V>(cb: (state: SourceOf<FullState>) => Set<V>): UpdatableSet<V>;
    getUpdatableCollection<K, V>(cb: (state: SourceOf<FullState>) => Map<K, V>): UpdatableMap<K, V>;
    getUpdatableCollection(cb: (state: SourceOf<FullState>) => any): unknown {
        const valueGetter = () => cb(this.state);
        const value = valueGetter();

        if (isObservableArray(value)) {
            return new MobXUpdatableArray(valueGetter);
        }

        if (isObservableSet(value)) {
            return new MobXUpdatableSet(valueGetter);
        }

        if (isObservableMap(value)) {
            return new MobXUpdatableMap(valueGetter);
        }

        if (isArray(value)) {
            throw new Error('Expected observable Array, but got plain array');
        }

        if (isSet(value)) {
            throw new Error('Expected observable Set, but got plain set');
        }

        if (isMap(value)) {
            throw new Error('Expected observable Map, but got plain map');
        }

        throw new Error('Unsupported collection type');
    }

    deregisterSelectors(): void {
        this.selectorDisposers.forEach((d) => d());
        this.selectorDisposers = [];
    }

    private registerSelectors(selectors: Selectors<FullState>): void {
        forEach(selectors, (selector, name) => {
            let prevComputed: ComputedOf<FullState>[keyof ComputedOf<FullState>] | undefined;

            const disposer = autorun(() => {
                const computedPart = selector.select(this.state);

                runInAction(() => {
                    mergeState(this.state, { [name]: computedPart }, prevComputed ? { [name]: prevComputed } : {});
                });

                prevComputed = computedPart;
            });

            this.selectorDisposers.push(disposer);
        });
    }

    private cloneDeep<T>(value: T): T {
        if (value === null || typeof value !== 'object') {
            return value;
        }

        return cloneDeepWith(value, (val) => {
            if (isObservableMap(val)) {
                return new Map(val);
            }
            if (isObservableSet(val)) {
                return new Set(val);
            }

            return undefined;
        });
    }
}
