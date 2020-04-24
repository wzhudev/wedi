import React from 'react'
import {
  useCollection,
  Provide,
  Provider,
  Disposable,
  useDependency,
  useDependencyValue
} from '../../../src'
import { Subject } from 'rxjs'
import { Observable } from 'rxjs'
import { interval } from 'rxjs'
import { takeUntil, scan } from 'rxjs/operators'
import { useState } from 'react'
import { useEffect } from 'react'

// 简单的 demo 并不能显示出 wedi 的威力，得实际生产场景中的需求才能发挥出来

class TimerService implements Disposable {
  dispose$: Subject<void>
  counter$: Observable<number>

  constructor() {
    this.dispose$ = new Subject<void>()
    this.counter$ = interval(1000).pipe(
      takeUntil(this.dispose$),
      scan((acc) => acc + 1, 0)
    )
  }

  dispose(): void {
    this.dispose$.next()
    this.dispose$.complete()
  }
}

export function RxDemo() {
  const c = useCollection([TimerService])

  return (
    <Provider collection={c}>
      <Displayer />
    </Provider>
  )
}

function Displayer() {
  const tS = useDependency(TimerService)
  const t = useDependencyValue(tS.counter$)

  return <div>{t}</div>
}

function Displayer2() {
  const [count, setCounter] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCounter(count + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return <div>{count}</div>
}
