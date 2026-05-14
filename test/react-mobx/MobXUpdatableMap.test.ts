import { isAction, observable, ObservableMap } from 'mobx';

import { MobXUpdatableMap } from '@reactive/react-mobx/MobXUpdatableMap';

describe('MobXUpdatableMap tests', () => {
    describe('set', () => {
        it('should be a mobx action', () => {
            const updatableMap = new MobXUpdatableMap(() => new Map());
            expect(isAction(updatableMap.set)).toBe(true);
        });

        it('should set value to the map', () => {
            //Given
            const map = observable(
                new Map([
                    [1, 'a'],
                    [2, 'b'],
                ]),
            );
            const updatableMap = new MobXUpdatableMap(() => map);

            //When
            updatableMap.set(3, 'c');

            //Then
            expect(map).toEqual(
                new ObservableMap([
                    [1, 'a'],
                    [2, 'b'],
                    [3, 'c'],
                ]),
            );
        });

        it('should update value in the map', () => {
            //Given
            const map = observable(
                new Map([
                    [1, 'a'],
                    [2, 'b'],
                ]),
            );
            const updatableMap = new MobXUpdatableMap(() => map);

            //When
            updatableMap.set(2, 'c');

            //Then
            expect(map).toEqual(
                new ObservableMap([
                    [1, 'a'],
                    [2, 'c'],
                ]),
            );
        });
    });

    describe('setAll', () => {
        it('should be a mobx action', () => {
            const updatableMap = new MobXUpdatableMap(() => new Map());
            expect(isAction(updatableMap.setAll)).toBe(true);
        });

        it('should set all values to the map', () => {
            //Given
            const map = observable(
                new Map([
                    [1, 'a'],
                    [2, 'b'],
                    [3, 'c'],
                ]),
            );
            const updatableMap = new MobXUpdatableMap(() => map);

            //When
            updatableMap.setAll([
                [3, 'd'],
                [4, 'e'],
            ]);

            //Then
            expect(map).toEqual(
                new ObservableMap([
                    [1, 'a'],
                    [2, 'b'],
                    [3, 'd'],
                    [4, 'e'],
                ]),
            );
        });
    });

    describe('remove', () => {
        it('should be a mobx action', () => {
            const updatableMap = new MobXUpdatableMap(() => new Map());
            expect(isAction(updatableMap.remove)).toBe(true);
        });

        it('should remove value from the map', () => {
            //Given
            const map = observable(
                new Map([
                    [1, 'a'],
                    [2, 'b'],
                ]),
            );
            const updatableMap = new MobXUpdatableMap(() => map);

            //When
            updatableMap.remove(1);

            //Then
            expect(map).toEqual(new ObservableMap([[2, 'b']]));
        });
    });

    describe('removeAll', () => {
        it('should be a mobx action', () => {
            const updatableMap = new MobXUpdatableMap(() => new Map());
            expect(isAction(updatableMap.removeAll)).toBe(true);
        });

        it('should remove all values from the map', () => {
            //Given
            const map = observable(
                new Map([
                    [1, 'a'],
                    [2, 'b'],
                    [3, 'c'],
                ]),
            );
            const updatableMap = new MobXUpdatableMap(() => map);

            //When
            updatableMap.removeAll([1, 2]);

            //Then
            expect(map).toEqual(new ObservableMap([[3, 'c']]));
        });
    });

    describe('removeAllBy', () => {
        it('should be a mobx action', () => {
            const updatableMap = new MobXUpdatableMap(() => new Map());
            expect(isAction(updatableMap.removeAllBy)).toBe(true);
        });

        it('should remove all values from the map by predicate', () => {
            //Given
            const map = observable(
                new Map([
                    [1, 'a'],
                    [2, 'b'],
                    [3, 'c'],
                ]),
            );
            const updatableMap = new MobXUpdatableMap(() => map);

            //When
            updatableMap.removeAllBy((key, value) => key === 1 || value === 'c');

            //Then
            expect(map).toEqual(new ObservableMap([[2, 'b']]));
        });
    });

    describe('clear', () => {
        it('should be a mobx action', () => {
            const updatableMap = new MobXUpdatableMap(() => new Map());
            expect(isAction(updatableMap.clear)).toBe(true);
        });

        it('should clear the map', () => {
            //Given
            const map = observable(
                new Map([
                    [1, 'a'],
                    [2, 'b'],
                ]),
            );
            const updatableMap = new MobXUpdatableMap(() => map);

            //When
            updatableMap.clear();

            //Then
            expect(map).toEqual(new ObservableMap());
        });
    });
});
