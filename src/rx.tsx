/**
 * This file contains some exploration of reactive programming and
 * dependency injection in React.
 */

import { useEffect, useState } from 'react';
import { Observable } from 'rxjs';

/**
 * Unwrap an observable value, return it to the component for rendering, and
 * trigger re-render when value changes.
 */
export function useDependencyValue<T>(
  depValue: Observable<T>,
  defaultValue?: T
): T | null {
  const [value, setValue] = useState(defaultValue || null);

  useEffect(() => {
    const subscription = depValue.subscribe((val) => setValue(val));
    return () => subscription.unsubscribe();
  }, []);

  return value;
}

export function useUpdateBinder(update$: Observable<void>): void {
  const [, setCount] = useState(0);

  useEffect(() => {
    const sub = update$.subscribe(() => setCount((prev) => prev + 1));
    return () => sub.unsubscribe();
  }, []);
}
