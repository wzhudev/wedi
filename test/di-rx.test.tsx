import { act, render } from '@testing-library/react';
import React, { Component } from 'react';
import { interval } from 'rxjs';
import { scan, startWith } from 'rxjs/operators';

import {
  Provide,
  Provider,
  useCollection,
  useDependency,
  useDependencyValue
} from '../src';

describe('di-rx', () => {
  it('should demo works with RxJS', async () => {
    class CounterService {
      counter$ = interval(1000).pipe(
        startWith(0),
        scan((acc) => acc + 1)
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
      const value = useDependencyValue(counter!.counter$, 0);

      return <div>{value}</div>;
    }

    const { container } = render(<App />);
    expect(container.firstChild!.textContent).toBe('0');

    await act(
      () => new Promise<undefined>((res) => setTimeout(() => res(), 3100))
    );
    expect(container.firstChild!.textContent).toBe('3');
  });

  it('should not trigger unnecesary re-render when handled correctly', async () => {
    let childRenderCount = 0;

    class CounterService {
      counter$ = interval(1000).pipe(
        startWith(0),
        scan((acc) => acc + 1)
      );
    }

    function App() {
      const collection = useCollection([CounterService]);

      return (
        <Provider collection={collection}>
          <Parent />
        </Provider>
      );
    }

    function Parent() {
      const counterService = useDependency(CounterService);
      const count = useDependencyValue(counterService.counter$, 0);

      return <Child count={count} />;
    }

    function Child(props: { count?: number }) {
      childRenderCount += 1;
      console.log(props.count);
      return <div>{props.count}</div>;
    }

    const { container } = render(<App />);
    expect(container.firstChild!.textContent).toBe('0');
    expect(childRenderCount).toBe(1);

    await act(
      () => new Promise<undefined>((res) => setTimeout(() => res(), 3100))
    );
    expect(container.firstChild!.textContent).toBe('3');
    expect(childRenderCount).toBe(4);
  });
});
