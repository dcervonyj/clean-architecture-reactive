import { MobXReactiveContext } from './MobXReactiveContext';

export type MobXReactiveContextProps<Context extends MobXReactiveContext<any>> = Omit<Context, 'view'> & {
    state: Context['view']['state'];
};
