import type { ReactNode } from 'react';

interface ConfirmDialogProps {
  title: string;
  message?: string;
  /** Дополнительный блок под текстом (например, переключатель режима импорта). */
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** false — кнопка подтверждения ordinary (не красная). */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  children,
  confirmLabel,
  cancelLabel = 'Не отменять',
  destructive = true,
  onConfirm,
  onCancel
}: ConfirmDialogProps): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-60 flex items-end justify-center p-4 md:items-center" role="alertdialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Отмена" className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <p className="text-center text-[17px] font-medium">{title}</p>
        {message ? <p className="mt-2 text-center text-sm text-gray-500">{message}</p> : null}
        {children ? <div className="mt-3">{children}</div> : null}
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-3 font-semibold text-white text-[17px] active:opacity-80 ${
              destructive ? 'bg-danger' : 'bg-accent'
            }`}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl bg-gray-100 px-4 py-3 font-medium text-[17px] active:bg-gray-200"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
