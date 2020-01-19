import { ClassItem, Ctor, Identifier } from './typings';

const singletonDependencies: [Identifier<any>, ClassItem<any>][] = [];

export function registerSingleton<T>(
  id: Identifier<T>,
  ctor: Ctor<T>,
  lazyInstantiation = false
): void {
  const index = singletonDependencies.findIndex(
    (d) => d[0].toString() === id.toString() || d[0] === id
  );

  if (index !== -1) {
    singletonDependencies[index] = [id, { useClass: ctor, lazyInstantiation }];
    console.warn(`[WeDI] Duplicated registration of ${id.toString()}.`);
  } else {
    singletonDependencies.push([id, { useClass: ctor, lazyInstantiation }]);
  }
}

/**
 * For top-layer injectors to fetch all singleton dependencies.
 */
export function getSingletonDependencies(): [
  Identifier<any>,
  ClassItem<any>
][] {
  return singletonDependencies;
}
