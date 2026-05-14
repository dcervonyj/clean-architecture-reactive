import { action, makeObservable } from 'mobx';

import { UpdatableArray } from '@reactive/base/UpdatableArray';

export class MobXUpdatableArray<V> implements UpdatableArray<V> {
    constructor(private getArray: () => V[]) {
        makeObservable(this, {
            removeFirst: action,
            removeLast: action,
            add: action,
            addAll: action,
            remove: action,
            removeAll: action,
            removeAllBy: action,
            removeAt: action,
            set: action,
            reverse: action,
            clear: action,
        });
    }

    removeFirst(): V | undefined {
        return this.getArray().shift();
    }

    removeLast(): V | undefined {
        return this.getArray().pop();
    }

    add(value: V): void;
    add(index: number, value: V): void;
    add(...args: any[]): void {
        if (args.length === 1) {
            this.getArray().push(args[0]);
        } else {
            this.getArray().splice(args[0], 0, args[1]);
        }
    }

    addAll(values: Iterable<V>): void;
    addAll(index: number, values: Iterable<V>): void;
    addAll(...args: any[]): void {
        if (args.length === 1) {
            this.getArray().push(...args[0]);
        } else {
            this.getArray().splice(args[0], 0, ...args[1]);
        }
    }

    remove(value: V): boolean {
        const index = this.getArray().indexOf(value);

        if (index === -1) {
            return false;
        }

        this.getArray().splice(index, 1);

        return true;
    }

    removeAll(values: Iterable<V>): boolean {
        let isSomethingRemoved = false;

        for (const value of values) {
            while (this.remove(value)) {
                isSomethingRemoved = true;
            }
        }

        return isSomethingRemoved;
    }

    removeAllBy(predicate: (value: V, index: number) => boolean): void {
        const array = this.getArray();

        for (let i = array.length - 1; i >= 0; i--) {
            if (predicate(array[i], i)) {
                array.splice(i, 1);
            }
        }
    }

    removeAt(index: number): V | undefined {
        return this.getArray().splice(index, 1)[0];
    }

    set(index: number, value: V): void {
        this.getArray()[index] = value;
    }

    reverse(): void {
        //There is some bug in mobx when using array.reverse() directly, it's not updating the observable array
        const array = this.getArray();

        let left = 0;
        let right = array.length - 1;

        while (left < right) {
            const temp = array[left];
            array[left] = array[right];
            array[right] = temp;

            left++;
            right--;
        }
    }

    clear(): void {
        this.getArray().splice(0, this.getArray().length);
    }
}
