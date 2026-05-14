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
        const map = this.getMap();

        for (const [key, value] of entries) {
            map.set(key, value);
        }
    }

    remove(key: K): void {
        this.getMap().delete(key);
    }

    removeAll(keys: Iterable<K>): void {
        const map = this.getMap();

        for (const key of keys) {
            map.delete(key);
        }
    }

    removeAllBy(predicate: (key: K, value: V) => boolean): void {
        const map = this.getMap();

        for (const [key, value] of map) {
            if (predicate(key, value)) {
                map.delete(key);
            }
        }
    }

    clear(): void {
        this.getMap().clear();
    }
}
