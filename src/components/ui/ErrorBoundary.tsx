import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import type { Location } from 'react-router';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Смена маршрута (любого — вкладки, модалки через search-параметры) сбрасывает ошибку. */
  location: Location;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Граница ошибок вокруг маршрутов: без неё любая ошибка рендера размонтирует
 * всё приложение — белый экран с мёртвым таб-баром, лечится только reload.
 * С ней падает только содержимое вкладки; навигация живёт, а переход на другой
 * маршрут даёт странице новый шанс (state сбрасывается в componentDidUpdate).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  override componentDidUpdate(prev: ErrorBoundaryProps): void {
    if (this.state.error && prev.location.key !== this.props.location.key) {
      this.setState({ error: null });
    }
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 px-4 pb-8 pt-16 text-center">
        <p className="text-lg font-semibold">Что-то пошло не так</p>
        <p className="text-sm text-gray-500">
          Экран упал, но навигация работает: выберите другую вкладку или обновите страницу.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-accent px-4 py-2.5 font-medium text-white active:opacity-80"
        >
          Обновить страницу
        </button>
        <details className="w-full text-xs text-gray-400">
          <summary className="cursor-pointer">Детали ошибки</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words text-left">{error.message}</pre>
        </details>
      </div>
    );
  }
}
