import classNames from 'classnames';
import React, { FormEvent, KeyboardEvent, useRef, useState } from 'react';

import { useDependency } from 'wedi';

import { StateService } from './services/state';
import { ITodo, TodoService } from './services/todo';

export interface ITodoItemProps {
  key: string;
  todo: ITodo;
  onEdit?(todo: ITodo): void;
  onSave?(todo: ITodo): void;
  onCancel?(): void;
}

export default function TodoItem(props: ITodoItemProps) {
  const { todo } = props;

  const [inputValue, setInputValue] = useState(todo.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const todoService = useDependency<TodoService>(TodoService);
  const stateService = useDependency<StateService>(StateService);

  const handleEdit = function() {
    setInputValue(todo.title);

    stateService?.setEditing(todo.id);

    setTimeout(() => inputRef?.current!.focus(), 16);
  };

  const handleSubmit = function(e: FormEvent) {
    const val = inputValue.trim();

    stateService?.setEditing('');

    if (val) {
      setInputValue(val);
      todoService?.save(todo, val);
    } else {
      todoService?.destroy(todo);
    }
  };

  const handleKeydown = function(e: KeyboardEvent) {
    if (e.keyCode === 27) {
      setInputValue(todo.title);
    } else if (e.keyCode === 13) {
      handleSubmit(e);
    }
  };

  return (
    <li
      className={classNames({
        completed: todo.completed,
        editing: stateService?.editing === todo.id
      })}
    >
      <div className="view">
        <input
          type="checkbox"
          className="toggle"
          checked={todo.completed}
          onChange={() => todoService?.toggle(todo)}
        />
        <label onDoubleClick={() => handleEdit()}>{todo.title}</label>
        <button
          className="destroy"
          onClick={() => todoService?.destroy(todo)}
        ></button>
      </div>
      <input
        ref={inputRef}
        className="edit"
        value={inputValue}
        onBlur={(e) => handleSubmit(e)}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => handleKeydown(e)}
      />
    </li>
  );
}
