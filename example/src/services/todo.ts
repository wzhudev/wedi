import { Subject } from 'rxjs';
import { Need } from 'wedi';

import { SHOWING, StateService } from './state';
import { IStoreService } from './store/store';

function uuid(): string {
  /*jshint bitwise:false */
  let i;
  let random;
  let id = '';

  for (i = 0; i < 32; i++) {
    random = (Math.random() * 16) | 0;
    if (i === 8 || i === 12 || i === 16 || i === 20) {
      id += '-';
    }
    id += (i === 12 ? 4 : i === 16 ? (random & 3) | 8 : random).toString(16);
  }

  return id;
}

export interface ITodo {
  id: string;
  title: string;
  completed: boolean;
}

/**
 * Storing all todo items, and provide methods to manipulate them.
 */
export class TodoService {
  todos: ITodo[];
  updated$ = new Subject<void>();

  get shownTodos(): ITodo[] {
    return this.todos.filter((todo) => {
      switch (this.stateService.nowShowing) {
        case SHOWING.ACTIVE_TODOS:
          return !todo.completed;
        case SHOWING.COMPLETED_TODOS:
          return todo.completed;
        default:
          return true;
      }
    });
  }

  get todoCount(): number {
    return this.todos.length;
  }

  get activeTodoCount(): number {
    return this.todos.reduce(
      (acc, todo) => (todo.completed ? acc : acc + 1),
      0
    );
  }

  get completedCount(): number {
    return this.todos.length - this.activeTodoCount;
  }

  constructor(
    @Need(StateService) private stateService: StateService,
    @IStoreService private storeService: IStoreService
  ) {
    this.todos = this.storeService.store('TODO');
  }

  inform() {
    this.storeService.store('TODO', this.todos);
    this.updated$.next();
  }

  addTodo(title: string): void {
    this.todos = this.todos.concat({
      id: uuid(),
      title: title,
      completed: false
    });

    this.inform();
  }

  toggleAll(checked: boolean): void {
    this.todos = this.todos.map<ITodo>((todo: ITodo) => ({
      ...todo,
      completed: checked
    }));

    this.inform();
  }

  toggle(todoToToggle: ITodo) {
    this.todos = this.todos.map<ITodo>((todo: ITodo) => {
      return todo !== todoToToggle
        ? todo
        : { ...todo, completed: !todo.completed };
    });

    this.inform();
  }

  destroy(todo: ITodo) {
    this.todos = this.todos.filter((candidate) => candidate !== todo);

    this.inform();
  }

  save(todoToSave: ITodo, text: string) {
    this.todos = this.todos.map((todo) =>
      todo !== todoToSave ? todo : { ...todo, title: text }
    );

    this.inform();
  }

  clearCompleted() {
    this.todos = this.todos.filter((todo) => !todo.completed);

    this.inform();
  }
}
