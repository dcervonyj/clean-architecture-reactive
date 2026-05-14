const sourceType = Symbol('Fake field to save source type');
const computedType = Symbol('Fake field to save computed type');

export type State<Source extends object, Computed extends object & Without<Computed, Source>> = Source &
    Computed & {
        [sourceType]?: Source;
        [computedType]?: Computed;
    };

type Without<Type, ToExclude> = {
    [p in keyof Type]: p extends keyof ToExclude
        ? Type[p] extends object & NoArray<Type[p]>
            ? ToExclude[p] extends object & NoArray<ToExclude[p]>
                ? Without<Type[p], ToExclude[p]>
                : never
            : never
        : Type[p];
};

type NoArray<T> = T extends any[] ? never : T;

export type SourceOf<FullState extends State<object, object>> = Required<FullState>[typeof sourceType];
export type ComputedOf<FullState extends State<object, object>> = Required<FullState>[typeof computedType];
