import { act, fireEvent, render } from '@testing-library/react'
import React, { Component, FunctionComponent, useState } from 'react'

import {
  createIdentifier,
  DependencyCollection,
  Disposable,
  Inject,
  InjectionContext,
  Injector,
  Provide,
  Provider,
  useCollection,
  useDependency,
  useMultiDependencies,
  connectProvider
} from '../src'

class Log {
  log(): string {
    return 'wedi'
  }
}

describe('di-react', () => {
  describe('class component', () => {
    it('should support class component provider', () => {
      @Provide([Log])
      class App extends Component {
        static contextType = InjectionContext

        @Inject(Log) private log!: Log

        render() {
          return <div>{this.log.log()}</div>
        }
      }

      const { container } = render(<App />)
      expect(container.firstChild!.textContent).toBe('wedi')
    })

    it('should raise error when user tries to set dependency', () => {
      class A {}

      let callback = () => {}

      @Provide([A])
      class App extends Component {
        static contextType = InjectionContext

        @Inject(A) public a!: A

        render() {
          // use a callback instead of tracking an async event
          callback = () => (this.a = null as any)
          return <div>wedi</div>
        }
      }

      render(<App />)

      let error: Error
      try {
        callback()
      } catch (e) {
        error = e
      }
      expect(error!.message).toBe(
        '[wedi] You can never set value to a dependency. Check "a" of "A".'
      )
    })

    it('should raise error when component context is not set to InjectionContext', () => {
      @Provide([Log])
      class App extends Component {
        @Inject(Log) private log!: Log

        render() {
          return <div>{this.log.log()}</div>
        }
      }

      let error: Error
      try {
        render(<App />)
      } catch (e) {
        error = e
      }
      expect(error!.message).toBe(
        `[wedi] You should make "InjectorContext" as App's default context type. If you want to use multiple context, please check this page on React documentation. https://reactjs.org/docs/context.html#classcontexttype`
      )
    })

    it('should raise error when injection is not optional and item is not provided', () => {
      @Provide([])
      class App extends Component {
        static contextType = InjectionContext

        @Inject(Log) private log!: Log

        render() {
          return <div>{this.log.log()}</div>
        }
      }

      let error: Error
      try {
        render(<App />)
      } catch (e) {
        error = e
      }
      expect(error!.message).toBe('[wedi] Cannot get an instance of "Log".')
    })

    it('should tolerate when dependency is optional', () => {
      @Provide([])
      class App extends Component {
        static contextType = InjectionContext

        @Inject(Log, true) private log!: Log

        render() {
          return <div>{this.log?.log() || 'null'}</div>
        }
      }

      const { container } = render(<App />)
      expect(container.firstElementChild!.textContent).toBe('null')
    })
  })

  describe('functional component', () => {
    it('should `connectProvider` work', () => {
      class Log {
        log(): string {
          return 'wedi'
        }
      }

      const App = connectProvider(
        function() {
          const log = useDependency(Log)

          return <div>{log.log()}</div>
        },
        {
          collection: new DependencyCollection([Log])
        }
      )

      const { container } = render(<App />)
      expect(container.firstElementChild!.textContent).toBe('wedi')
    })

    it('should useMultipleDependencies work', () => {
      class Log {
        log(): string {
          return 'wedi'
        }
      }

      class Counter {
        count = 0
      }

      function App() {
        const collection = useCollection([Log, Counter])

        return (
          <Provider collection={collection}>
            <Child />
          </Provider>
        )
      }

      function Child() {
        const [log, counter] = useMultiDependencies([Log, Counter])

        return (
          <div>
            {log?.log()}, {counter?.count}
          </div>
        )
      }

      const { container } = render(<App />)
      expect(container.firstElementChild!.textContent).toBe('wedi, 0')
    })

    it('should not recreate collection when function component container re-renders', async () => {
      let count = 0

      class Counter {
        constructor() {
          count += 1
        }

        getCount(): number {
          return count
        }
      }

      function Parent() {
        const collection = useCollection([Counter])
        const [visible, setVisible] = useState(false)
        return (
          <div onClick={() => setVisible(!visible)}>
            <Provider collection={collection}>
              {visible ? <Children /> : <div>Nothing</div>}
            </Provider>
          </div>
        )
      }

      function Children() {
        const counter = useDependency<Counter>(Counter)
        return <div>{counter.getCount()}</div>
      }

      const { container } = render(<Parent />)
      expect(count).toBe(0)

      await act(() => {
        fireEvent.click(container.firstElementChild!)
        return new Promise<undefined>((res) => setTimeout(res, 200))
      })
      expect(count).toBe(1)

      await act(() => {
        fireEvent.click(container.firstElementChild!)
        return new Promise<undefined>((res) => setTimeout(res, 200))
      })
      expect(count).toBe(1)
    })

    it('should throw error when a dependency is not retrievable and not optional', () => {
      function AppContainer() {
        const collection = useCollection([])

        return (
          <Provider collection={collection}>
            <App />
          </Provider>
        )
      }

      function App() {
        const log = useDependency(Log)

        return <div>{log.log()}</div>
      }

      let error: Error
      try {
        render(<AppContainer />)
      } catch (e) {
        error = e
      }
      expect(error!.message).toBe(`[wedi] Cannot get an instance of "Log".`)
    })

    it('should raise error when no collection nor injector is provided', () => {
      function App() {
        return (
          <Provider>
            <div>wedi</div>
          </Provider>
        )
      }

      let error: Error
      try {
        render(<App />)
      } catch (e) {
        error = e
      }
      expect(error!.message).toBe(
        '[wedi] should provide a collection or an injector to "Provider".'
      )
    })

    it('should tolerate when dependency is optional', () => {
      function AppContainer() {
        const collection = useCollection([])

        return (
          <Provider collection={collection}>
            <App />
          </Provider>
        )
      }

      function App() {
        const log = useDependency(Log, true)

        return <div>{log?.log() || 'wedi'}</div>
      }

      const { container } = render(<AppContainer />)
      expect(container.firstElementChild!.textContent).toBe('wedi')
    })
  })

  it('should support layered providers', () => {
    const id = createIdentifier<{ log(): string }>('a&b')
    const id2 = createIdentifier<{ log(): string }>('c')

    class A {
      log(): string {
        return 'A'
      }
    }

    class B {
      log(): string {
        return 'B'
      }
    }

    class C {
      log(): string {
        return 'C'
      }
    }

    @Provide([
      [id, { useClass: A }],
      [id2, { useClass: C }]
    ])
    class Parent extends Component {
      render() {
        return <Child />
      }
    }

    @Provide([[id, { useClass: B }]])
    class Child extends Component {
      render() {
        return <GrandChild />
      }
    }

    function GrandChild() {
      const aOrb = useDependency(id)
      const c = useDependency(id2)

      return (
        <div>
          {aOrb?.log()}, {c?.log()}
        </div>
      )
    }

    const { container } = render(<Parent />)
    expect(container.firstElementChild?.textContent).toBe('B, C')
  })

  describe('should dispose', () => {
    it('should dispose when class component destroys', async () => {
      let disposed = false

      class A implements Disposable {
        log(): string {
          return 'a'
        }

        dispose(): void {
          disposed = true
        }
      }

      function Parent() {
        const [show, setShow] = useState(true)
        return (
          <div onClick={() => setShow(!show)}>
            {show ? <Child /> : <div>null</div>}
          </div>
        )
      }

      @Provide([A])
      class Child extends Component {
        static contextType = InjectionContext

        @Inject(A) private a!: A

        render() {
          return <>{this.a.log()}</>
        }
      }

      const { container } = render(<Parent />)
      expect(container.firstElementChild!.textContent).toBe('a')

      await act(() => {
        fireEvent.click(container.firstElementChild!)
        return new Promise<void>((res) => setTimeout(res, 200))
      })

      expect(disposed).toBeTruthy()
    })

    it('should dispose when functional component destroys', async () => {
      let disposed = false

      class A implements Disposable {
        log(): string {
          return 'a'
        }

        dispose(): void {
          disposed = true
        }
      }

      function Parent() {
        const [show, setShow] = useState(true)
        return (
          <div onClick={() => setShow(!show)}>
            {show ? <Child /> : <div>null</div>}
          </div>
        )
      }

      function Child() {
        const collection = useCollection([A])

        return (
          <Provider collection={collection}>
            <GrandChild />
          </Provider>
        )
      }

      function GrandChild() {
        const a = useDependency(A)!

        return <div>{a.log()}</div>
      }

      const { container } = render(<Parent />)
      expect(container.firstElementChild!.textContent).toBe('a')

      await act(() => {
        fireEvent.click(container.firstElementChild!)
        return new Promise<void>((res) => setTimeout(res, 200))
      })

      expect(disposed).toBeTruthy()
    })
  })

  it('should support inject React component', () => {
    const IDropdown = createIdentifier<FunctionComponent>('dropdown')
    const IConfig = createIdentifier<any>('config')

    const WebDropdown = function() {
      const dep = useDependency(IConfig)
      return <div>WeDropdown, {dep}</div>
    }

    @Provide([
      [IDropdown, { useValue: WebDropdown }],
      [IConfig, { useValue: 'wedi' }]
    ])
    class Header extends Component {
      static contextType = InjectionContext

      @Inject(IDropdown) private dropdown!: FunctionComponent

      render() {
        const Dropdown = this.dropdown
        return <Dropdown />
      }
    }

    const { container } = render(<Header />)
    expect(container.firstChild!.textContent).toBe('WeDropdown, wedi')
  })

  it('should support parent injector outside of React tree', () => {
    const injector = new Injector(new DependencyCollection([Log]))

    function App() {
      return (
        <Provider injector={injector}>
          <Children />
        </Provider>
      )
    }

    function Children() {
      const logger = useDependency(Log)

      return <div>{logger.log()}</div>
    }

    const { container } = render(<App />)
    expect(container.firstChild!.textContent).toBe('wedi')
  })
})
