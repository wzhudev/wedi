import React, { KeyboardEvent, useRef } from 'react';
import { hot } from 'react-hot-loader';
import { Provider, useCollection, useDependency, useUpdateBinder } from 'wedi';

import './App.css';

import Footer from './Footer';
import { RouterService } from './services/router';
import { StateService } from './services/state';
import { TodoService } from './services/todo';
import TodoItem from './TodoItem';

function AppContainer() {
  const collection = useCollection([TodoService, StateService, RouterService]);

  return (
    <Provider collection={collection}>
      <TodoMVC></TodoMVC>
    </Provider>
  );
}

function TodoMVC() {
  const stateService = useDependency(StateService)!;
  const todoService = useDependency(TodoService)!;
  const inputRef = useRef<HTMLInputElement>(null);

  useUpdateBinder(stateService.updated$.asObservable());
  useUpdateBinder(todoService.updated$.asObservable());

  function handleKeydown(e: KeyboardEvent): void {
    if (e.keyCode !== 13) {
      return;
    }

    e.preventDefault();

    const val = inputRef.current?.value;

    if (val) {
      todoService.addTodo(val);
      inputRef.current!.value = '';
    }
  }

  const todoItems = todoService.shownTodos.map((todo) => {
    return <TodoItem key={todo.id} todo={todo}></TodoItem>;
  });

  const todoPart = todoService.todoCount ? (
    <section>
      <input
        type="checkbox"
        id="toggle-all"
        className="toggle-all"
        onChange={(e) => todoService.toggleAll(e.target.checked)}
        checked={todoService.activeTodoCount === 0}
      />
      <label htmlFor="toggle-all">Mark all as completed</label>
      <ul className="todo-list">{todoItems}</ul>
    </section>
  ) : null;

  const footerPart = todoService.todoCount ? <Footer></Footer> : null;

  return (
    <div>
      <header className="header">
        <h1>todos</h1>
        <input
          type="text"
          ref={inputRef}
          className="new-todo"
          placeholder="What needs to be done?"
          onKeyDown={handleKeydown}
          autoFocus={true}
        />
      </header>
      {todoPart}
      {footerPart}
    </div>
  );
}

export default hot(module)(() => <AppContainer />);
