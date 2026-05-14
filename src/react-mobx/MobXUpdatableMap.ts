import { action, makeObservable } from 'mobx';

import { UpdatableMap } from '@reactive/base/UpdatableMap';

export class MobXUpdatableMap<K, V> implements UpdatableMap<K, V> {
    constructor(private getMap: () => Map<K, V>) {
        makeObservable(this, {
            set: action,
            setAll: action,
            remove: action,
            removeAll: action,
            removeAllBy: action,
            clear: action,
        });
    }

    set(key: K, value: V): void {
        this.getMap().set(key, value);
    }

    setAll(entries: Iterable<[K, V]>): void {
        for (const [key, value] of entries) {
            this.set(key, value);
        }
    }

    remove(key: K): void {
        this.getMap().delete(key);
    }

    removeAll(keys: Iterable<K>): void {
        for (const key of keys) {
            this.remove(key);
        }
    }

    removeAllBy(predicate: (key: K, value: V) => boolean): void {
        for (const [key, value] of this.getMap()) {
            if (predicate(key, value)) {
                this.remove(key);
            }
        }
    }

    clear(): void {
        this.getMap().clear();
    }
}
