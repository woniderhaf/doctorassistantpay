import { useSearchParams } from 'react-router';
import { parseLocalDate, toDateInputValue } from '@/core/dateHelpers';

/**
 * Локальная дата в URL: /calendar?d=YYYY-MM-DD. replace — чтобы «назад»
 * закрывала модалки, а не листала выбранные дни.
 */
export function useLocalDateParam(fallback: number): { date: number; setDate: (ms: number) => void } {
  const [params, setParams] = useSearchParams();
  const raw = params.get('d');
  const parsed = raw ? parseLocalDate(raw) : null;
  const date = parsed ?? fallback;

  const setDate = (ms: number) => {
    const next = new URLSearchParams(params);
    next.set('d', toDateInputValue(ms));
    setParams(next, { replace: true });
  };

  return { date, setDate };
}
