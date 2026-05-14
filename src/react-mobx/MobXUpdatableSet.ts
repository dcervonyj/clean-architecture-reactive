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
        for (const value of values) {
            this.add(value);
        }
    }

    remove(value: V): void {
        this.getSet().delete(value);
    }

    removeAll(values: Iterable<V>): void {
        for (const value of values) {
            this.remove(value);
        }
    }

    removeAllBy(cb: (value: V) => boolean): void {
        for (const value of this.getSet()) {
            if (cb(value)) {
                this.remove(value);
            }
        }
    }

    clear(): void {
        this.getSet().clear();
    }
}
