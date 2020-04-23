import { fireEvent, render } from '@testing-library/react'
import React, { Component, useState } from 'react'

import { act } from 'react-dom/test-utils'
import {
  createIdentifier,
  Inject,
  InjectionContext,
  Provide,
  Provider,
  registerSingleton,
  useCollection,
  useDependency
} from '../src'

const id = createIdentifier('a')
const id2 = createIdentifier('b')
const id3 = createIdentifier('c')

interface Log {
  log(): string
}

class A implements Log {
  log(): string {
    return '[wedi]'
  }
}

class B implements Log {
  log(): string {
    return '[WePuppy]'
  }
}

let initializationCounter = 0

class C {
  constructor() {
    initializationCounter += 1
  }

  getCounter(): number {
    return initializationCounter
  }
}

registerSingleton(id, A)
registerSingleton(id2, A)
registerSingleton(id2, B)
registerSingleton(id3, C)

describe('di-core-singleton', () => {
  it('should singleton work', () => {
    @Provide([])
    class App extends Component {
      static contextType = InjectionContext

      @Inject(id) private log!: Log

      render() {
        return <div>{this.log.log()}</div>
      }
    }

    const { container } = render(<App />)

    expect(container.firstChild!.textContent).toBe('[wedi]')
  })

  it('should use the latest registered dependency', () => {
    @Provide([])
    class App extends Component {
      static contextType = InjectionContext

      @Inject(id2) private log!: Log

      render() {
        return <div>{this.log.log()}</div>
      }
    }

    const { container } = render(<App />)

    expect(container.firstChild!.textContent).toBe('[WePuppy]')
  })

  it('should singleton work with root injector in functional component', async () => {
    function App() {
      const [count, setCount] = useState(0)
      const collection = useCollection()

      return (
        <Provider collection={collection}>
          <div onClick={() => setCount(count + 1)}>
            {count}
            <Child />
          </div>
        </Provider>
      )
    }

    function Child() {
      const c = useDependency(id3) as C

      return <>, {c.getCounter()}</>
    }

    const { container } = render(<App />)

    expect(container.firstChild!.textContent).toBe('0, 1')

    await act(() => {
      fireEvent.click(container.firstElementChild!)
      return new Promise<void>((res) => setTimeout(res, 20))
    })

    expect(container.firstChild!.textContent).toBe('1, 1')
  })
})
