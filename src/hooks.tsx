import { useContext, useEffect, useRef } from 'react';

import { DependencyCollection } from './collection';
import { InjectionContext } from './context';
import { DependencyItem, DependencyKey } from './typings';
import { getDependencyKeyName } from './utils';

/**
 * When providing dependencies in a functional component, it would be expensive
 * (not to mention logic incorrectness)
 */
export function useCollection(
  entries?: DependencyItem<any>[]
): DependencyCollection {
  const collectionRef = useRef(new DependencyCollection(entries));
  useEffect(() => () => collectionRef.current?.dispose(), []);
  return collectionRef.current;
}

/**
 * This function support using dependency injection in a function component
 * with the help of React Hooks.
 */
export function useDependency<T>(key: DependencyKey<T>): T;
export function useDependency<T>(
  key: DependencyKey<T>,
  optional: true
): T | null;
export function useDependency<T>(
  key: DependencyKey<T>,
  optional?: boolean
): T | null {
  const { injector } = useContext(InjectionContext);
  const thing = injector && injector.getOrInit(key);

  if (!optional && !thing) {
    throw Error(
      `[WeDI] cannot get an instance of ${getDependencyKeyName(key)}`
    );
  }

  return thing || null;
}
