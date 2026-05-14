import { ReactiveView } from '../base/ReactiveView';
import { State } from '../base/State';

export interface MobXReactiveContext<FullState extends State<object, object>> {
    view: ReactiveView<FullState>;
}
