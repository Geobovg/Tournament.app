"use client";

import { createPortal } from "react-dom";

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title"><div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-2xl"><h2 id="confirm-dialog-title" className="text-lg font-semibold">Er du sikker?</h2><p className="mt-3 text-sm text-muted">{message}</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 font-medium hover:bg-surface-raised">Nei</button><button type="button" onClick={onConfirm} className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-contrast hover:opacity-90">Ja</button></div></div></div>;
  return typeof document !== "undefined" ? createPortal(dialog, document.body) : null;
}
