import {
  createIdentifier,
  DependencyCollection,
  Injector,
  Need,
  Optional
} from '../src'

describe('di-core', () => {
  const voidIdentifier = createIdentifier('void')

  describe('basics', () => {
    class A {}

    class B {
      constructor(public p: any, @Need(A) public a: A) {}
    }

    class C {
      key = 'wedi'
    }

    class D {
      constructor(@Optional(A) public a?: A) {}
    }

    class E {
      constructor(@Need(A) public a?: A) {}
    }

    const key = 'key'

    it('should support extra parameters', () => {
      const injector = new Injector(new DependencyCollection([A]))
      const b = injector.createInstance(B, key)

      expect(b.p).toBe(key)
    })

    it('should truncate extra parameters', () => {
      const injector = new Injector(new DependencyCollection([A]))
      const b = injector.createInstance(B, key, 'extra')

      expect(b.p).toBe(key)
      expect(b.a instanceof A).toBeTruthy()
    })

    it('should fill inadequate parameters with undefined', () => {
      const injector = new Injector(new DependencyCollection([A]))
      const b = injector.createInstance(B)

      expect(b.p).toBe(undefined)
    })

    it('should support adding dependencies', () => {
      const injector = new Injector()

      let c = injector.getOrInit(C, true)
      expect(c).toBe(null)

      injector.add(C)
      c = injector.getOrInit(C)
      expect(c.key).toBe('wedi')
    })

    it('should tolerate a missing optional dependency', () => {
      const injector = new Injector(new DependencyCollection([D]))
      const d = injector.getOrInit(D)

      expect(d!.a).toBe(null)
    })

    it('should raise error when a required dependency is missing', () => {
      const injector = new Injector(new DependencyCollection([E]))

      let error: Error
      try {
        injector.getOrInit(E)
      } catch (e) {
        error = e
      }
      expect(error!.message).toBe(
        '[wedi] "E" relies on a not provided dependency "A".'
      )
    })

    it('should return null when an optional thing is not retrievable', () => {
      const injector = new Injector()

      const nothing = injector.getOrInit(voidIdentifier, true)
      expect(nothing).toBe(null)
    })

    it('should raise error when a thing is not retrievable', () => {
      const injector = new Injector()

      let error: Error
      try {
        injector.getOrInit(voidIdentifier)
      } catch (e) {
        error = e
      }
      expect(error!.message).toBe(
        `[wedi] "void" is not provided by any injector.`
      )
    })
  })

  describe('work with different kinds of dependencies', () => {
    class A {}

    const id = createIdentifier('a')

    it('should support ctor', () => {
      const injector = new Injector(new DependencyCollection([A]))
      const instance = injector.getOrInit(A)

      expect(instance instanceof A).toBeTruthy()
    })

    it('should support identifier and useClass', () => {
      const injector = new Injector(
        new DependencyCollection([[id, { useClass: A }]])
      )
      const instance = injector.getOrInit(id)

      expect(instance instanceof A).toBeTruthy()
    })

    it('should support identifier and value (instance)', () => {
      const str = 'magic'
      const injector = new Injector(
        new DependencyCollection([[id, { useValue: str }]])
      )
      const value = injector.getOrInit(id)

      expect(value).toBe(str)
    })

    it('should support identifier and factory', () => {
      const str = 'factory'
      const factory = () => str
      const injector = new Injector(
        new DependencyCollection([[id, { useFactory: factory }]])
      )
      const value = injector.getOrInit(id)

      expect(value).toBe(str)
    })
  })

  describe('recursive initialization', () => {
    let initFlag = false
    const id = createIdentifier('a')

    class A {
      constructor() {
        initFlag = true
      }
    }

    class B {
      constructor(@id public a: any) {}
    }

    beforeEach(() => (initFlag = false))

    it('should recursively init for Identifier-useClass', () => {
      const injector = new Injector(
        new DependencyCollection([[id, { useClass: A }], B])
      )
      injector.getOrInit(B)

      expect(initFlag).toBeTruthy()
      expect(injector.getOrInit(id)).toBeTruthy()
    })

    it('should recursively init for Identifier-useFactory', () => {
      const injector = new Injector(
        new DependencyCollection([
          [
            id,
            {
              useFactory: (_a: A) => {
                return
              },
              deps: [A]
            }
          ],
          A
        ])
      )
      injector.getOrInit(id)

      expect(initFlag).toBeTruthy()
    })

    it('should detect circular dependency', () => {
      const id = createIdentifier('a')
      const id2 = createIdentifier('b')

      class A {
        constructor(@Need(id2) public _b: B) {}
      }

      class B {
        constructor(@Need(id) public _a: A) {}
      }

      const injector = new Injector(
        new DependencyCollection([
          [id, { useClass: A }],
          [id2, { useClass: B }]
        ])
      )

      let error: Error
      try {
        injector.getOrInit(id)
      } catch (e) {
        error = e
      }
      expect(error!.message).toBe(
        `[wedi] "createInstance" exceeds the limitation of recursion (10x). There might be a circular dependency among your dependency items. Last target was "b".`
      )
    })
  })

  describe('layered injectors', () => {
    const id = createIdentifier<{ log(): string }>('a&b')

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

    it('should layered injectors work', () => {
      const injector = new Injector(
        new DependencyCollection([[id, { useClass: A }]])
      )
      const childInjector = injector.createChild(
        new DependencyCollection([[id, { useClass: B }]])
      )

      expect(childInjector.getOrInit(id)?.log()).toBe('B')
    })

    it('should useClass initialize at the correct layer', () => {
      const injector = new Injector(
        new DependencyCollection([[id, { useClass: A }]])
      )
      const childInjector = injector.createChild()

      expect(childInjector.getOrInit(id)?.log()).toBe('A')
      expect(childInjector.getOrInit(id)?.log()).toBe('A')
    })
  })

  describe('lazy instantiation', () => {
    const id = createIdentifier('a')

    class A {
      value = 'a'

      constructor() {
        initFlag = true
      }

      log(): string {
        return '[wedi]'
      }
    }

    class B {
      constructor(@id private a: A) {}

      log(): string {
        return this.a.log()
      }

      getValue(): string {
        return this.a.value
      }

      setValue(val: string) {
        this.a.value = val
      }
    }

    let initFlag: boolean

    beforeEach(() => (initFlag = false))

    it('should lazy instantiation work', () => {
      const injector = new Injector(
        new DependencyCollection([
          B,
          [id, { useClass: A, lazyInstantiation: true }]
        ])
      )
      const instance = injector.getOrInit(B)
      expect(initFlag).toBeFalsy()

      expect(instance?.log()).toBe('[wedi]') // work for methods
      expect(instance?.getValue()).toBe('a') // work for properties
      expect(instance?.log()).toBe('[wedi]') // should cache methods
      expect(initFlag).toBeTruthy()

      instance?.setValue('b') // should set value work
      expect(instance?.getValue()).toBe('b')
    })

    it('should initialize on CPU idle', async () => {
      const injector = new Injector(
        new DependencyCollection([
          B,
          [id, { useClass: A, lazyInstantiation: true }]
        ])
      )
      injector.getOrInit(B)
      expect(initFlag).toBeFalsy()

      await new Promise<void>((res) => setTimeout(res, 200))
      expect(initFlag).toBeTruthy()
    })
  })

  describe('dispose', () => {
    it('should not be accessible after disposing', () => {
      const injector = new Injector(new DependencyCollection())

      injector.dispose()

      let error: Error
      try {
        injector.getOrInit(voidIdentifier)
      } catch (e) {
        error = e
      }
      expect(error!.message).toBe(
        '[wedi] Dependency collection is not accessible after it disposes!'
      )
    })
  })

  describe('class inheritance', () => {
    it('should support initialize inherited classes', () => {
      class A {}

      class B {}

      class C {
        constructor(@Need(A) public a: A) {}
      }

      class C2 extends C {
        constructor(@Need(A) a: A, @Need(B) public b: B) {
          super(a)
        }
      }

      const injector = new Injector(new DependencyCollection([A, B, C2]))
      const c2 = injector.getOrInit(C2)!

      expect((c2.a as any).__proto__ === A.prototype).toBeTruthy()
      expect((c2.b as any).__proto__ === B.prototype).toBeTruthy()
    })
  })
})
