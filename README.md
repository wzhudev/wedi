# wedi

A lightweight dependency injection (DI) library for TypeScript, along with a binding for React.

[![Codecov](https://img.shields.io/codecov/c/github/wendellhu95/wedi.svg?style=flat-square)](https://codecov.io/gh/wendellhu95/wedi)
[![npm package](https://img.shields.io/npm/v/wedi.svg?style=flat-square)](https://www.npmjs.org/package/wedi)
![GitHub license](https://img.shields.io/github/license/mashape/apistatus.svg?style=flat-square)

---

A TodoMVC [demo](https://wendellhu95.github.io/wedi-demo) built with wedi.

## Features

- Completely opt-in. It's up to you to decide when and where to apply dependency injection pattern.
- Provide a multi-level dependency injection system.
- Support injecting classes, instances, values and factories.
- Support React class component.
- Support React Hooks (functional component).

You can use wedi to:

- Manage your app's state.
- Reuse logic.
- Deal with cross-platform problems.
- Write code that is easy to understand and maintain.

## Usage

### Concepts

In case you are not familiar with dependency injection pattern, here are three major concepts in a dependency injection system you should know:

- **Dependency Item**: Anything that could be used by other classes or React components. Usually they are identified by `key`s. A dependency could be a class, a value or a function, etc.
- **Provider** (a.k.a injector). The manager of dependency items. It _provides_ dependency items and instantiate or evaluate dependency items at consumers' need.
- **Consumer**: They consume dependency items. They use `key`s to get dependency items. A consumers can be a dependency item at the same time.

### Dependency Item

wedi supports different kinds of dependency items, including classes, instances, values and factory functions.

#### `key` of a Dependency Item

When you provide a dependency item, you're actually injecting a pair of key & value. The value is the item, and the `key` is the identifier of that item.

`key` could be a class, or an identifier returned by `createIdentifier`.

```ts
import { createIdentifier } from 'wedi';

export interface IPlatform {
  // properties
  // methods
}

export const IPlatformService = createIdentifier<IPlatformService>('platform');
```

You can use the same name for a variable and a type in TypeScript. Personally, I recommend to use `I` as prefix.

#### Class as Dependency Item

An ES6 class could be a dependency item. You can declare its dependencies in its constructor. wedi would analyze dependency relation among different classes.

You can use `Need` to declare that `FileService` depends on `IPlatformService`.

```ts
class FileService {
  constructor(@Need(IPlatformService) private logService: IPlatformService) {}
}
```

wedi would get or instantiates a `IPlatformService` before it instantiates `FileService`. And if it could not instantiate a `IPlatformService` it would throw an error.

And identifiers created by `createIdentifier` could also be used to define dependency relationship. It's equivalent to the demo above.

```ts
class SomeService {
  constructor(@IPlatformService private platform: IPlatformService) {}
}
```

You can also use the `Optional` decorator to declare an optional dependency.

```ts
class FileService {
  constructor(@Optional(OptionalDependency) private op?: OptionalDependency) {}
}
```

If `OptionalDependency` is not provided, wedi would not throw an error but use an `undefined` instead to instantiate `FileService`.

#### Value or Instance as a Dependency Item

It's easy to provide a value as dependency.

```ts
const configDep = [IConfig, { useValue: '2020' }];
```

#### Factory Function as a Dependency Item

You can create a dependency via `useFactory`, which is more flexible.

```ts
const useDep = [IUserService, {
  useFactory: (http: IHTTPService): IUserService => new TimeSerialUserService(http, TIME)，
  deps: [IHTTPService] // This factory depends on IHTTPService.
}]
```

#### Provide Items

And finally you should wrap all items in an array.

```ts
const dependencies = [
  LogService,
  FileService,
  [IConfig, { useValue: '2020' }],
  [
    IUserService,
    {
      useFactory: (http: IHTTPService): IUserService =>
        new TimeSerialUserService(http, TIME),
      deps: [IHTTPService]
    }
  ],
  [IHTTPService, WebHTTPService]
];
```

#### Singleton Dependency

For dependencies that should be singleton in the application, it's recommended to use `registerSingleton`.

```ts
registerSingleton(/* a dependency item */);
```

Dependencies would be provided by the root provider.

### In React

#### Class Component as Provider

The `Provide` decorator could inject items into the decorated component and its child components.

```ts
import { Provide } from 'wedi';
import { FileService } from 'services/file';
import { IPlatformService } from 'services/platform';

@Provide([
  FileService,
  [IPlatformService, { useClass: MobilePlatformService } ];
])
class ClassComponent extends Component {
  // FileService and IPlatformService is accessible in the component and its children.
}
```

#### Class Component as Consumer

Assign `contextType` to be `InjectionContext` and you can get whatever you need using the `Inject` decorator.

```ts
import { Inject, InjectionContext } from 'wedi';

import { IPlatformService } from 'services/platform';

class ClassConsumer extends Component {
  static contextType = InjectionContext;

  @Inject(FileService) fileService!: FileService; // Accessible to all methods of this class.
}
```

A class component can consume items provided by itself.

```ts
import { Inject, InjectionContext, Provide } from 'wedi';
import { IPlatformService } from 'services/platform';

@Provide([
  FileService,
  [IPlatformService, { useClass: MobilePlatformService }];
])
class ClassComponent extends Component {
  static contextType = InjectionContext;

  @Inject(IPlatformService) platformService!: IPlatformService; // This is MobilePlatformService.
}
```

You can pass `true` as the second parameter of `Inject` to indicate whether a dependency is optional.

```ts
class ClassComponent extends Component {
  static contextType = InjectionContext;

  @Inject(CanBeNullService, true) canBeNullService?: CanBeNullService; // This can be null.
}
```

#### Functional Component as Provider

`useCollection` and `InjectionLayer` could make functional components providers and make sure that items wouldn't get re-instantiated when components re-render.

```tsx
import { useCollection, Provider } from 'wedi';

function FunctionProvider() {
  const collection = useCollection([FileService]);

  return <Provider>{/* Child components can use FileService. */}</Provider>;
}
```

#### Functional Component as Consumer

`useDependency` can help you to hook in dependencies. You can assign the second parameter `true` to make the dependency optional.

```tsx
import { useDependency } from 'wedi';
import { FileService } from 'services/file';
import { LogService } from 'services/log';

function FunctionConsumer() {
  const fileService: FileService = useDependency(FileService);
  const log: LogService | null = useDependency(LogService, true);

  return {
    /* Use dependencies. */
  };
}
```

Note that functional cannot consume items it provided in `Provider`.

### Multi-level Injection System

wedi supports multi-level injection system. In other word, dependency items are scoped in wedi.

```tsx
@Provide([
  [IConfig, { useValue: 'A' }],
  [IConfigRoot, { useValue: 'inRoot' }]
])
class ParentProvider extends Component {
  render() {
    return <ChildProvider></ChildProvider>;
  }
}

@Provide([[IConfig, { useValue: 'B' }]])
class ChildProvider extends Component {
  render() {
    return <Consumer></Consumer>;
  }
}

function Consumer() {
  const config = useDependency(IConfig);
  const rootConfig = useDependency(IConfigRoot);

  return (
    <div>
      {config}, {rootConfig}
    </div> // <div>B, inRoot</div>
  );
}
```

### Inject React Component

You can use React Component as dependency, too.

```tsx
const IDropdown = createIdentifier<any>('dropdown');
const IConfig = createIdentifier<any>('config');

const WebDropdown = function() {
  const dep = useDependency(IConfig); // Could use dependencies in its host environment.
  return <div>WeDropdown, {dep}</div>;
};

@Provide([
  [IDropdown, { useValue: WebDropdown }],
  [IConfig, { useValue: 'wedi' }]
])
class Header extends Component {
  static contextType = InjectionContext;

  @Inject(IDropdown) private dropdown: any;

  render() {
    const Dropdown = this.dropdown;
    return <Dropdown></Dropdown>; // WeDropdown, wedi
  }
}
```

### Work wih RxJS

It is easy to use RxJS with wedi to manage your app's state.

```tsx
import { Provide, useDependency, useDependencyValue } from 'wedi';

class CounterService {
  count = 0;
  counter$ = interval(1000).pipe(
    startWith(0),
    map(() => this.count++)
  );
}

@Provide([CounterService])
class App extends Component {
  render() {
    return <Display />;
  }
}

function Display() {
  const counter = useDependency(CounterService);
  const count = useDependencyValue(counter.counter$);

  return <div>{count}</div>; // 0, 1, 2, 3 ...
}
```

### Use the Core Directly

You can use wedi without React.

#### DependencyCollection

`DependencyCollection` is used to collect all dependencies.

```ts
const collection = new DependencyCollection([
  // ...items
]);
```

#### Injector

`Injector` is the one who instantiates, provides and manages dependencies. And they will form a layered injection system.

```tsx
const injector = new Injector(collection);
```

- `createChild`, create a child injector of the current injector.
- `get`. Get a dependency. If it's not instantiated the method would return `null`. And if the dependency is not provided in the current injector, the injector would look up to its ancestor injectors.
- `getOrInit`. Get a dependency. If there's no such dependency instantiated, `Injector` would create one. And if the dependency is not provided in the current injector, the injector would call its parent recursively.
- `createInstance`, instantiate an item with custom parameters.

## License

MIT
