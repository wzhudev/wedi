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
      // IdentifierPair
      if (dep instanceof Array) {
        const [depKey, depItem] = dep;
        this.add(depKey, depItem);
      } else {
        // The constructor itself.
        this.add(dep, new InitPromise(dep));
      }
    }
  }

  /* Register a dependency with an identifier. */
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

  /**
   * If this collection get disposed
   */
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
        `[WeDI] Dependency collection is not accessible after it disposes!`
      );
    }
  }
}
