import React from 'react';

import { MobXReactiveContext } from './MobXReactiveContext';
import { MobXReactiveContextProps } from './MobXReactiveContextProps';

export type MobXReactiveConnect<Context extends MobXReactiveContext<any>> = <
    Props extends Partial<MobXReactiveContextProps<Context>>,
>(
    Component: React.ComponentType<Props>,
) => React.ComponentType<Omit<Props, keyof MobXReactiveContextProps<Context>>>;
