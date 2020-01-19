import { DependencyCollection } from './collection';
import { IdleValue } from './idle';
import { getSingletonDependencies } from './singleton';
import {
  Ctor,
  DependencyKey,
  DependencyValue,
  FactoryItem,
  IDisposable,
  InitPromise,
  isClassItem,
  isFactoryItem,
  isValueItem
} from './typings';
import { getDependencies, getDependencyKeyName } from './utils';

let recursionCounter = 0;

export class Injector implements IDisposable {
  private readonly parent?: Injector;
  private readonly collection: DependencyCollection;

  constructor(collection: DependencyCollection, parent?: Injector) {
    // If there's no parent injector, should get singleton dependencies.
    if (!parent) {
      const newDependencies = getSingletonDependencies();
      newDependencies.forEach((d) => {
        if (!collection.has(d[0])) {
          collection.add(d[0], d[1]);
        }
      });
    }

    this.collection = collection;
    this.parent = parent;
  }

  dispose(): void {
    this.collection.dispose();
  }

  /**
   * Create a child Initializer to build layered injection system.
   */
  createChild(
    dependencies: DependencyCollection = new DependencyCollection()
  ): Injector {
    return new Injector(dependencies, this);
  }

  /**
   * Get a dependency.
   */
  get<T>(id: DependencyKey<T>): T | null {
    const thing = this.__getDependencyOrIdentifierPair(id);

    if (typeof thing === 'undefined') {
      // Not provided.
      return null;
    } else if (thing instanceof InitPromise || isFactoryItem(thing)) {
      // Not initialized yet.
      return null;
    } else {
      return this.getOrInit(id);
    }
  }

  /**
   * Get a dependency or create one in the current injector.
   */
  getOrInit<T>(id: DependencyKey<T>): T | null {
    const thing = this.__getDependencyOrIdentifierPair(id);

    if (typeof thing === 'undefined') {
      return null;
    } else if (thing instanceof InitPromise) {
      return this.createAndCacheInstance(id, thing);
    } else if (isValueItem(thing)) {
      return thing.useValue;
    } else if (isFactoryItem(thing)) {
      return this.invokeDependencyFactory(id, thing);
    } else if (isClassItem(thing)) {
      return this.createAndCacheInstance(
        id,
        new InitPromise(thing.useClass, !!thing.lazyInstantiation)
      );
    } else {
      return thing as T;
    }
  }

  /**
   * Initialize a class in the scope of the injector.
   * @param ctor The class to be initialized.
   */
  createInstance<T>(ctor: Ctor<T> | InitPromise<T>, ...extraParams: any[]): T {
    const theCtor = ctor instanceof InitPromise ? ctor.ctor : ctor;
    const dependencies = getDependencies(theCtor).sort(
      (a, b) => a.index - b.index
    );
    const resolvedArgs: any[] = [];

    let args = [...extraParams];

    for (const dependency of dependencies) {
      const thing = this.getOrInit(dependency.id);

      if (thing === null && !dependency.optional) {
        throw new Error(
          `[WeDI] "${
            theCtor.name
          }" relies on a not provided dependency "${getDependencyKeyName(
            dependency.id
          )}".`
        );
      }

      resolvedArgs.push(thing);
    }

    const firstDependencyArgIndex =
      dependencies.length > 0 ? dependencies[0].index : args.length;

    if (args.length !== firstDependencyArgIndex) {
      console.warn(
        `[DI] expected ${firstDependencyArgIndex} non-injected parameters ` +
          `but ${args.length} parameters are provided.`
      );

      const delta = firstDependencyArgIndex - args.length;
      if (delta > 0) {
        args = [...args, ...new Array(delta).fill(undefined)];
      } else {
        args = args.slice(0, firstDependencyArgIndex);
      }
    }

    return new theCtor(...args, ...resolvedArgs);
  }

  __getDependencyOrIdentifierPair<T>(
    id: DependencyKey<T>
  ): T | DependencyValue<T> | undefined {
    return (
      this.collection.get(id) ||
      (this.parent
        ? this.parent.__getDependencyOrIdentifierPair(id)
        : undefined)
    );
  }

  __putDependencyBack<T>(key: DependencyKey<T>, value: T): void {
    if (this.collection.get(key)) {
      this.collection.add(key, value);
    } else if (this.parent) {
      this.parent.__putDependencyBack(key, value);
    } else {
      throw new Error(
        `[WeDI] cannot find a place to to the new created ${getDependencyKeyName(
          key
        )}.`
      );
    }
  }

  private createAndCacheInstance<T>(
    key: DependencyKey<T>,
    initPromise: InitPromise<T>
  ) {
    recursionCounter += 1;

    this.assertRecursionNotTrappedInACircle(key);

    const ctor = initPromise.ctor;
    let thing: T;

    if (initPromise.lazyInstantiation) {
      const idle = new IdleValue<T>(() => this.doCreateInstance(key, ctor));
      thing = new Proxy(Object.create(null), {
        get(target: any, key: string | number | symbol): any {
          if (key in target) {
            return target[key];
          }
          const obj = idle.getValue();
          let prop = (obj as any)[key];
          if (typeof prop !== 'function') {
            return prop;
          }
          prop = prop.bind(obj);
          target[key] = prop;
          return prop;
        },
        set(_target: any, key: string | number | symbol, value: any): boolean {
          (idle.getValue() as any)[key] = value;
          return true;
        }
      }) as T;
    } else {
      thing = this.doCreateInstance(key, ctor);
    }

    recursionCounter -= 1;

    return thing;
  }

  private doCreateInstance<T>(id: DependencyKey<T>, ctor: Ctor<T>): T {
    const thing = this.createInstance(ctor);
    this.__putDependencyBack(id, thing);
    return thing;
  }

  private assertRecursionNotTrappedInACircle(id: DependencyKey<any>): void {
    if (recursionCounter > 10) {
      recursionCounter = 0; // Reset the value here. Otherwise test would fail.
      throw new Error(
        '[WeDI] "_createInstance" exceeds the limitation of recursion. There might be a circular dependency."'
      );
    }
  }

  private invokeDependencyFactory<T>(
    id: DependencyKey<T>,
    factory: FactoryItem<T>
  ): T {
    const dependencies = factory.deps?.map((dp) => this.getOrInit(dp)) || [];
    const thing = factory.useFactory.call(null, dependencies);

    this.collection.add(id, thing);

    return thing;
  }
}
