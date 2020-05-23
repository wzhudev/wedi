import { Ctor, DependencyKey, Identifier, IdentifierSymbol } from './typings'
import { dependencyIds, setDependencies } from './utils'

export function createIdentifier<T>(name: string): Identifier<T> {
  if (dependencyIds.has(name)) {
    console.warn(`[DI] duplicated identifier name ${name}.`)

    return dependencyIds.get(name)!
  }

  const id = function(target: Ctor<T>, _key: string, index: number): void {
    setDependencies(target, id, index, false)
  } as Identifier<T>

  id.toString = () => name
  id[IdentifierSymbol] = true

  dependencyIds.set(name, id)

  return id
}

/**
 * wrap a Identifier with this function to make it optional
 */
export function Optional<T>(key: DependencyKey<T>) {
  return function(target: Ctor<T>, _key: string, index: number) {
    setDependencies(target, key, index, true)
  }
}

/**
 * used inside constructor for services to claim dependencies
 */
export function Need<T>(key: DependencyKey<T>) {
  return function<C>(target: Ctor<C>, _key: string, index: number) {
    setDependencies(target, key, index, false)
  }
}
