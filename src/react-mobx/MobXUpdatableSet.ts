import { action, makeObservable } from 'mobx';

import { UpdatableSet } from '@reactive/base/UpdatableSet';

export class MobXUpdatableSet<V> implements UpdatableSet<V> {
    constructor(private getSet: () => Set<V>) {
        makeObservable(this, {
            add: action,
            addAll: action,
            remove: action,
            removeAll: action,
            removeAllBy: action,
            clear: action,
        });
    }

    add(value: V): void {
        this.getSet().add(value);
    }

    addAll(values: Iterable<V>): void {
        const set = this.getSet();

        for (const value of values) {
            set.add(value);
        }
    }

    remove(value: V): void {
        this.getSet().delete(value);
    }

    removeAll(values: Iterable<V>): void {
        const set = this.getSet();

        for (const value of values) {
            set.delete(value);
        }
    }

    removeAllBy(predicate: (value: V) => boolean): void {
        const set = this.getSet();

        for (const value of set) {
            if (predicate(value)) {
                set.delete(value);
            }
        }
    }

    clear(): void {
        this.getSet().clear();
    }
}
