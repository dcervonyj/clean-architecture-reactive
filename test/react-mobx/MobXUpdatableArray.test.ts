import { isAction, observable } from 'mobx';

import { MobXUpdatableArray } from '@reactive/react-mobx/MobXUpdatableArray';

describe('MobXUpdatableArray tests', () => {
    describe('removeFirst', () => {
        it('should be a mobx action', () => {
            const updatableArray = new MobXUpdatableArray(() => []);
            expect(isAction(updatableArray.removeFirst)).toBe(true);
        });

        it('should remove first element and return it', () => {
            //Given
            const array = observable([1, 2, 3]);
            const updatableArray = new MobXUpdatableArray(() => array);

            //When
            const actual = updatableArray.removeFirst();

            //Then
            expect(actual).toBe(1);
            expect(array).toEqual([2, 3]);
        });

        it('should return undefined if array is empty', () => {
            //Given
            const array = observable([]);
            const updatableArray = new MobXUpdatableArray(() => array);

            //When
            const actual = updatableArray.removeFirst();

            //Then
            expect(actual).toBeUndefined();
            expect(array).toEqual([]);
        });
    });

    describe('removeLast', () => {
        it('should be a mobx action', () => {
            const updatableArray = new MobXUpdatableArray(() => []);
            expect(isAction(updatableArray.removeLast)).toBe(true);
        });

        it('should remove last element and return it', () => {
            //Given
            const array = observable([1, 2, 3]);
            const updatableArray = new MobXUpdatableArray(() => array);

            //When
            const actual = updatableArray.removeLast();

            //Then
            expect(actual).toBe(3);
            expect(array).toEqual([1, 2]);
        });

        it('should return undefined if array is empty', () => {
            //Given
            const array = observable([]);
            const updatableArray = new MobXUpdatableArray(() => array);

            //When
            const actual = updatableArray.removeLast();

            //Then
            expect(actual).toBeUndefined();
            expect(array).toEqual([]);
        });
    });

    describe('add', () => {
        it('should be a mobx action', () => {
            const updatableArray = new MobXUpdatableArray(() => []);
            expect(isAction(updatableArray.add)).toBe(true);
        });

        it('should add value to the end of the array', () => {
            //Given
            const array = observable([1, 2]);
            const updatableArray = new MobXUpdatableArray(() => array);

            //When
            updatableArray.add(3);

            //Then
            expect(array).toEqual([1, 2, 3]);
        });

        it('should add value to the specified index', () => {
            //Given
            const array = observable([1, 2, 4]);
            const updatableArray = new MobXUpdatableArray(() => array);

            //When
            updatableArray.add(2, 3);

            //Then
            expect(array).toEqual([1, 2, 3, 4]);
        });
    });

    describe('addAll', () => {
        it('should be a mobx action', () => {
            const updatableArray = new MobXUpdatableArray(() => []);
            expect(isAction(updatableArray.addAll)).toBe(true);
        });

        it('should add all values to the end of the array', () => {
            //Given
            const array = observable([1, 2]);
            const updatableArray = new MobXUpdatableArray(() => array);

            //When
            updatableArray.addAll([3, 4]);

            //Then
            expect(array).toEqual([1, 2, 3, 4]);
        });

        it('should add all values to the specified index', () => {
            //Given
            const array = observable([1, 2, 5]);
            const updatableArray = new MobXUpdatableArray(() => array);

            //When
            updatableArray.addAll(2, [3, 4]);

            //Then
            expect(array).toEqual([1, 2, 3, 4, 5]);
        });
    });

    describe('remove', () => {
        it('should be a mobx action', () => {
            const updatableArray = new MobXUpdatableArray(() => []);
            expect(isAction(updatableArray.remove)).toBe(true);
        });

        it('should remove value from the array', () => {
            //Given
            const array = observable([1, 2, 3]);
            const updatableArray = new MobXUpdatableArray(() => array);

            //When
            const actual = updatableArray.remove(2);

            //Then
            expect(actual).toBe(true);
            expect(array).toEqual([1, 3]);
        });

        it('should return false if value is not in the array', () => {
            //Given
            const array = observable([1, 3]);
            const updatableArray = new MobXUpdatableArray(() => array);

            //When
            const actual = updatableArray.remove(2);

            //Then
            expect(actual).toBe(false);
            expect(array).toEqual([1, 3]);
        });
    });

    describe('removeAll', () => {
        it('should be a mobx action', () => {
            const updatableArray = new MobXUpdatableArray(() => []);
            expect(isAction(updatableArray.removeAll)).toBe(true);
        });

        it('should remove all values from the array', () => {
            //Given
            const array = observable([1, 2, 2, 3, 4, 4, 2, 4]);
            const updatableArray = new MobXUpdatableArray(() => array);

            //When
            const actual = updatableArray.removeAll([2, 4]);

            //Then
            expect(actual).toBe(true);
            expect(array).toEqual([1, 3]);
        });

        it('should return false if no values were removed', () => {
            //Given
            const array = observable([1, 3]);
            const updatableArray = new MobXUpdatableArray(() => array);

            //When
            const actual = updatableArray.removeAll([2, 4]);

            //Then
            expect(actual).toBe(false);
            expect(array).toEqual([1, 3]);
        });
    });

    describe('removeAllBy', () => {
        it('should be a mobx action', () => {
            const updatableArray = new MobXUpdatableArray(() => []);
            expect(isAction(updatableArray.removeAllBy)).toBe(true);
        });

        it('should remove all values that satisfy the predicate', () => {
            //Given
            const array = observable([1, 2, 3, 4, 5, 6]);
            const updatableArray = new MobXUpdatableArray(() => array);

            //When
            updatableArray.removeAllBy((value) => value % 2 === 0);

            //Then
            expect(array).toEqual([1, 3, 5]);
        });
    });

    describe('removeAt', () => {
        it('should be a mobx action', () => {
            const updatableArray = new MobXUpdatableArray(() => []);
            expect(isAction(updatableArray.removeAt)).toBe(true);
        });

        it('should remove value at the specified index', () => {
            //Given
            const array = observable([1, 2, 3]);
            const updatableArray = new MobXUpdatableArray(() => array);

            //When
            const actual = updatableArray.removeAt(1);

            //Then
            expect(actual).toBe(2);
            expect(array).toEqual([1, 3]);
        });

        it('should return undefined if index is out of bounds', () => {
            //Given
            const array = observable([1, 3]);
            const updatableArray = new MobXUpdatableArray(() => array);

            //When
            const actual = updatableArray.removeAt(2);

            //Then
            expect(actual).toBeUndefined();
            expect(array).toEqual([1, 3]);
        });
    });

    describe('set', () => {
        it('should be a mobx action', () => {
            const updatableArray = new MobXUpdatableArray(() => []);
            expect(isAction(updatableArray.set)).toBe(true);
        });

        it('should set value at the specified index', () => {
            //Given
            const array = observable([1, 2, 3]);
            const updatableArray = new MobXUpdatableArray(() => array);

            //When
            updatableArray.set(1, 4);

            //Then
            expect(array).toEqual([1, 4, 3]);
        });
    });

    describe('reverse', () => {
        it('should be a mobx action', () => {
            const updatableArray = new MobXUpdatableArray(() => []);
            expect(isAction(updatableArray.reverse)).toBe(true);
        });

        it('should reverse the array', () => {
            //Given
            const array = observable([1, 2, 3]);
            const updatableArray = new MobXUpdatableArray(() => array);

            //When
            updatableArray.reverse();

            //Then
            expect(array).toEqual([3, 2, 1]);
        });
    });

    describe('clear', () => {
        it('should be a mobx action', () => {
            const updatableArray = new MobXUpdatableArray(() => []);
            expect(isAction(updatableArray.clear)).toBe(true);
        });

        it('should clear the array', () => {
            //Given
            const array = observable([1, 2, 3]);
            const updatableArray = new MobXUpdatableArray(() => array);

            //When
            updatableArray.clear();

            //Then
            expect(array).toEqual([]);
        });
    });
});
