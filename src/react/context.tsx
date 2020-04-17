import React, { Component, createContext } from 'react'

import { DependencyCollection } from '../collection'
import { Injector } from '../injector'

interface InjectionContextValue {
  injector: Injector | null
}

export const InjectionContext = createContext<InjectionContextValue>({
  injector: null
})
InjectionContext.displayName = 'InjectionContext'

const InjectionConsumer = InjectionContext.Consumer
const InjectionProvider = InjectionContext.Provider

export interface InjectionProviderProps {
  collection?: DependencyCollection
  // support providing an injector directly, so React binding
  // can use parent injector outside of React
  injector?: Injector
}

/**
 * the React binding of wedi
 *
 * it uses the React context API to specify injection positions and
 * layered injector tree
 *
 * ```tsx
 * <Provider collection={}>
 *   { children }
 * </Provider>
 * ```
 */
export class Provider extends Component<InjectionProviderProps> {
  renderChild(context: InjectionContextValue) {
    const { collection, children, injector } = this.props
    const parentInjector = context.injector

    if (!!collection === !!injector) {
      throw new Error(
        '[wedi] should provide a collection or an injector to "Provider"'
      )
    }

    const finalInjector = injector
      ? injector
      : parentInjector
      ? parentInjector.createChild(collection)
      : new Injector(collection!)

    return (
      <InjectionProvider value={{ injector: finalInjector }}>
        {children}
      </InjectionProvider>
    )
  }

  render() {
    return (
      <InjectionConsumer>
        {(context) => this.renderChild(context)}
      </InjectionConsumer>
    )
  }
}
