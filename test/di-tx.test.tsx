import { act, render } from '@testing-library/react';
import React, { Component } from 'react';
import { interval } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import { Provide, useDependency, useDependencyValue } from '../src';

describe('di-rx', () => {
  // It should works other reactive programming libraries as well.
  // Here we use RxJS as an example.
  it('should demo works with RxJS', async () => {
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
});
