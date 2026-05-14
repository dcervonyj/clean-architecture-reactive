import { SourceOf, State } from './State';

export interface Selector<FullState extends State<object, object>, ComputedState> {
    select(state: SourceOf<FullState>): ComputedState;
}
