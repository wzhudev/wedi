import React, { Component, createContext } from 'react';

import { DependencyCollection } from './collection';
import { Injector } from './injector';

interface InjectionContextValue {
  injector: Injector | null;
}

export const InjectionContext = createContext<InjectionContextValue>({
  injector: null
});
InjectionContext.displayName = 'InjectionContext';

const InjectionConsumer = InjectionContext.Consumer;
const InjectionProvider = InjectionContext.Provider;

export interface InjectionProviderProps {
  collection: DependencyCollection;
}

/**
 * the React binding of wedi
 *
 * it uses the React context API to specify injection positions and layered injector tree
 *
 * ```tsx
 * <Provider collection={}>
 *   { children }
 * </Provider>
 * ```
 */
export class Provider extends Component<InjectionProviderProps> {
  renderChild(context: InjectionContextValue) {
    const { collection, children } = this.props;
    const parentInjector = context.injector;

    const injector = parentInjector
      ? parentInjector.createChild(collection)
      : new Injector(collection);

    return (
      <InjectionProvider value={{ injector }}>{children}</InjectionProvider>
    );
  }

  render() {
    return (
      <InjectionConsumer>
        {(context) => this.renderChild(context)}
      </InjectionConsumer>
    );
  }
}
