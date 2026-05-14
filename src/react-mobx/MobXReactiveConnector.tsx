import React, { Context as ReactContext, createContext, memo, useContext } from 'react';

import autoBind from 'auto-bind';
import { omit } from 'lodash-es';
import { observer } from 'mobx-react';

import { MobXReactiveContext } from './MobXReactiveContext';
import { MobXReactiveContextProps } from './MobXReactiveContextProps';

export class MobXReactiveConnector<Context extends MobXReactiveContext<any>> {
    private reactContext?: ReactContext<Context>;

    autoBindContext(context: Context): void {
        Object.values(context).forEach((it) => {
            if (typeof it === 'object') {
                autoBind(it);
            }
        });
    }

    Provider: React.FC<{ context: Context; children?: React.ReactNode | React.ReactElement | React.ReactElement[] }> =
        memo(({ children, context }) => {
            this.autoBindContext(context);

            if (!this.reactContext) {
                this.reactContext = createContext(context);
            }

            return <this.reactContext.Provider value={context}>{children}</this.reactContext.Provider>;
        });

    connect = <Props extends Partial<MobXReactiveContextProps<Context>>>(
        Component: React.ComponentType<Props>,
    ): React.ComponentType<Omit<Props, keyof MobXReactiveContextProps<Context>>> => {
        const ObserverComponent = observer(Component);

        return observer((ownProps: Omit<Props, keyof MobXReactiveContextProps<Context>>) => {
            if (!this.reactContext) {
                return null;
            }

            const context = useContext(this.reactContext!);
            const props = {
                ...omit(context, 'view'),
                state: context.view.state,
                ...ownProps,
            } as unknown as Props;

            return <ObserverComponent {...props} />;
        });
    };
}
