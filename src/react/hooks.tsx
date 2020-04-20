import { useContext, useEffect, useRef } from 'react'

import { DependencyCollection } from '../collection'
import { DependencyItem, DependencyKey } from '../typings'
import { getDependencyKeyName } from '../utils'
import { InjectionContext } from './context'

/**
 * when providing dependencies in a functional component, it would be expensive
 * (not to mention logic incorrectness)
 */
export function useCollection(
  entries?: DependencyItem<any>[]
): DependencyCollection {
  const collectionRef = useRef(new DependencyCollection(entries))
  useEffect(() => () => collectionRef.current.dispose(), [])
  return collectionRef.current
}

/**
 * this function support using dependency injection in a function component
 * with the help of React Hooks
 */
export function useDependency<T>(key: DependencyKey<T>): T
export function useDependency<T>(
  key: DependencyKey<T>,
  optional: true
): T | null
export function useDependency<T>(
  key: DependencyKey<T>,
  optional?: boolean
): T | null {
  const { injector } = useContext(InjectionContext)
  const thing = injector && injector.getOrInit(key)

  if (!optional && !thing) {
    throw Error(
      `[wedi] Cannot get an instance of "${getDependencyKeyName(key)}".`
    )
  }

  return thing || null
}
