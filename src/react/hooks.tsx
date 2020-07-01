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
  const thing = injector?.getOrInit(key, true)

  if (!optional && !thing) {
    throw Error(
      `[wedi] Cannot get an instance of "${getDependencyKeyName(key)}".`
    )
  }

  return thing || null
}

type Nullable<T> = T | null

export function useMultiDependencies<D1, D2>(
  keys: [DependencyKey<D1>, DependencyKey<D2>]
): [Nullable<D1>, Nullable<D2>]
export function useMultiDependencies<D1, D2, D3>(
  keys: [DependencyKey<D1>, DependencyKey<D2>, DependencyKey<D3>]
): [Nullable<D1>, Nullable<D2>, Nullable<D3>]
export function useMultiDependencies<D1, D2, D3, D4>(
  keys: [
    DependencyKey<D1>,
    DependencyKey<D2>,
    DependencyKey<D3>,
    DependencyKey<D4>
  ]
): [Nullable<D1>, Nullable<D2>, Nullable<D3>, Nullable<D4>]
export function useMultiDependencies<D1, D2, D3, D4, D5>(
  keys: [
    DependencyKey<D1>,
    DependencyKey<D2>,
    DependencyKey<D3>,
    DependencyKey<D4>,
    DependencyKey<D5>
  ]
): [Nullable<D1>, Nullable<D2>, Nullable<D3>, Nullable<D4>, Nullable<D5>]
export function useMultiDependencies<D1, D2, D3, D4, D5, D6>(
  keys: [
    DependencyKey<D1>,
    DependencyKey<D2>,
    DependencyKey<D3>,
    DependencyKey<D4>,
    DependencyKey<D5>,
    DependencyKey<D6>
  ]
): [
  Nullable<D1>,
  Nullable<D2>,
  Nullable<D3>,
  Nullable<D4>,
  Nullable<D5>,
  Nullable<D6>
]
export function useMultiDependencies(keys: any[]): any[] {
  const ret = new Array(keys.length).fill(null)
  const { injector } = useContext(InjectionContext)

  keys.forEach((key, index) => {
    ret[index] = injector?.getOrInit(key) ?? null
  })

  return ret
}
