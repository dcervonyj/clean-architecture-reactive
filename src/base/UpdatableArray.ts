export interface UpdatableArray<V> {
    /**
     * Removes the first element from the array and returns it.
     * If the array is empty, undefined is returned.
     *
     * @example
     *
     * ```ts
     * const array = [1, 2, 3];
     * const first = array.removeFirst();
     * console.log(first); // 1
     * console.log(array); // [2, 3]
     * ```
     */
    removeFirst(): V | undefined;

    /**
     * Removes the last element from the array and returns it.
     * If the array is empty, undefined is returned.
     *
     * @example
     *
     * ```ts
     * const array = [1, 2, 3];
     * const last = array.removeLast();
     * console.log(last); // 3
     * console.log(array); // [1, 2]
     * ```
     */
    removeLast(): V | undefined;

    /**
     * Adds a value to the end of the array.
     *
     * @example
     *
     * ```ts
     * const array = [1, 2, 3];
     * array.add(4);
     * console.log(array); // [1, 2, 3, 4]
     * ```
     */
    add(value: V): void;

    /**
     * Adds a value to the array at the specified index.
     *
     * @example
     *
     * ```ts
     * const array = [1, 2, 3];
     * array.add(1, 4);
     * console.log(array); // [1, 4, 2, 3]
     * ```
     */
    add(index: number, value: V): void;

    /**
     * Adds multiple values to the end of the array.
     *
     * @example
     *
     * ```ts
     * const array = [1, 2, 3];
     * array.addAll([4, 5]);
     * console.log(array); // [1, 2, 3, 4, 5]
     * ```
     */
    addAll(values: Iterable<V>): void;

    /**
     * Adds multiple values to the array at the specified index.
     *
     * @example
     *
     * ```ts
     * const array = [1, 2, 3];
     * array.addAll(1, [4, 5]);
     * console.log(array); // [1, 4, 5, 2, 3]
     * ```
     */
    addAll(index: number, values: Iterable<V>): void;

    /**
     * Removes the first occurrence of a value from the array.
     * Returns true if the value was removed, false otherwise.
     *
     * @example
     *
     * ```ts
     * const array = [1, 2, 3];
     * const removed = array.remove(2);
     * console.log(removed); // true
     * console.log(array); // [1, 3]
     * ```
     */
    remove(value: V): boolean;

    /**
     * Removes all occurrences of the specified values from the array.
     *
     * @example
     *
     * ```ts
     * const array = [1, 2, 2, 3, 3, 2, 3];
     * array.removeAll([2, 3]);
     * console.log(array); // [1]
     * ```
     */
    removeAll(values: Iterable<V>): boolean;

    /**
     * Iterates over the array and removes all values that satisfy the predicate.
     *
     * Note: The iteration is done in reverse order to avoid skipping elements.
     *
     * @example
     *
     * ```ts
     * const array = [1, 2, 3, 4, 5, 6];
     * array.removeAllBy((value) => value % 2 === 0);
     * console.log(array); // [1, 3, 5]
     * ```
     */
    removeAllBy(predicate: (value: V, index: number) => boolean): void;

    /**
     * Removes the value at the specified index from the array and returns it.
     * If the index is out of bounds, undefined is returned.
     *
     * @example
     *
     * ```ts
     * const array = [1, 2, 3];
     * const removed = array.removeAt(1);
     * console.log(removed); // 2
     * console.log(array); // [1, 3]
     * ```
     */
    removeAt(index: number): V | undefined;

    /**
     * Sets the value at the specified index in the array.
     *
     * @example
     *
     * ```ts
     * const array = [1, 2, 3];
     * array.set(1, 4);
     * console.log(array); // [1, 4, 3]
     * ```
     */
    set(index: number, value: V): void;

    /**
     * Reverses the order of the elements in the array.
     *
     * @example
     *
     * ```ts
     * const array = [1, 2, 3];
     * array.reverse();
     * console.log(array); // [3, 2, 1]
     * ```
     */
    reverse(): void;

    /**
     * Clears the array.
     *
     * @example
     *
     * ```ts
     * const array = [1, 2, 3];
     * array.clear();
     * console.log(array); // []
     * ```
     */
    clear(): void;
}
