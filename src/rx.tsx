import { useEffect, useState } from 'react';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * unwrap an observable value, return it to the component for rendering, and
 * trigger re-render when value changes
 *
 * **IMPORTANT**. Parent and child components should not subscribe to the same
 * observable, otherwise unnecessary re-render would be triggered. Instead, the
 * top-most component should subscribe and pass value of the observable to
 * its offspring, by props or context. Unlike Angular, React does not check
 * dirty values and mark as dirty before updates.
 */
export function useDependencyValue<T>(
  depValue: Observable<T>,
  defaultValue?: T
): T | undefined {
  const _defaultValue: T | undefined =
    defaultValue instanceof BehaviorSubject && defaultValue === undefined
      ? defaultValue.getValue()
      : defaultValue;

  const [value, setValue] = useState(_defaultValue);

  useEffect(() => {
    const subscription = depValue.subscribe((val: T) => setValue(val));
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
