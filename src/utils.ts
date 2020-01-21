import {
  Ctor,
  DependencyKey,
  DependencyMeta,
  Identifier,
  isIdentifier
} from './typings';

export const dependencyIds = new Map<string, Identifier<any>>();
export const DEPENDENCIES = '$$WEDI_DEPENDENCIES';
export const TARGET = '$$WEDI_TARGET';

export function getDependencies<T>(ctor: Ctor<T>): DependencyMeta<T>[] {
  return (ctor as any)[DEPENDENCIES] || [];
}

export function setDependencies<T>(
  ctor: Ctor<any>,
  id: DependencyKey<T>,
  index: number,
  optional: boolean
) {
  const meta: DependencyMeta<T> = { id, index, optional };

  // Cope with dependency that is inherited from another.
  if ((ctor as any)[TARGET] === ctor) {
    (ctor as any)[DEPENDENCIES].push(meta);
  } else {
    (ctor as any)[DEPENDENCIES] = [meta];
    (ctor as any)[TARGET] = ctor;
  }
}

const RECURSION_MAX = 10;

let recursionCounter = 0;

export function requireInitialization(): void {
  recursionCounter += 1;
}

export function completeInitialization(): void {
  recursionCounter -= 1;
}

export function resetRecursionCounter() {
  recursionCounter = 0;
}

export function assertRecursionNotTrappedInACircle(
  key: DependencyKey<any>
): void {
  if (recursionCounter > RECURSION_MAX) {
    resetRecursionCounter();

    throw new Error(
      `[WeDI] "createInstance" exceeds the limitation of recursion (${RECURSION_MAX}x). ` +
        `There might be a circular dependency among your dependency items. ` +
        `Last target was "${getDependencyKeyName(key)}".`
    );
  }
}

export function getDependencyKeyName(key: DependencyKey<any>): string {
  return isIdentifier(key) ? key.toString() : key.name;
}
