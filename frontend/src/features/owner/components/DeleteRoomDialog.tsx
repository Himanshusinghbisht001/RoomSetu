/**
 * Delete Room Dialog – Phase 14: proper dialog semantics + accessibility
 */

import { useEffect, useRef } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  roomTitle?: string;
}

export default function DeleteRoomDialog({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  roomTitle,
}: Props) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Focus cancel button when dialog opens
  useEffect(() => {
    if (isOpen) {
      cancelBtnRef.current?.focus();
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-desc"
      >
        <div className="modal-header">
          <h3 id="delete-dialog-title">Delete Room?</h3>
        </div>
        <div className="modal-body">
          <p id="delete-dialog-desc">
            {roomTitle ? (
              <>
                Are you sure you want to delete <strong>{roomTitle}</strong>?
              </>
            ) : (
              'This room will be removed from your active listings.'
            )}{' '}
            This action can only be reversed by contacting support.
          </p>
        </div>
        <div className="modal-actions">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="btn btn-outline"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="btn btn-danger"
            aria-busy={isDeleting}
          >
            {isDeleting ? 'Deleting…' : 'Delete Room'}
          </button>
        </div>
      </div>
    </div>
  );
}
