import {
  createIdentifier,
  DependencyCollection,
  Injector,
  Need,
  Optional
} from '../src';

describe('di-core', () => {
  describe('different kinds of dependencies', () => {
    class A {}

    const id = createIdentifier('a');

    it('should support ctor', () => {
      const injector = new Injector(new DependencyCollection([A]));
      const instance = injector.getOrInit(A);

      expect(instance instanceof A).toBeTruthy();
    });

    it('should support identifier and useClass', () => {
      const injector = new Injector(
        new DependencyCollection([[id, { useClass: A }]])
      );
      const instance = injector.getOrInit(id);

      expect(instance instanceof A).toBeTruthy();
    });

    it('should support identifier and value (instance)', () => {
      const str = 'magic';
      const injector = new Injector(
        new DependencyCollection([[id, { useValue: str }]])
      );
      const value = injector.getOrInit(id);

      expect(value).toBe(str);
    });

    it('should support identifier and factory', () => {
      const str = 'factory';
      const factory = () => str;
      const injector = new Injector(
        new DependencyCollection([[id, { useFactory: factory }]])
      );
      const value = injector.getOrInit(id);

      expect(value).toBe(str);
    });
  });

  describe('recursive initialization', () => {
    let initFlag = false;
    const id = createIdentifier('a');

    class A {
      constructor() {
        initFlag = true;
      }
    }

    class B {
      constructor(@id public a: any) {}
    }

    beforeEach(() => (initFlag = false));

    it('should recursively init for Identifier-useClass', () => {
      const injector = new Injector(
        new DependencyCollection([[id, { useClass: A }], B])
      );
      injector.getOrInit(B);

      expect(initFlag).toBeTruthy();
      expect(injector.getOrInit(id)).toBeTruthy();
    });

    it('should recursively init for Identifier-Factory', () => {
      const injector = new Injector(
        new DependencyCollection([
          [
            id,
            {
              useFactory: (_a: A) => {
                return;
              },
              deps: [A]
            }
          ],
          A
        ])
      );
      injector.getOrInit(id);

      expect(initFlag).toBeTruthy();
    });
  });

  describe('layered injectors', () => {
    const id = createIdentifier<{ log(): string }>('a&b');

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

    it('should layered injectors work', () => {
      const injector = new Injector(
        new DependencyCollection([[id, { useClass: A }]])
      );
      const childInjector = injector.createChild(
        new DependencyCollection([[id, { useClass: B }]])
      );

      expect(childInjector.getOrInit(id)?.log()).toBe('B');
    });

    it('should useClass initialize at the correct layer', () => {
      const injector = new Injector(
        new DependencyCollection([[id, { useClass: A }]])
      );
      const childInjector = injector.createChild();

      expect(childInjector.getOrInit(id)?.log()).toBe('A');
      expect(childInjector.get(id)?.log()).toBe('A');
    });
  });

  describe('initialization', () => {
    it('should raise error when a required dependency is missing', () => {
      class A {}

      class B {
        constructor(@Need(A) public a: A) {}
      }

      const injector = new Injector(new DependencyCollection([B]));

      expect(() => {
        injector.getOrInit(B);
      }).toThrowError();
    });

    it('should tolerate a missing optional dependency', () => {
      class A {}

      class B {
        constructor(@Optional(A) public a?: A) {}
      }

      const injector = new Injector(new DependencyCollection([B]));
      const thing = injector.getOrInit(B);

      expect(thing!.a).toBe(null);
    });
  });

  describe('lazy instantiation', () => {
    const id = createIdentifier('a');

    class A {
      constructor() {
        initFlag = true;
      }

      log(): string {
        return '[WeDI]';
      }
    }

    class B {
      constructor(@id private a: A) {}

      log(): string {
        return this.a.log();
      }
    }

    let initFlag: boolean;

    beforeEach(() => (initFlag = false));

    it('should lazy instantiation work', () => {
      const injector = new Injector(
        new DependencyCollection([
          B,
          [id, { useClass: A, lazyInstantiation: true }]
        ])
      );
      const instance = injector.getOrInit(B);
      expect(initFlag).toBeFalsy();

      const log = instance?.log();
      expect(log).toBe('[WeDI]');
      expect(initFlag).toBeTruthy();
    });

    it('should initialize on CPU idle', async () => {
      const injector = new Injector(
        new DependencyCollection([
          B,
          [id, { useClass: A, lazyInstantiation: true }]
        ])
      );
      injector.getOrInit(B);
      expect(initFlag).toBeFalsy();

      await new Promise<void>((res) => setTimeout(res, 200));
      expect(initFlag).toBeTruthy();
    });
  });

  describe('dispose', () => {
    it('should not be accessible after disposion', () => {
      const id = createIdentifier('void');
      const injector = new Injector(new DependencyCollection());

      injector.dispose();
      expect(() => injector.get(id)).toThrow(
        '[WeDI] Dependency collection is not accessible after it disposes!'
      );
    });
  });

  describe('falsy situations', () => {
    it('should return null when dependency is not retreivable', () => {
      const id = createIdentifier('void');
      const injector = new Injector(new DependencyCollection());

      const nothing = injector.get(id);
      expect(nothing).toBe(null);
    });

    it('should raise error when a dependency cannot be initialized', () => {
      class A {}

      class B {
        constructor(@Need(A) a: A) {}
      }

      const injector = new Injector(new DependencyCollection([B]));

      expect(() => injector.getOrInit(B)).toThrow(
        '[WeDI] "B" relies on a not provided dependency "A".'
      );
    });

    it('should detect circular dependency', () => {
      const id = createIdentifier('a');
      const id2 = createIdentifier('b');

      class A {
        constructor(@Need(id2) public b: B) {}
      }

      class B {
        constructor(@Need(id) public a: A) {}
      }

      const injector = new Injector(
        new DependencyCollection([
          [id, { useClass: A }],
          [id2, { useClass: B }]
        ])
      );

      expect(() => {
        injector.getOrInit(id);
      }).toThrow(
        `[WeDI] "_createInstance" exceeds the limitation of recursion. There might be a circular dependency.`
      );
    });
  });

  describe('class inheritence', () => {
    it('should support initialize inherited classes', () => {
      class A {}

      class B {}

      class C {
        constructor(@Need(A) public a: A) {}
      }

      class C2 extends C {
        constructor(@Need(A) a: A, @Need(B) public b: B) {
          super(a);
        }
      }

      const injector = new Injector(new DependencyCollection([A, B, C2]));
      const c2 = injector.getOrInit(C2)!;

      expect((c2.a as any).__propo__ === A.prototype);
      expect((c2.b as any).__propo__ === B.prototype);
    });
  });
});
