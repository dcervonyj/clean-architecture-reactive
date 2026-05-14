export interface UpdatableSet<V> {
    /**
     * Adds a value to the set.
     *
     * @example
     *
     * ```ts
     * const set = new Set([1, 2, 3]);
     * set.add(4);
     * console.log(set); // Set { 1, 2, 3, 4 }
     * ```
     * */
    add(value: V): void;

    /**
     * Adds multiple values to the set.
     *
     * @example
     *
     * ```ts
     * const set = new Set([1, 2, 3]);
     * set.addAll([4, 5]);
     * console.log(set); // Set { 1, 2, 3, 4, 5 }
     * ```
     * */
    addAll(values: Iterable<V>): void;

    /**
     * Removes a value from the set.
     *
     * @example
     *
     * ```ts
     * const set = new Set([1, 2, 3]);
     * set.remove(2);
     * console.log(set); // Set { 1, 3 }
     * ```
     * */
    remove(value: V): void;

    /**
     * Removes all values from the set.
     *
     * @example
     *
     * ```ts
     * const set = new Set([1, 2, 3]);
     * set.removeAll([2, 3]);
     * console.log(set); // Set { 1 }
     * ```
     * */
    removeAll(values: Iterable<V>): void;

    /**
     * Removes all values from the set that satisfy the provided predicate.
     *
     * @example
     *
     * ```ts
     * const set = new Set([1, 2, 3, 4, 5, 6]);
     * set.removeAllBy((value) => value % 2 === 0);
     * console.log(set); // Set { 1, 3, 5 }
     * ```
     * */
    removeAllBy(cb: (value: V) => boolean): void;

    /**
     * Removes all values from the set.
     *
     * @example
     *
     * ```ts
     * const set = new Set([1, 2, 3]);
     * set.clear();
     * console.log(set); // Set {}
     * ```
     * */
    clear(): void;
}
