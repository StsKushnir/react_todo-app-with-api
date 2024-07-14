import React, { useEffect, useState } from 'react';
import { UserWarning } from './UserWarning';
import {
  addTodo,
  deleteTodo,
  getTodos,
  updateTodo,
  USER_ID,
} from './api/todos';
import { Header } from './components/header';
import { TodoList } from './components/todoList';
import { Footer } from './components/footer';
import { Notification } from './components/notification';
import { Todo } from './types/Todo';
import { Completed } from './types/Filters';
import { getFillteredTodos } from './utils/filterTodos';
import { ErrorMessage } from './types/ErrorMessages';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filterParameter, setFiltersParams] = useState(Completed.All);
  const [messageError, setMessageError] = useState(ErrorMessage.Default);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [isDeletingCompleted, setDelComplited] = useState(false);
  const [loadingIds, setLoadingIds] = useState<number[]>([]);

  useEffect(() => {
    getTodos()
      .then(setTodos)
      .catch(() => setMessageError(ErrorMessage.Get));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setMessageError(ErrorMessage.Default), 3000);

    return () => clearTimeout(timer);
  }, [messageError]);

  const addNewTodo = (newTodo: Todo): Promise<Todo | void> => {
    return addTodo(newTodo).then(todo => {
      setTodos(prevTodos => [...prevTodos, todo]);
    });
  };

  const removeTodo = (todoId: number) => {
    return deleteTodo(todoId)
      .then(() => {
        setTodos(prevTodos => prevTodos.filter(todo => todo.id !== todoId));
      })
      .catch(() => setMessageError(ErrorMessage.Delete));
  };

  const handleUpdate = (todo: Todo): Promise<boolean> => {
    return updateTodo(todo)
      .then(() => {
        setTodos(prevTodos =>
          prevTodos.map(item => (item.id !== todo.id ? item : todo)),
        );

        return false;
      })
      .catch(() => {
        setMessageError(ErrorMessage.Update);

        return true;
      });
  };

  const activeTodos = todos.filter(todo => !todo.completed);
  const completedTodos = todos.filter(todo => todo.completed);

  const toggleTodoStatus = () => {
    if (activeTodos.length > 0) {
      setLoadingIds([...activeTodos.map(todo => todo.id)]);
      Promise.all(
        activeTodos.map(todo => {
          return updateTodo({
            ...todo,
            completed: true,
          });
        }),
      )
        .then(() =>
          setTodos(prevTodos =>
            prevTodos.map(item =>
              item.completed ? item : { ...item, completed: true },
            ),
          ),
        )
        .catch(() => setMessageError(ErrorMessage.Update))
        .finally(() => setLoadingIds([]));

      return;
    }

    setLoadingIds([...todos.map(todo => todo.id)]);
    Promise.all(
      completedTodos.map(todo => {
        return updateTodo({
          ...todo,
          completed: false,
        });
      }),
    )
      .then(() =>
        setTodos(prevTodos =>
          prevTodos.map(item => ({ ...item, completed: false })),
        ),
      )
      .catch(() => setMessageError(ErrorMessage.Update))
      .finally(() => setLoadingIds([]));
  };

  const clearCompleted = () => {
    setDelComplited(true);

    const deletedTodos = completedTodos.map(todo =>
      deleteTodo(todo.id).then(() => todo.id),
    );

    Promise.allSettled(deletedTodos)
      .then(results => {
        results.forEach(result => {
          if (result.status === 'fulfilled') {
            setTodos(prevTodos =>
              prevTodos.filter(todo => todo.id !== result.value),
            );
          } else {
            setMessageError(ErrorMessage.Delete);
          }
        });
      })
      .finally(() => setDelComplited(false));
  };

  const filteredTodos = getFillteredTodos(todos, filterParameter);

  if (!USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <Header
          todos={todos}
          tempTodo={tempTodo}
          onSetError={setMessageError}
          onTodoDefault={setTempTodo}
          onNewTodo={addNewTodo}
          onToggleTodos={toggleTodoStatus}
        />

        <TodoList
          todos={filteredTodos}
          tempTodo={tempTodo}
          deletingCompleted={isDeletingCompleted}
          loadingIds={loadingIds}
          handleUpdate={handleUpdate}
          onDeleteTodo={removeTodo}
        />

        {todos.length !== 0 && (
          <Footer
            filterParam={filterParameter}
            todos={todos}
            deletingCompleted={isDeletingCompleted}
            onSetParam={setFiltersParams}
            onClearCompleted={clearCompleted}
          />
        )}
      </div>

      <Notification messageError={messageError} onSetError={setMessageError} />
    </div>
  );
};
