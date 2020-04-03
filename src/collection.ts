import {
  DependencyItem,
  DependencyKey,
  DependencyValue,
  IDisposable,
  InitPromise,
  isDisposable
} from './typings';

export class DependencyCollection implements IDisposable {
  private readonly items = new Map<DependencyKey<any>, DependencyValue<any>>();
  private disposed: boolean = false;

  constructor(deps: DependencyItem<any>[] = []) {
    for (const dep of deps) {
      // identifier pair
      if (dep instanceof Array) {
        const [depKey, depItem] = dep;
        this.add(depKey, depItem);
      } else {
        // the constructor itself
        this.add(dep, new InitPromise(dep));
      }
    }
  }

  /* register a dependency with an identifier */
  add<T>(key: DependencyKey<T>, depItem: any): void {
    this.ensureCollectionNotDisposed();
    this.items.set(key, depItem);
  }

  has(key: DependencyKey<any>): boolean {
    this.ensureCollectionNotDisposed();
    return this.items.has(key);
  }

  get<T>(key: DependencyKey<T>): T | DependencyValue<T> | undefined {
    this.ensureCollectionNotDisposed();
    return this.items.get(key);
  }

  dispose(): void {
    this.disposed = true;

    this.items.forEach((item) => {
      if (isDisposable(item)) {
        item.dispose();
      }
    });
  }

  private ensureCollectionNotDisposed(): void {
    if (this.disposed) {
      throw new Error(
        `[wedi] Dependency collection is not accessible after it disposes!`
      );
    }
  }
}
