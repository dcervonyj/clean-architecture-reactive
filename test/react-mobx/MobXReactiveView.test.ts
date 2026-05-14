import { State } from '@reactive/base/State';
import { MobXReactiveView } from '@reactive/react-mobx/MobXReactiveView';

describe('MobXReactiveView tests', () => {
    type Source = { count: number; name: string };
    type Computed = { doubled: number; label: string };
    type TestState = State<Source, Computed>;

    const defaultSource: Source = { count: 0, name: 'Alice' };

    let view: MobXReactiveView<TestState>;

    beforeEach(() => {
        view = new MobXReactiveView<TestState>(defaultSource);
    });

    describe('deregisterReactions', () => {
        it('should stop firing the reaction after deregistration', () => {
            //Given
            const calls: number[] = [];
            const reaction = {
                extractReactionCause: (state: TestState) => state.count,
                action: (current: number) => calls.push(current),
            };

            view.registerReactions([reaction]);
            expect(calls).toEqual([0]);

            view.update({ count: 1 });
            expect(calls).toEqual([0, 1]);

            //When
            view.deregisterReactions([reaction]);
            view.update({ count: 2 });

            //Then — no new call after deregistration
            expect(calls).toEqual([0, 1]);
        });

        it('should not throw when deregistering a reaction that was never registered', () => {
            const reaction = {
                extractReactionCause: (state: TestState) => state.count,
                action: () => {},
            };

            expect(() => view.deregisterReactions([reaction])).not.toThrow();
        });
    });

    describe('deregisterSelectors', () => {
        it('should stop updating computed fields after deregistration', () => {
            //Given
            view.register({
                doubled: { select: (s) => s.count * 2 },
                label: { select: (s) => `Hello ${s.name}` },
            });

            expect(view.state.doubled).toBe(0);

            view.update({ count: 5 });
            expect(view.state.doubled).toBe(10);

            //When
            view.deregisterSelectors();
            view.update({ count: 99 });

            //Then — computed field is frozen at last value
            expect(view.state.doubled).toBe(10);
        });

        it('should be idempotent when called multiple times', () => {
            view.register({
                doubled: { select: (s) => s.count * 2 },
                label: { select: (s) => s.name },
            });

            expect(() => {
                view.deregisterSelectors();
                view.deregisterSelectors();
            }).not.toThrow();
        });
    });

    describe('update', () => {
        it('should perform a deep partial merge', () => {
            //When
            view.update({ count: 42 });

            //Then
            expect(view.state.count).toBe(42);
            expect(view.state.name).toBe('Alice');
        });
    });

    describe('register selectors', () => {
        it('should compute derived state immediately', () => {
            view.register({
                doubled: { select: (s) => s.count * 2 },
                label: { select: (s) => `Hello ${s.name}` },
            });

            expect(view.state.doubled).toBe(0);
            expect(view.state.label).toBe('Hello Alice');
        });

        it('should recompute when source state changes', () => {
            view.register({
                doubled: { select: (s) => s.count * 2 },
                label: { select: (s) => `Hello ${s.name}` },
            });

            view.update({ count: 7 });
            expect(view.state.doubled).toBe(14);

            view.update({ name: 'Bob' });
            expect(view.state.label).toBe('Hello Bob');
        });
    });
});
