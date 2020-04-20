import { DependencyCollection } from './collection'
import { IdleValue } from './idle'
import { getSingletonDependencies } from './singleton'
import {
  Ctor,
  DependencyKey,
  DependencyValue,
  FactoryItem,
  Disposable,
  InitPromise,
  isClassItem,
  isFactoryItem,
  isValueItem,
  Identifier,
  isInitPromise
} from './typings'
import {
  assertRecursionNotTrappedInACircle,
  completeInitialization,
  getDependencies,
  getDependencyKeyName,
  requireInitialization
} from './utils'

export class Injector implements Disposable {
  private readonly parent?: Injector
  private readonly collection: DependencyCollection

  constructor(collection: DependencyCollection, parent?: Injector) {
    // if there's no parent injector, should get singleton dependencies
    if (!parent) {
      const newDependencies = getSingletonDependencies()
      // root injector would not re-add dependencies when the component
      // it embeds re-render
      newDependencies.forEach((d) => {
        if (!collection.has(d[0])) {
          collection.add(d[0], d[1])
        }
      })
    }

    this.collection = collection
    this.parent = parent
  }

  dispose(): void {
    this.collection.dispose()
  }

  add<T>(ctor: Ctor<T>): void
  add<T>(key: Identifier<T>, item: DependencyValue<T>): void
  add<T>(ctorOrKey: Ctor<T> | Identifier<T>, item?: DependencyValue<T>): void {
    this.collection.add(ctorOrKey as any, item as any)
  }

  /**
   * create a child Initializer to build layered injection system
   */
  createChild(
    dependencies: DependencyCollection = new DependencyCollection()
  ): Injector {
    return new Injector(dependencies, this)
  }

  /**
   * get a dependency
   */
  get<T>(id: DependencyKey<T>): T | null {
    const thing = this.getDependencyOrIdentifierPair(id)

    if (typeof thing === 'undefined') {
      // not provided
      return null
    } else if (thing instanceof InitPromise || isFactoryItem(thing)) {
      // not initialized yet
      return null
    } else {
      return this.getOrInit(id)
    }
  }

  /**
   * get a dependency or create one in the current injector
   */
  getOrInit<T>(id: DependencyKey<T>): T | null {
    const thing = this.getDependencyOrIdentifierPair(id)

    if (typeof thing === 'undefined') {
      return null
    } else if (isInitPromise(thing)) {
      return this.createAndCacheInstance(id, thing)
    } else if (isValueItem(thing)) {
      return thing.useValue
    } else if (isFactoryItem(thing)) {
      return this.invokeDependencyFactory(id as Identifier<T>, thing)
    } else if (isClassItem(thing)) {
      return this.createAndCacheInstance(
        id,
        new InitPromise(thing.useClass, !!thing.lazyInstantiation)
      )
    } else {
      return thing as T
    }
  }

  /**
   * initialize a class in the scope of the injector
   * @param ctor The class to be initialized
   */
  createInstance<T>(ctor: Ctor<T> | InitPromise<T>, ...extraParams: any[]): T {
    const theCtor = ctor instanceof InitPromise ? ctor.ctor : ctor
    const dependencies = getDependencies(theCtor).sort(
      (a, b) => a.index - b.index
    )
    const resolvedArgs: any[] = []

    let args = [...extraParams]

    for (const dependency of dependencies) {
      const thing = this.getOrInit(dependency.id)

      if (thing === null && !dependency.optional) {
        throw new Error(
          `[wedi] "${
            theCtor.name
          }" relies on a not provided dependency "${getDependencyKeyName(
            dependency.id
          )}".`
        )
      }

      resolvedArgs.push(thing)
    }

    const firstDependencyArgIndex =
      dependencies.length > 0 ? dependencies[0].index : args.length

    if (args.length !== firstDependencyArgIndex) {
      console.warn(
        `[DI] expected ${firstDependencyArgIndex} non-injected parameters ` +
          `but ${args.length} parameters are provided.`
      )

      const delta = firstDependencyArgIndex - args.length
      if (delta > 0) {
        args = [...args, ...new Array(delta).fill(undefined)]
      } else {
        args = args.slice(0, firstDependencyArgIndex)
      }
    }

    return new theCtor(...args, ...resolvedArgs)
  }

  private getDependencyOrIdentifierPair<T>(
    id: DependencyKey<T>
  ): T | DependencyValue<T> | undefined {
    return (
      this.collection.get(id) ||
      (this.parent ? this.parent.getDependencyOrIdentifierPair(id) : undefined)
    )
  }

  private putDependencyBack<T>(key: DependencyKey<T>, value: T): void {
    if (this.collection.get(key)) {
      this.collection.add(key, value)
    } else if (this.parent) {
      this.parent.putDependencyBack(key, value)
    } else {
      throw new Error(
        `[wedi] cannot find a place to to the new created ${getDependencyKeyName(
          key
        )}`
      )
    }
  }

  private createAndCacheInstance<T>(
    dKey: DependencyKey<T>,
    initPromise: InitPromise<T>
  ) {
    requireInitialization()
    assertRecursionNotTrappedInACircle(dKey)

    const ctor = initPromise.ctor
    let thing: T

    if (initPromise.lazyInstantiation) {
      const idle = new IdleValue<T>(() => this.doCreateInstance(dKey, ctor))
      thing = new Proxy(Object.create(null), {
        get(target: any, key: string | number | symbol): any {
          if (key in target) {
            return target[key]
          }
          const obj = idle.getValue()
          let prop = (obj as any)[key]
          if (typeof prop !== 'function') {
            return prop
          }
          prop = prop.bind(obj)
          target[key] = prop
          return prop
        },
        set(_target: any, key: string | number | symbol, value: any): boolean {
          ;(idle.getValue() as any)[key] = value
          return true
        }
      }) as T
    } else {
      thing = this.doCreateInstance(dKey, ctor)
    }

    completeInitialization()

    return thing
  }

  private doCreateInstance<T>(id: DependencyKey<T>, ctor: Ctor<T>): T {
    const thing = this.createInstance(ctor)
    this.putDependencyBack(id, thing)
    return thing
  }

  private invokeDependencyFactory<T>(
    id: Identifier<T>,
    factory: FactoryItem<T>
  ): T {
    const dependencies = factory.deps?.map((dp) => this.getOrInit(dp)) || []
    const thing = factory.useFactory.call(null, dependencies)

    this.collection.add(id, {
      useValue: thing
    })

    return thing
  }
}
