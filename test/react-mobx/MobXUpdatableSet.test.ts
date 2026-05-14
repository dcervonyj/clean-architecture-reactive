import { isAction, observable, ObservableSet } from 'mobx';

import { MobXUpdatableSet } from '@reactive/react-mobx/MobXUpdatableSet';

describe('MobXUpdatableSet tests', () => {
    describe('add', () => {
        it('should be a mobx action', () => {
            const updatableSet = new MobXUpdatableSet(() => new Set());
            expect(isAction(updatableSet.add)).toBe(true);
        });

        it('should add value to the set', () => {
            //Given
            const set = observable(new Set([1, 2]));
            const updatableSet = new MobXUpdatableSet(() => set);

            //When
            updatableSet.add(3);

            //Then
            expect(set).toEqual(new ObservableSet([1, 2, 3]));
        });
    });

    describe('addAll', () => {
        it('should be a mobx action', () => {
            const updatableSet = new MobXUpdatableSet(() => new Set());
            expect(isAction(updatableSet.addAll)).toBe(true);
        });

        it('should add all values to the set', () => {
            //Given
            const set = observable(new Set([1, 2]));
            const updatableSet = new MobXUpdatableSet(() => set);

            //When
            updatableSet.addAll([3, 4]);

            //Then
            expect(set).toEqual(new ObservableSet([1, 2, 3, 4]));
        });
    });

    describe('remove', () => {
        it('should be a mobx action', () => {
            const updatableSet = new MobXUpdatableSet(() => new Set());
            expect(isAction(updatableSet.remove)).toBe(true);
        });

        it('should remove value from the set', () => {
            //Given
            const set = observable(new Set([1, 2]));
            const updatableSet = new MobXUpdatableSet(() => set);

            //When
            updatableSet.remove(1);

            //Then
            expect(set).toEqual(new ObservableSet([2]));
        });
    });

    describe('removeAll', () => {
        it('should be a mobx action', () => {
            const updatableSet = new MobXUpdatableSet(() => new Set());
            expect(isAction(updatableSet.removeAll)).toBe(true);
        });

        it('should remove all values from the set', () => {
            //Given
            const set = observable(new Set([1, 2, 3, 4]));
            const updatableSet = new MobXUpdatableSet(() => set);

            //When
            updatableSet.removeAll([1, 2]);

            //Then
            expect(set).toEqual(new ObservableSet([3, 4]));
        });
    });

    describe('removeAllBy', () => {
        it('should be a mobx action', () => {
            const updatableSet = new MobXUpdatableSet(() => new Set());
            expect(isAction(updatableSet.removeAllBy)).toBe(true);
        });

        it('should remove all values from the set by predicate', () => {
            //Given
            const set = observable(new Set([1, 2, 3, 4, 5, 6]));
            const updatableSet = new MobXUpdatableSet(() => set);

            //When
            updatableSet.removeAllBy((value) => value % 2 === 0);

            //Then
            expect(set).toEqual(new ObservableSet([1, 3, 5]));
        });
    });

    describe('clear', () => {
        it('should be a mobx action', () => {
            const updatableSet = new MobXUpdatableSet(() => new Set());
            expect(isAction(updatableSet.clear)).toBe(true);
        });

        it('should clear the set', () => {
            //Given
            const set = observable(new Set([1, 2, 3]));
            const updatableSet = new MobXUpdatableSet(() => set);

            //When
            updatableSet.clear();

            //Then
            expect(set).toEqual(new ObservableSet());
        });
    });
});
