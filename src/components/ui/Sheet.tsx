import { useEffect, useRef, type ReactNode } from 'react';
import { CloseIcon } from './icons';

interface SheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Мобильный bottom-sheet / десктопный центрированный диалог.
 * Esc и клик по подложке закрывают (onClose пушит историю назад, см. useModalParam).
 */
export function Sheet({ title, onClose, children, footer }: SheetProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // блокируем прокрутку фона, пока открыт sheet
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Закрыть"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        ref={ref}
        tabIndex={-1}
        className="relative w-full max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-white outline-none
                   md:max-w-[480px] md:rounded-3xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-3xl bg-white px-5 pb-3 pt-4 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="-mr-1 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="px-5 pb-6 pt-2">{children}</div>
        {footer ? <div className="sticky bottom-0 border-t border-gray-100 bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div> : null}
      </div>
    </div>
  );
}
