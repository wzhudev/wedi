import {
  DependencyItem,
  DependencyKey,
  DependencyValue,
  Disposable,
  InitPromise,
  isDisposable,
  Ctor
} from './typings'

export class DependencyCollection implements Disposable {
  public disposed: boolean = false

  private readonly items = new Map<
    DependencyKey<any>,
    DependencyValue<any> | any
  >()

  constructor(deps: DependencyItem<any>[] = []) {
    for (const dep of deps) {
      if (dep instanceof Array) {
        const [depKey, depItem] = dep
        this.add(depKey, depItem)
      } else {
        this.add(dep)
      }
    }
  }

  add<T>(ctor: Ctor<T>): void
  add<T>(key: DependencyKey<T>, item: DependencyValue<T> | T): void
  add<T>(ctorOrKey: DependencyKey<T>, item?: DependencyValue<T> | T): void {
    this.ensureCollectionNotDisposed()

    if (item) {
      this.items.set(ctorOrKey, item)
    } else {
      this.items.set(ctorOrKey, new InitPromise(ctorOrKey as Ctor<T>))
    }
  }

  has(key: DependencyKey<any>): boolean {
    this.ensureCollectionNotDisposed()

    return this.items.has(key)
  }

  get<T>(key: DependencyKey<T>): T | DependencyValue<T> | undefined {
    this.ensureCollectionNotDisposed()

    return this.items.get(key)
  }

  dispose(): void {
    this.disposed = true

    this.items.forEach((item) => {
      if (isDisposable(item)) {
        item.dispose()
      }
    })
  }

  private ensureCollectionNotDisposed(): void {
    if (this.disposed) {
      throw new Error(
        `[wedi] Dependency collection is not accessible after it disposes!`
      )
    }
  }
}
