import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../auth/AuthProvider.js';
import { submitFeedback } from './api/feedbackApi.js';
import type { FeedbackType, FeedbackPayload } from './types.js';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: FeedbackType;
}

const feedbackSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address').max(200, 'Email must be less than 200 characters'),
  type: z.enum(['Suggestion', 'Website Experience', 'Room Listing', 'Bug / Error', 'Feature Request', 'Other'] as const),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000, 'Message must be less than 2000 characters'),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

export default function FeedbackModal({ isOpen, onClose, defaultType = 'Suggestion' }: FeedbackModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      type: defaultType,
      message: '',
    },
  });

  // Reset form when opened with new defaults
  useEffect(() => {
    if (isOpen) {
      reset({
        name: user?.name || '',
        email: user?.email || '',
        type: defaultType,
        message: '',
      });
      setSubmitSuccess(false);
      setServerError(null);
      // Focus first field
      setTimeout(() => firstFieldRef.current?.focus(), 100);
    }
  }, [isOpen, reset, user, defaultType]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const onSubmit = async (data: FeedbackFormValues) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      await submitFeedback(data as FeedbackPayload);
      setSubmitSuccess(true);
    } catch (err: any) {
      setServerError(err.response?.data?.error?.message || 'An error occurred while submitting feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="modal-overlay" role="presentation">
      <div
        className="modal-content"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
      >
        <div className="modal-header">
          <h3 id="feedback-modal-title">
            {defaultType === 'Bug / Error' ? 'Report an Issue' : 'Give Feedback'}
          </h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {submitSuccess ? (
            <div className="success-card text-center py-8" role="status">
              <div className="mb-4 text-3xl">✅</div>
              <h4 className="font-bold mb-2">Thank you for your feedback!</h4>
              <p>Your response has been submitted successfully.</p>
              <button
                className="btn btn-primary mt-6"
                onClick={handleClose}
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="form-group gap-4" noValidate>
              {serverError && (
                <div className="error-card" role="alert">
                  <p>{serverError}</p>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="feedback-name" className="form-label">Name</label>
                <input
                  {...register('name')}
                  id="feedback-name"
                  type="text"
                  className="form-input"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'feedback-name-error' : undefined}
                />
                {errors.name && (
                  <span id="feedback-name-error" className="error-text">
                    {errors.name.message}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="feedback-email" className="form-label">Email</label>
                <input
                  {...register('email')}
                  id="feedback-email"
                  type="email"
                  className="form-input"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'feedback-email-error' : undefined}
                />
                {errors.email && (
                  <span id="feedback-email-error" className="error-text">
                    {errors.email.message}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="feedback-type" className="form-label">Feedback Type</label>
                <select
                  {...register('type')}
                  id="feedback-type"
                  className="form-input"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.type}
                  aria-describedby={errors.type ? 'feedback-type-error' : undefined}
                >
                  <option value="Suggestion">Suggestion</option>
                  <option value="Website Experience">Website Experience</option>
                  <option value="Room Listing">Room Listing</option>
                  <option value="Bug / Error">Bug / Error</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="Other">Other</option>
                </select>
                {errors.type && (
                  <span id="feedback-type-error" className="error-text">
                    {errors.type.message}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="feedback-message" className="form-label">Message</label>
                <textarea
                  {...register('message')}
                  id="feedback-message"
                  className="form-input"
                  rows={4}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.message}
                  aria-describedby={errors.message ? 'feedback-message-error' : undefined}
                />
                {errors.message && (
                  <span id="feedback-message-error" className="error-text">
                    {errors.message.message}
                  </span>
                )}
              </div>

              <div className="modal-actions mt-4">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
