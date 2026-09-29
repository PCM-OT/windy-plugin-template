import { useEffect, useRef } from 'react';

interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  danger,
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
    if (d && !d.showModal) d.setAttribute('open', '');
  }, []);
  return (
    <dialog ref={ref} className="dialog" aria-labelledby="dlg-title" onCancel={onCancel}>
      <h2 id="dlg-title">{title}</h2>
      <p>{message}</p>
      <div className="row">
        <button className="btn" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
