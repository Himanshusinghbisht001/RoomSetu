import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthProvider.js';
import { useCreateInquiry, useMyInquiries, useCancelInquiry } from '../hooks/useInquiries.js';
import type { Inquiry, InquiryPurpose } from '../types.js';
import { PURPOSE_OPTIONS } from '../types.js';
import { AxiosError } from 'axios';

interface InterestButtonProps {
  roomId: string;
}

// ── Small accessible field wrapper ────────────────────────────────────────────
const Field: React.FC<{ label: string; required?: boolean; error?: string; children: React.ReactNode }> = ({
  label,
  required,
  error,
  children,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
    <label
      style={{
        fontSize: '0.82rem',
        fontWeight: 600,
        color: 'var(--text)',
        letterSpacing: '0.02em',
      }}
    >
      {label}
      {required && <span style={{ color: 'var(--danger)', marginLeft: '2px' }}>*</span>}
    </label>
    {children}
    {error && (
      <span role="alert" style={{ fontSize: '0.78rem', color: 'var(--danger)' }}>
        {error}
      </span>
    )}
  </div>
);

// ── Form validation ───────────────────────────────────────────────────────────
interface FormValues {
  fromLocation: string;
  purpose: InquiryPurpose | '';
  message: string;
}

interface FormErrors {
  fromLocation?: string;
  purpose?: string;
  message?: string;
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.fromLocation.trim()) {
    errors.fromLocation = 'Please enter where you are from.';
  } else if (values.fromLocation.trim().length > 100) {
    errors.fromLocation = 'Too long (max 100 characters).';
  }
  if (!values.purpose) {
    errors.purpose = 'Please select your purpose.';
  }
  if (values.message.trim().length > 0 && values.message.trim().length < 1) {
    errors.message = 'Message cannot be empty if provided.';
  }
  if (values.message.length > 500) {
    errors.message = 'Message is too long (max 500 characters).';
  }
  return errors;
}

// ── Modal overlay ─────────────────────────────────────────────────────────────
const ModalOverlay: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Lock scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Send Interest Request"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'rgba(7, 21, 34, 0.65)',
        backdropFilter: 'blur(3px)',
      }}
    >
      {children}
    </div>
  );
};

