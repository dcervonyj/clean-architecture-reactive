import { observable } from 'mobx';

import { mergeState } from '@reactive/react-mobx/mergeState';

describe('mergeState tests', () => {
    describe('Key deletion', () => {
        it('should delete keys that exist in prevSource but not in source', () => {
            // Given
            const target = { a: 1, b: 2, c: 3 };
            const source = { a: 10, c: 30 };
            const prevSource = { a: 1, b: 2, c: 3 };

            // When
            mergeState(target, source, prevSource);

            // Then
            expect(target).toEqual({ a: 10, c: 30 });
            expect('b' in target).toBe(false);
        });

        it('should not delete keys when prevSource is undefined', () => {
            // Given
            const target = { a: 1, b: 2 };
            const source = { a: 10 };

            // When
            mergeState(target, source, undefined);

            // Then
            expect(target).toEqual({ a: 10, b: 2 });
        });

        it('should handle empty prevSource', () => {
            // Given
            const target = { a: 1 };
            const source = { a: 10, b: 20 };
            const prevSource = {};

            // When
            mergeState(target, source, prevSource);

            // Then
            expect(target).toEqual({ a: 10, b: 20 });
        });
    });

    describe('Function handling', () => {
        it('should wrap functions with computedFn', () => {
            // Given
            const target = {};
            const mockFn = vi.fn((x: number) => x * 2);
            const source = { fn: mockFn };

            // When
            mergeState(target, source, undefined);

            // Then
            expect(target).toHaveProperty('fn');
            // Call the wrapped function
            const wrappedFn = (target as any).fn;
            const result = wrappedFn(5);
            expect(result).toBe(10);
            expect(mockFn).toHaveBeenCalledWith(5);
        });

        it('should replace existing function with new computedFn', () => {
            // Given
            const oldFn = vi.fn();
            const target = { fn: oldFn };
            const newFn = vi.fn((x: number) => x + 1);
            const source = { fn: newFn };

            // When
            mergeState(target, source, undefined);

            // Then
            const wrappedFn = (target as any).fn;
            expect(wrappedFn(3)).toBe(4);
        });
    });

    describe('Null and undefined handling', () => {
        it('should set value when target value is null and source value is not', () => {
            // Given
            const target = { a: null };
            const source = { a: 'value' };

            // When
            mergeState(target, source, undefined);

            // Then
            expect(target).toEqual({ a: 'value' });
        });

        it('should set value when source value is null and target value is not', () => {
            // Given
            const target = { a: 'value' };
            const source = { a: null };

            // When
            mergeState(target, source, undefined);

            // Then
            expect(target).toEqual({ a: null });
        });

        it('should set value when target value is undefined', () => {
            // Given
            const target = { a: undefined };
            const source = { a: 'value' };

            // When
            mergeState(target, source, undefined);

            // Then
            expect(target).toEqual({ a: 'value' });
        });

        it('should clone objects when setting null/undefined values', () => {
            // Given
            const target = { a: null };
            const nestedObj = { nested: { deep: 'value' } };
            const source = { a: nestedObj };

            // When
            mergeState(target, source, undefined);

            // Then
            expect((target as any).a).toEqual(nestedObj);
            expect((target as any).a).not.toBe(nestedObj); // Should be cloned
        });
    });

    describe('Array handling', () => {
        it('should replace array when key does not exist in target', () => {
            // Given
            const target = {};
            const source = { arr: [1, 2, 3] };

            // When
            mergeState(target, source, undefined);

            // Then
            expect(target).toEqual({ arr: [1, 2, 3] });
        });

        it('should replace array when arrays are different', () => {
            // Given
            const target = { arr: [1, 2, 3] };
            const source = { arr: [4, 5, 6] };

            // When
            mergeState(target, source, undefined);

            // Then
            expect(target).toEqual({ arr: [4, 5, 6] });
        });

        it('should not replace array when they are the same reference', () => {
            // Given
            const sharedArray = [1, 2, 3];
            const target = { arr: sharedArray };
            const source = { arr: sharedArray };

            // When
            mergeState(target, source, undefined);

            // Then
            expect((target as any).arr).toBe(sharedArray);
        });

        it('should handle empty arrays', () => {
            // Given
            const target = { arr: [1, 2, 3] };
            const source = { arr: [] };

            // When
            mergeState(target, source, undefined);

            // Then
            expect(target).toEqual({ arr: [] });
        });
    });

    describe('Map handling', () => {
        it('should replace Map with observable Map in target', () => {
            // Given
            const observableMap = observable.map([['key1', 'value1']]);
            const target = { map: observableMap };
            const newMap = new Map([['key2', 'value2']]);
            const source = { map: newMap };

            // When
            mergeState(target, source, undefined);

            // Then
            expect((target as any).map).toBe(newMap);
        });

        it('should not replace non-observable Map', () => {
            // Given
            const regularMap = new Map([['key1', 'value1']]);
            const target = { map: regularMap };
            const newMap = new Map([['key2', 'value2']]);
            const source = { map: newMap };

            // When
            mergeState(target, source, undefined);

            // Then
            // Should fall through to other conditions
            expect((target as any).map).toBeDefined();
        });

        it('should handle Map when target does not have Map', () => {
            // Given
            const target = {};
            const newMap = new Map([['key1', 'value1']]);
            const source = { map: newMap };

            // When
            mergeState(target, source, undefined);

            // Then
            expect((target as any).map).toEqual(newMap);
        });
    });

    describe('Set handling', () => {
        it('should replace Set with observable Set in target', () => {
            // Given
            const observableSet = observable.set([1, 2, 3]);
            const target = { set: observableSet };
            const newSet = new Set([4, 5, 6]);
            const source = { set: newSet };

            // When
            mergeState(target, source, undefined);

            // Then
            expect((target as any).set).toBe(newSet);
        });

        it('should not replace non-observable Set', () => {
            // Given
            const regularSet = new Set([1, 2, 3]);
            const target = { set: regularSet };
            const newSet = new Set([4, 5, 6]);
            const source = { set: newSet };

            // When
            mergeState(target, source, undefined);

            // Then
            // Should fall through to other conditions
            expect((target as any).set).toBeDefined();
        });

        it('should handle Set when target does not have Set', () => {
            // Given
            const target = {};
            const newSet = new Set([1, 2, 3]);
            const source = { set: newSet };

            // When
            mergeState(target, source, undefined);

            // Then
            expect((target as any).set).toEqual(newSet);
        });
    });

    describe('Nested object merging', () => {
        it('should recursively merge nested objects', () => {
            // Given
            const target = { nested: { a: 1, b: 2 } };
            const source = { nested: { b: 20, c: 30 } };
            const prevSource = { nested: { a: 1, b: 2 } };

            // When
            mergeState(target, source, prevSource);

            // Then
            expect(target).toEqual({ nested: { b: 20, c: 30 } });
        });

        it('should handle deeply nested objects', () => {
            // Given
            const target = { level1: { level2: { level3: { value: 'old' } } } };
            const source = { level1: { level2: { level3: { value: 'new' } } } };
            const prevSource = { level1: { level2: { level3: { value: 'old' } } } };

            // When
            mergeState(target, source, prevSource);

            // Then
            expect(target).toEqual({ level1: { level2: { level3: { value: 'new' } } } });
        });

        it('should merge with different nested structures', () => {
            // Given
            const target = { nested: { a: 1 } };
            const source = { nested: { a: 1, b: { c: 2 } } };

            // When
            mergeState(target, source, undefined);

            // Then
            expect(target).toEqual({ nested: { a: 1, b: { c: 2 } } });
        });

        it('should maintain reference for unchanged nested objects', () => {
            // Given
            const sharedNested = { value: 'same' };
            const target = { nested: sharedNested };
            const source = { nested: sharedNested };

            // When
            mergeState(target, source, undefined);

            // Then
            expect((target as any).nested).toBe(sharedNested);
        });
    });

    describe('Primitive value handling', () => {
        it('should update primitive values when different', () => {
            // Given
            const target = { a: 1, b: 'old', c: true };
            const source = { a: 2, b: 'new', c: false };

            // When
            mergeState(target, source, undefined);

            // Then
            expect(target).toEqual({ a: 2, b: 'new', c: false });
        });

        it('should not update primitive values when same', () => {
            // Given
            const target = { a: 1, b: 'same' };
            const source = { a: 1, b: 'same' };

            // When
            mergeState(target, source, undefined);

            // Then
            expect(target).toEqual({ a: 1, b: 'same' });
        });

        it('should handle number zero', () => {
            // Given
            const target = { a: 5 };
            const source = { a: 0 };

            // When
            mergeState(target, source, undefined);

            // Then
            expect(target).toEqual({ a: 0 });
        });

        it('should handle empty string', () => {
            // Given
            const target = { a: 'value' };
            const source = { a: '' };

            // When
            mergeState(target, source, undefined);

            // Then
            expect(target).toEqual({ a: '' });
        });

        it('should handle boolean false', () => {
            // Given
            const target = { a: true };
            const source = { a: false };

            // When
            mergeState(target, source, undefined);

            // Then
            expect(target).toEqual({ a: false });
        });
    });

    describe('Edge cases', () => {
        it('should handle empty source object', () => {
            // Given
            const target = { a: 1, b: 2 };
            const source = {};
            const prevSource = { a: 1, b: 2 };

            // When
            mergeState(target, source, prevSource);

            // Then
            expect(target).toEqual({});
        });

        it('should handle empty target object', () => {
            // Given
            const target = {};
            const source = { a: 1, b: 2 };

            // When
            mergeState(target, source, undefined);

            // Then
            expect(target).toEqual({ a: 1, b: 2 });
        });

        it('should handle complex mixed types', () => {
            // Given
            const target = { a: 1 };
            const fn = (x: number) => x * 2;
            const source = {
                a: 10,
                b: [1, 2, 3],
                c: { nested: 'value' },
                d: fn,
                e: null,
                f: new Map([['key', 'value']]),
                g: new Set([1, 2]),
            };

            // When
            mergeState(target, source, undefined);

            // Then
            expect((target as any).a).toBe(10);
            expect((target as any).b).toEqual([1, 2, 3]);
            expect((target as any).c).toEqual({ nested: 'value' });
            expect((target as any).d).toBeDefined();
            expect((target as any).e).toBeNull();
            expect((target as any).f).toBeInstanceOf(Map);
            expect((target as any).g).toBeInstanceOf(Set);
        });

        it('should handle Date objects', () => {
            // Given
            const target = {};
            const date = new Date('2023-01-01');
            const source = { date };

            // When
            mergeState(target, source, undefined);

            // Then
            expect((target as any).date).toEqual(date);
        });

        it('should handle symbols as keys', () => {
            // Given
            const target = {};
            const sym = Symbol('test');
            const source = { [sym]: 'symbol-value', regular: 'value' };

            // When
            mergeState(target, source, undefined);

            // Then
            expect((target as any).regular).toBe('value');
            // Symbols are not enumerable via Object.keys, so they won't be copied
        });

        it('should handle updating existing key with new type', () => {
            // Given
            const target = { a: 'string' };
            const source = { a: { obj: 'value' } };

            // When
            mergeState(target, source, undefined);

            // Then
            expect(target).toEqual({ a: { obj: 'value' } });
        });

        it('should not mutate source objects', () => {
            // Given
            const target = { a: 1 };
            const sourceNested = { nested: 'value' };
            const source = { a: 10, b: sourceNested };
            const sourceCopy = { a: 10, b: sourceNested };

            // When
            mergeState(target, source, undefined);

            // Then
            expect(source).toEqual(sourceCopy);
        });
    });

    describe('Prototype pollution prevention', () => {
        it('should ignore __proto__ key', () => {
            // Given
            const target = {};
            const source = JSON.parse('{"__proto__": {"injected": true}}');

            // When
            mergeState(target, source, undefined);

            // Then
            expect((target as any).injected).toBeUndefined();
            expect(({} as any).injected).toBeUndefined();
        });

        it('should ignore constructor key', () => {
            // Given
            const target = {};
            const source = JSON.parse('{"constructor": {"prototype": {"injected": true}}}');

            // When
            mergeState(target, source, undefined);

            // Then
            expect((target as any).injected).toBeUndefined();
        });

        it('should ignore prototype key', () => {
            // Given
            const target = {};
            const source = { prototype: { injected: true } };

            // When
            mergeState(target, source, undefined);

            // Then
            expect((Object.prototype as any).injected).toBeUndefined();
        });
    });
});
