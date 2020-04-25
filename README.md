# wedi

A lightweight dependency injection (DI) library for TypeScript, along with a binding for React.

[![Codecov](https://img.shields.io/codecov/c/github/wendellhu95/wedi.svg?style=flat-square)](https://codecov.io/gh/wendellhu95/wedi)
[![npm package](https://img.shields.io/npm/v/wedi.svg?style=flat-square)](https://www.npmjs.org/package/wedi)
![GitHub license](https://img.shields.io/github/license/mashape/apistatus.svg?style=flat-square)

---

## What is wedi?

**wedi** is a lightweight toolkit to let you use dependency injection (DI) pattern in TypeScript and especially React with TypeScript.

- Completely opt-in. It's up to you to decide when and where to apply dependency injection pattern.
- Provide a multi-level dependency injection system.
- Support injecting classes, instances, values and factories.
- Support React class component.
- Support React Hooks (functional component).

You can use wedi to:

- Mange state of applications
- Reuse logic
- Deal with cross-platform problems
- Write code that is loosely-coupled, easy to understand and maintain

## Getting Started

_This guide assumes basic knowledge of TypeScript, React and dependency injection pattern. If you are totally innocent of any idea above, it might not be the best idea to get started with wedi._

Install wedi via npm or yarn:

```shell
npm install wedi

# or
yarn add wedi
```

Add you need to enable decorator in tsconfig.json.

```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

## Declare a Dependency

Declare something that another class or React component could depend on is very simple. It could just be easy as a ES6 class!

```tsx
class AuthenticationService {
  avatar = 'https://img.yourcdn.com/avatar'
}
```

wedi let you declare other kinds of dependencies such as plain values and factory functions. Read Dependencies for more details.

## Use in React

You could provide a dependency in a React component, and use it in its child components.

```tsx
function App() {
  const collection = useCollection([AuthenticationService])

  return <Provider collection={collection}>
    <DeeplyWrapped>
      <Profile />
    </DeeplyWrapper>
  </Provider>
}

function Profile() {
  const authS = useDependency(AuthenticationService)

  return <img src={authS.avatar} />
}
```

## With RxJS

wedi provide some Hooks that helps you use wedi with RxJS smoothly.

```tsx
function ReRenderOnNewValue() {
  const notificationS = useDependency(NotificationService);
  const val = useDependencyValue(notificationS.data$)

  // re-return when data$ emits a new value
}
```

For more, please read With [RxJS](/rx) for more details.

## Demo

Here is a TodoMVC [demo](https://wendellhu95.github.io/wedi-demo) built with wedi.

## Links

- [GitHub Repo](https://github.com/wendellhu95/wedi)
- [Doc](https://wedi.wendellhu95.xyz)

## License

MIT. Copyright Wendell Hu 2019-2020.
