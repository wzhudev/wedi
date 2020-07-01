import React, { createContext, ComponentType, PropsWithChildren } from 'react'

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
export function Provider(props: PropsWithChildren<InjectionProviderProps>) {
  const { collection, children, injector } = props

  return (
    <InjectionConsumer>
      {(context: InjectionContextValue) => {
        const parentInjector = context.injector

        if (!!collection === !!injector) {
          throw new Error(
            '[wedi] should provide a collection or an injector to "Provider".'
          )
        }

        const finalInjector =
          injector ||
          parentInjector?.createChild(collection) ||
          new Injector(collection!)

        return (
          <InjectionProvider value={{ injector: finalInjector }}>
            {children}
          </InjectionProvider>
        )
      }}
    </InjectionConsumer>
  )
}

/**
 * return a HOC that enable functional component to add injector
 * in a convenient way
 */
export function connectProvider<T>(
  Comp: ComponentType<T>,
  options: InjectionProviderProps
): ComponentType<T> {
  const { injector, collection } = options

  return function ComponentWithInjector(props: T) {
    return (
      <Provider injector={injector} collection={collection}>
        <Comp {...props} />
      </Provider>
    )
  }
}
