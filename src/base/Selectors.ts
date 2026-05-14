import { Selector } from './Selector';
import { ComputedOf, State } from './State';

export type Selectors<FullState extends State<object, object>> = {
    [p in keyof ComputedOf<FullState>]: Selector<FullState, ComputedOf<FullState>[p]>;
};
