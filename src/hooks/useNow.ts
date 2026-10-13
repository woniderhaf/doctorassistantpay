import { useEffect, useState } from 'react';

/** Тикающее «сейчас» — как Timer.publish(every: 30) в CalendarView (появление плашки «Смена началась?»). */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
