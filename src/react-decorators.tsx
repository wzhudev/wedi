import React, { Component, ComponentClass, createElement } from 'react';

import { DependencyCollection } from './collection';
import { Provider } from './context';
import { Injector } from './injector';
import { Ctor, DependencyItem, Identifier } from './typings';
import { getDependencyKeyName } from './utils';

/**
 * An decorator that could be used on a React class component. To provide a
 * injection context on that component.
 */
export function Provide(items: DependencyItem<any>[]) {
  return function(target: any): any {
    function getChild(this: Component) {
      return createElement(target, this.props);
    }

    class ProviderWrapper extends Component<any, any> {
      $$collection: DependencyCollection;

      constructor(props: any, context: any) {
        super(props, context);
        this.$$collection = new DependencyCollection(items);
      }

      componentWillUnmount(): void {
        this.$$collection.dispose();
      }

      render() {
        return (
          <Provider collection={this.$$collection}>
            {getChild.call(this)}
          </Provider>
        );
      }
    }

    (ProviderWrapper as ComponentClass).displayName = `ProviderWrapper.${target.name}`;

    return ProviderWrapper;
  };
}

/**
 * Returns decorator that could be used on a property of
 * a React class component to inject a dependency.
 */
export function Inject<T>(
  id: Identifier<T> | Ctor<T>,
  optional: boolean = false
) {
  return function(target: any, propName: string, _originDescriptor?: any): any {
    const descriptor = {
      // When user is trying to get the service, get it from the injector in
      // the current context.
      get(): T | null {
        // tslint:disable-next-line:no-invalid-this
        const thisAsComponent: Component<any> = this as any;

        ensureInjectionContextExists(thisAsComponent);

        const injector: Injector = thisAsComponent.context.injector;
        const thing = injector && injector.getOrInit(id);

        if (!optional && !thing) {
          throw Error(
            `[wedi] Cannot get an instance of "${getDependencyKeyName(id)}".`
          );
        }

        return thing || null;
      },
      set(_value: never) {
        throw Error(
          `[wedi] You can never set value to a dependency. Check "${propName}" of "${getDependencyKeyName(
            id
          )}".`
        );
      }
    };

    return descriptor;
  };
}

function ensureInjectionContextExists(component: Component<any>): void {
  if (!component.context || !component.context.injector) {
    throw Error(
      `[wedi] You should make "InjectorContext" as ${component.constructor.name}'s default context type. ` +
        'If you want to use multiple context, please check this page on React documentation. ' +
        'https://reactjs.org/docs/context.html#classcontexttype'
    );
  }
}
