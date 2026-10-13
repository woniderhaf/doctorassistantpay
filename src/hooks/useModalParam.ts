import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

/**
 * Модалка как search-параметр текущего маршрута: ?entry=new|<id>.
 * Открытие пушит историю → аппаратная/жестовая «назад» на телефоне закрывает форму,
 * а не уводит с вкладки. Ссылку можно расшарить.
 */
export function useModalParam(key: string): { value: string | null; open: (v: string) => void; close: () => void } {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const value = params.get(key);

  const open = useCallback(
    (v: string) => {
      setParams(
        prev => {
          const next = new URLSearchParams(prev);
          next.set(key, v);
          return next;
        },
        { replace: false }
      );
    },
    [key, setParams]
  );

  const close = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      setParams(
        prev => {
          const next = new URLSearchParams(prev);
          next.delete(key);
          return next;
        },
        { replace: true }
      );
    }
  }, [key, navigate, setParams]);

  return { value, open, close };
}
