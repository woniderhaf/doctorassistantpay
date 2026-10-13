interface ConfirmDialogProps {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel, cancelLabel = 'Не отменять', onConfirm, onCancel }: ConfirmDialogProps): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-60 flex items-end justify-center p-4 md:items-center" role="alertdialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Отмена" className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <p className="text-center text-[17px] font-medium">{title}</p>
        {message ? <p className="mt-2 text-center text-sm text-gray-500">{message}</p> : null}
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-danger px-4 py-3 font-semibold text-white text-[17px] active:opacity-80"
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