// ── Main InterestButton component ─────────────────────────────────────────────
export const InterestButton: React.FC<InterestButtonProps> = ({ roomId }) => {
  const { user, isAuthenticated } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [values, setValues] = useState<FormValues>({ fromLocation: '', purpose: '', message: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState('');

  const { data: myInquiriesData, isLoading: isLoadingInquiries } = useMyInquiries(1, 50);
  const createInquiry = useCreateInquiry();
  const cancelInquiry = useCancelInquiry();

  const activeInquiry = useMemo(() => {
    if (!myInquiriesData) return null;
    return myInquiriesData.data.find(
      (inq: Inquiry) =>
        (typeof inq.roomId === 'string' ? inq.roomId === roomId : inq.roomId._id === roomId) &&
        (inq.status === 'Pending' || inq.status === 'Accepted'),
    );
  }, [myInquiriesData, roomId]);

  // Only render for authenticated seekers
  if (!isAuthenticated || user?.role !== 'seeker') return null;

  if (isLoadingInquiries) {
    return (
      <button className="btn btn-outline w-full text-center" style={{ marginTop: '0.75rem' }} disabled>
        Loading...
      </button>
    );
  }

  // ── Already has an active inquiry ─────────────────────────────────────────
  const handleCancel = async () => {
    if (activeInquiry && window.confirm('Are you sure you want to cancel this request?')) {
      try {
        await cancelInquiry.mutateAsync(activeInquiry.id);
      } catch {
        alert('Failed to cancel request. Please try again.');
      }
    }
  };

  if (activeInquiry) {
    if (activeInquiry.status === 'Pending') {
      return (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              color: 'var(--success)',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            <span aria-hidden="true">✓</span> Request Sent
          </div>
          <button
            className="btn btn-outline w-full text-center"
            onClick={handleCancel}
            disabled={cancelInquiry.isPending}
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
          >
            {cancelInquiry.isPending ? 'Cancelling...' : 'Cancel Request'}
          </button>
        </div>
      );
    }
    if (activeInquiry.status === 'Accepted') {
      return (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              color: 'var(--success)',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            <span aria-hidden="true">✓</span> Interest Accepted
          </div>
          <Link
            to={`/chat/${activeInquiry.id}`}
            className="btn btn-outline w-full text-center"
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
          >
            💬 Chat with Owner
          </Link>
        </div>
      );
    }
  }

  // ── No active inquiry — show trigger button ────────────────────────────────
  const openModal = () => {
    // Pre-fill name field display value (display only, not sent to backend)
    setValues({ fromLocation: '', purpose: '', message: '' });
    setErrors({});
    setServerError('');
    setShowModal(true);
  };

  const closeModal = () => {
    if (!createInquiry.isPending) setShowModal(false);
  };

  // ── Form submission ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    const validationErrors = validate(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    try {
      await createInquiry.mutateAsync({
        roomId,
        data: {
          fromLocation: values.fromLocation.trim(),
          purpose: values.purpose as InquiryPurpose,
          ...(values.message.trim() ? { message: values.message.trim() } : {}),
        },
      });
      setShowModal(false);
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 409) {
          setServerError('You have already sent an interest request for this room.');
        } else {
          setServerError(error.response?.data?.error?.message || 'Failed to send request. Please try again.');
        }
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.55rem 0.75rem',
    fontSize: '0.88rem',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--surface)',
    color: 'var(--text)',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color var(--transition)',
  };

  return (
    <>
      <button
        className="btn btn-outline w-full text-center"
        style={{ marginTop: '0.75rem' }}
        onClick={openModal}
        id="interest-button-trigger"
      >
        I'm Interested
      </button>

      {showModal && (
        <ModalOverlay onClose={closeModal}>
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xl)',
              overflow: 'hidden',
            }}
          >
            {/* Modal header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: 'var(--text)',
                    margin: 0,
                  }}
                >
                  Send Interest Request
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                  Help the owner know more about you.
                </p>
              </div>
              <button
                onClick={closeModal}
                disabled={createInquiry.isPending}
                aria-label="Close form"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.3rem',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '0.2rem',
                  lineHeight: 1,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                ×
              </button>
            </div>

            {/* Modal form body */}
            <form onSubmit={handleSubmit} noValidate>
              <div
                style={{
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                {/* Full Name — read-only, from auth */}
                <Field label="Full Name">
                  <input
                    type="text"
                    value={user?.name ?? ''}
                    readOnly
                    aria-readonly="true"
                    style={{
                      ...inputStyle,
                      backgroundColor: 'var(--surface-hover)',
                      color: 'var(--text-muted)',
                      cursor: 'not-allowed',
                    }}
                  />
                </Field>

                {/* Where are you from? */}
                <Field label="Where are you from?" required error={errors.fromLocation}>
                  <input
                    id="interest-from-location"
                    type="text"
                    placeholder="e.g. Delhi, Lucknow, Chandigarh…"
                    value={values.fromLocation}
                    maxLength={100}
                    onChange={(e) => {
                      setValues((v) => ({ ...v, fromLocation: e.target.value }));
                      if (errors.fromLocation) setErrors((prev) => ({ ...prev, fromLocation: undefined }));
                    }}
                    style={{
                      ...inputStyle,
                      borderColor: errors.fromLocation ? 'var(--danger)' : 'var(--border)',
                    }}
                    aria-required="true"
                    aria-describedby={errors.fromLocation ? 'fl-error' : undefined}
                  />
                </Field>

                {/* What are you doing in Nainital? */}
                <Field label="What are you doing in Nainital?" required error={errors.purpose}>
                  <select
                    id="interest-purpose"
                    value={values.purpose}
                    onChange={(e) => {
                      setValues((v) => ({ ...v, purpose: e.target.value as InquiryPurpose | '' }));
                      if (errors.purpose) setErrors((prev) => ({ ...prev, purpose: undefined }));
                    }}
                    style={{
                      ...inputStyle,
                      borderColor: errors.purpose ? 'var(--danger)' : 'var(--border)',
                      cursor: 'pointer',
                    }}
                    aria-required="true"
                  >
                    <option value="">— Select purpose —</option>
                    {PURPOSE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Message to Owner — optional */}
                <Field label="Message to Owner (optional)" error={errors.message}>
                  <textarea
                    id="interest-message"
                    placeholder="Any specific questions or details for the owner…"
                    value={values.message}
                    maxLength={500}
                    rows={3}
                    onChange={(e) => {
                      setValues((v) => ({ ...v, message: e.target.value }));
                      if (errors.message) setErrors((prev) => ({ ...prev, message: undefined }));
                    }}
                    style={{
                      ...inputStyle,
                      resize: 'vertical',
                      minHeight: '70px',
                      borderColor: errors.message ? 'var(--danger)' : 'var(--border)',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.73rem',
                      color: values.message.length > 450 ? 'var(--warning)' : 'var(--text-muted)',
                      textAlign: 'right',
                    }}
                  >
                    {values.message.length}/500
                  </span>
                </Field>

                {/* Server error */}
                {serverError && (
                  <div
                    role="alert"
                    style={{
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--danger-bg)',
                      border: '1px solid var(--danger-border)',
                      color: 'var(--danger)',
                      fontSize: '0.83rem',
                    }}
                  >
                    {serverError}
                  </div>
                )}
              </div>

              {/* Modal footer */}
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={closeModal}
                  disabled={createInquiry.isPending}
                  id="interest-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={createInquiry.isPending}
                  id="interest-submit-btn"
                >
                  {createInquiry.isPending ? 'Sending…' : 'Send Interest Request'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </>
  );
};
