export interface UpdatableMap<K, V> {
    /**
     * Sets a value for a key in the map.
     *
     * @example
     *
     * ```ts
     * const map = new Map([['a', 1], ['b', 2]]);
     * map.set('c', 3);
     * console.log(map); // Map { 'a' => 1, 'b' => 2, 'c' => 3 }
     * ```
     * */
    set(key: K, value: V): void;

    /**
     * Sets multiple values for keys in the map.
     *
     * @example
     *
     * ```ts
     * const map = new Map([['a', 1], ['b', 2]]);
     * map.setAll([['b', 3], ['c', 4]]);
     * console.log(map); // Map { 'a' => 1, 'b' => 3, 'c' => 4 }
     * ```
     * */
    setAll(entries: Iterable<[K, V]>): void;

    /**
     * Removes a value from the map by key.
     *
     * @example
     *
     * ```ts
     * const map = new Map([['a', 1], ['b', 2]]);
     * map.remove('b');
     * console.log(map); // Map { 'a' => 1 }
     * ```
     * */
    remove(key: K): void;

    /**
     * Removes multiple values from the map by keys.
     *
     * @example
     *
     * ```ts
     * const map = new Map([['a', 1], ['b', 2], ['c', 3]]);
     * map.removeAll(['a', 'b']);
     * console.log(map); // Map { 'c' => 3 }
     * ```
     * */
    removeAll(keys: Iterable<K>): void;

    /**
     * Removes all values from the map that satisfy the provided predicate.
     *
     * @example
     *
     * ```ts
     * const map = new Map([['a', 1], ['b', 2], ['c', 3]]);
     * map.removeAllBy((key, value) => value > 1);
     * console.log(map); // Map { 'a' => 1 }
     * ```
     * */
    removeAllBy(predicate: (key: K, value: V) => boolean): void;

    /**
     * Removes all values from the map.
     *
     * @example
     *
     * ```ts
     * const map = new Map([['a', 1], ['b', 2]]);
     * map.clear();
     * console.log(map); // Map {}
     * ```
     * */
    clear(): void;
}
