'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

type ConfirmationTone = 'standard' | 'warning';

type ConfirmationOptions = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: ConfirmationTone;
};

type ConfirmationContextValue = {
  confirmAdminAction: (options: ConfirmationOptions) => Promise<boolean>;
};

const ConfirmationContext = createContext<ConfirmationContextValue | null>(null);

export function AdminConfirmationProvider({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  const [request, setRequest] = useState<ConfirmationOptions | null>(null);

  const finish = useCallback((confirmed: boolean) => {
    dialogRef.current?.close();
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setRequest(null);
  }, []);

  const confirmAdminAction = useCallback((options: ConfirmationOptions) => new Promise<boolean>((resolve) => {
    resolverRef.current?.(false);
    resolverRef.current = resolve;
    setRequest(options);
  }), []);

  useEffect(() => {
    if (request && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [request]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const cancelFromBackdrop = (event: MouseEvent) => {
      if (event.target === dialog) finish(false);
    };
    dialog.addEventListener('click', cancelFromBackdrop);
    return () => dialog.removeEventListener('click', cancelFromBackdrop);
  }, [finish]);

  useEffect(() => () => resolverRef.current?.(false), []);

  return <ConfirmationContext.Provider value={{ confirmAdminAction }}>
    {children}
    <dialog
      className={`admin-confirmation-dialog${request?.tone === 'warning' ? ' warning' : ''}`}
      ref={dialogRef}
      aria-labelledby="admin-confirmation-title"
      aria-describedby="admin-confirmation-description"
      onCancel={(event) => {
        event.preventDefault();
        finish(false);
      }}
    >
      {request ? <div className="admin-confirmation-card">
        <button className="admin-confirmation-close" type="button" aria-label="Cancel and close" onClick={() => finish(false)}><X /></button>
        <span className="admin-confirmation-icon" aria-hidden="true"><AlertTriangle /></span>
        <div className="admin-confirmation-copy">
          <h2 id="admin-confirmation-title">{request.title}</h2>
          <p id="admin-confirmation-description">{request.description}</p>
        </div>
        <div className="admin-confirmation-actions">
          <button className="admin-confirmation-cancel" type="button" autoFocus onClick={() => finish(false)}>{request.cancelLabel ?? 'Cancel'}</button>
          <button className="admin-confirmation-confirm" type="button" onClick={() => finish(true)}>{request.confirmLabel}</button>
        </div>
      </div> : null}
    </dialog>
  </ConfirmationContext.Provider>;
}

export function useAdminConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) throw new Error('useAdminConfirmation must be used inside AdminConfirmationProvider.');
  return context;
}
