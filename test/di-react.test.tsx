import { act, fireEvent, render } from '@testing-library/react';
import React, { Component, useState } from 'react';

import {
  createIdentifier,
  IDisposable,
  Inject,
  InjectionContext,
  Provide,
  Provider,
  useCollection,
  useDependency
} from '../src';

class Log {
  log(): string {
    return '[WeDI]';
  }
}

describe('di-react', () => {
  it('should support class component provider', () => {
    @Provide([Log])
    class App extends Component {
      static contextType = InjectionContext;

      @Inject(Log) private log!: Log;

      render() {
        return <div>{this.log.log()}</div>;
      }
    }

    const { container } = render(<App />);
    expect(container.firstChild!.textContent).toBe('[WeDI]');
  });

  it('should support functional component provider, and not recreate collection when function component container re-renders', async () => {
    let count = 0;

    class Counter {
      constructor() {
        count += 1;
      }

      getCount(): number {
        return count;
      }
    }

    function Parent() {
      const collection = useCollection([Counter]);
      const [visible, setVisible] = useState(false);
      return (
        <div onClick={() => setVisible(!visible)}>
          <Provider collection={collection}>
            {visible ? <Children></Children> : <div>Nothing</div>}
          </Provider>
        </div>
      );
    }

    function Children() {
      const counter = useDependency<Counter>(Counter);
      return <div>{counter.getCount()}</div>;
    }

    const { container } = render(<Parent />);
    expect(count).toBe(0);

    await act(() => {
      fireEvent.click(container.firstElementChild!);
      return new Promise<undefined>((res) => setTimeout(res, 200));
    });
    expect(count).toBe(1);

    await act(() => {
      fireEvent.click(container.firstElementChild!);
      return new Promise<undefined>((res) => setTimeout(res, 200));
    });
    expect(count).toBe(1);
  });

  it('should support layered providers', () => {
    const id = createIdentifier<{ log(): string }>('a&b');
    const id2 = createIdentifier<{ log(): string }>('c');

    class A {
      log(): string {
        return 'A';
      }
    }

    class B {
      log(): string {
        return 'B';
      }
    }

    class C {
      log(): string {
        return 'C';
      }
    }

    @Provide([
      [id, { useClass: A }],
      [id2, { useClass: C }]
    ])
    class Parent extends Component {
      render() {
        return <Child></Child>;
      }
    }

    @Provide([[id, { useClass: B }]])
    class Child extends Component {
      render() {
        return <GrandChild></GrandChild>;
      }
    }

    function GrandChild() {
      const aOrb = useDependency(id);
      const c = useDependency(id2);

      return (
        <div>
          {aOrb?.log()}, {c?.log()}
        </div>
      );
    }

    const { container } = render(<Parent />);
    expect(container.firstElementChild?.textContent).toBe('B, C');
  });

  describe('optional injection', () => {
    it('should raise error when injection is not optional and item is not provided', () => {
      @Provide([])
      class App extends Component {
        static contextType = InjectionContext;

        @Inject(Log) private log!: Log;

        render() {
          return <div>{this.log.log()}</div>;
        }
      }

      expect(() => render(<App></App>)).toThrow(
        // Weird that the test passes while leaving an uncaught error in the console...
        '[WeDI] Cannot get an instance of "Log".'
      );
    });

    it('should tolerate when injection is optional', () => {
      @Provide([])
      class App extends Component {
        static contextType = InjectionContext;

        @Inject(Log, true) private log!: Log;

        render() {
          return <div>{this.log?.log() || 'null'}</div>;
        }
      }

      const { container } = render(<App />);
      expect(container.firstElementChild!.textContent).toBe('null');
    });
  });

  describe('should dispose', () => {
    it('should dispose when class component destroy', async () => {
      let disposed = false;

      class A implements IDisposable {
        log(): string {
          return 'a';
        }

        dispose(): void {
          disposed = true;
        }
      }

      function Parent() {
        const [show, setShow] = useState(true);
        return (
          <div onClick={() => setShow(!show)}>
            {show ? <Child></Child> : <div>null</div>}
          </div>
        );
      }

      @Provide([A])
      class Child extends Component {
        static contextType = InjectionContext;

        @Inject(A) private a!: A;

        render() {
          return <>{this.a.log()}</>;
        }
      }

      const { container } = render(<Parent></Parent>);
      expect(container.firstElementChild!.textContent).toBe('a');

      await act(() => {
        fireEvent.click(container.firstElementChild!);
        return new Promise<void>((res) => setTimeout(res, 200));
      });

      expect(disposed).toBeTruthy();
    });

    it('should dispose when functional component destroy', async () => {
      let disposed = false;

      class A implements IDisposable {
        log(): string {
          return 'a';
        }

        dispose(): void {
          disposed = true;
        }
      }

      function Parent() {
        const [show, setShow] = useState(true);
        return (
          <div onClick={() => setShow(!show)}>
            {show ? <Child></Child> : <div>null</div>}
          </div>
        );
      }

      function Child() {
        const collection = useCollection([A]);

        return (
          <Provider collection={collection}>
            <GrandChild></GrandChild>
          </Provider>
        );
      }

      function GrandChild() {
        const a = useDependency(A)!;

        return <div>{a.log()}</div>;
      }

      const { container } = render(<Parent></Parent>);
      expect(container.firstElementChild!.textContent).toBe('a');

      await act(() => {
        fireEvent.click(container.firstElementChild!);
        return new Promise<void>((res) => setTimeout(res, 200));
      });

      expect(disposed).toBeTruthy();
    });
  });

  it('should support inject React component', () => {
    const IDropdown = createIdentifier<any>('dropdown');
    const IConfig = createIdentifier<any>('config');

    const WebDropdown = function() {
      const dep = useDependency(IConfig);
      return <div>WeDropdown, {dep}</div>;
    };

    @Provide([
      [IDropdown, { useValue: WebDropdown }],
      [IConfig, { useValue: 'WeDI' }]
    ])
    class Header extends Component {
      static contextType = InjectionContext;

      @Inject(IDropdown) private dropdown!: any;

      render() {
        const Dropdown = this.dropdown;
        return <Dropdown></Dropdown>;
      }
    }

    const { container } = render(<Header />);
    expect(container.firstChild!.textContent).toBe('WeDropdown, WeDI');
  });
});
