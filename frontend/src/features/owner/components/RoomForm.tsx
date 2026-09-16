/**
 * Room Form – Phase 14 (Cloudinary): real image upload, no blob URLs stored.
 *
 * Image upload flow:
 *  1. User selects file(s) → client-side validation (MIME, size, count).
 *  2. A temporary Object URL is created for instant preview.
 *  3. The File is uploaded to POST /api/v1/uploads/images immediately.
 *  4. On success: the Object URL is revoked; the permanent Cloudinary HTTPS URL
 *     is stored in state — this is the only URL ever sent to the Room API.
 *  5. On failure: the slot shows an error state with a Retry button.
 *  6. Form submission is blocked while any slot is still uploading.
 *
 * SECURITY GUARANTEES (frontend):
 *  - Blob URLs are NEVER sent to the Room API (onSubmit only reads confirmed URLs).
 *  - No Cloudinary credentials exist on the frontend.
 *  - Uploading files are de-duplicated via a WeakSet ref so React re-renders
 *    cannot trigger a second upload of the same File object.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateRoom, useUpdateRoom } from '../hooks/useOwnerRooms.js';
import { uploadImages } from '../api/uploadApi.js';
import type { Room } from '../types.js';
import MembershipCertificateModal from './MembershipCertificateModal.js';

// ── Form schema (images handled separately via state) ─────────────────────────

const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  rent: z.number().positive('Rent must be greater than zero'),
  location: z.object({
    country: z.string().min(1, 'Country is required'),
    state: z.string().min(1, 'State is required'),
    city: z.string().min(1, 'City is required'),
    area: z.string().min(1, 'Area is required'),
  }),
  roomType: z.enum(['Single', 'Double', 'PG']),
  contactNumber: z
    .string()
    .min(10, 'Contact number is too short')
    .max(15, 'Contact number is too long'),
  facilities: z.array(z.string()).optional(),
  suitableFor: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_IMAGES = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

const FACILITY_OPTIONS = [
  'Wi-Fi', 'Water', 'Electricity', 'Parking',
  'Attached Bathroom', 'Furnished', 'Kitchen', 'Balcony',
];
const SUITABLE_OPTIONS = ['Student', 'Family', 'Working Professional'];

// ── Image slot types ──────────────────────────────────────────────────────────

type SlotStatus = 'uploading' | 'done' | 'error';

interface ImageSlot {
  /** Unique key for React list rendering */
  key: string;
  /**
   * During upload:  temporary Object URL (blob:) — preview only, never stored in DB.
   * After upload:   permanent Cloudinary HTTPS URL — the value stored in DB.
   * Existing room:  permanent Cloudinary HTTPS URL from the Room record.
   */
  url: string;
  status: SlotStatus;
  /** The original File — kept for retry; null for existing Cloudinary images */
  file: File | null;
  /** Temporary Object URL that needs to be revoked on cleanup */
  blobUrl: string | null;
  /** Human-readable error (never contains credentials) */
  errorMsg?: string;
}

// ── Checkbox chip group (unchanged from Phase 14) ─────────────────────────────

interface CheckboxChipGroupProps {
  id: string;
  options: string[];
  value: string[];
  onChange: (val: string[]) => void;
  legend: string;
}

function CheckboxChipGroup({ id, options, value, onChange, legend }: CheckboxChipGroupProps) {
  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };
  return (
    <fieldset className="form-group">
      <legend className="form-label">{legend}</legend>
      <div className="checkbox-group" role="group">
        {options.map((opt) => {
          const checked = value.includes(opt);
          const chipId = `${id}-${opt.replace(/\s+/g, '-').toLowerCase()}`;
          return (
            <label
              key={opt}
              htmlFor={chipId}
              className={`checkbox-chip${checked ? ' checked' : ''}`}
            >
              <input
                id={chipId}
                type="checkbox"
                checked={checked}
                onChange={() => toggle(opt)}
                aria-checked={checked}
              />
              {opt}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  room?: Room | null;
  onClose: () => void;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RoomForm({ room, onClose }: Props) {
  const { mutateAsync: createRoom, isPending: isCreating } = useCreateRoom();
  const { mutateAsync: updateRoom, isPending: isUpdating } = useUpdateRoom();
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const isEdit = !!room;
  const isSaving = isCreating || isUpdating;
  
  const [showCertificate, setShowCertificate] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: room
      ? { ...room }
      : {
          title: '',
          description: '',
          rent: undefined as unknown as number,
          location: { country: 'India', state: '', city: '', area: '' },
          roomType: 'Single',
          contactNumber: '',
          facilities: [],
          suitableFor: [],
        },
  });

  // ── Image state ─────────────────────────────────────────────────────────────

  const [imageSlots, setImageSlots] = useState<ImageSlot[]>(() =>
    (room?.images || []).map((url, i) => ({
      key:     `existing-${i}-${url}`,
      url,
      status:  'done' as SlotStatus,
      file:    null,
      blobUrl: null,
    })),
  );
  const [imageError, setImageError] = useState<string>('');

  // Track File objects currently uploading to prevent duplicate uploads on
  // React re-renders. WeakSet so we don't keep stale File references.
  const uploadingFiles = useRef<WeakSet<File>>(new WeakSet());

  // Derived: true while at least one slot is still uploading
  const hasUploadingSlots = imageSlots.some((s) => s.status === 'uploading');
  const isSubmitting = isSaving || hasUploadingSlots;

  // ── Cleanup: revoke all outstanding Object URLs on unmount ─────────────────

  useEffect(() => {
    return () => {
      imageSlots.forEach((slot) => {
        if (slot.blobUrl) URL.revokeObjectURL(slot.blobUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally only on unmount

  // ── Upload a single file ────────────────────────────────────────────────────

  const uploadFile = useCallback(async (file: File, slotKey: string): Promise<void> => {
    try {
      const [cloudinaryUrl] = await uploadImages([file]);

      setImageSlots((prev) =>
        prev.map((slot) => {
          if (slot.key !== slotKey) return slot;
          // Revoke the temporary blob URL now that we have the permanent URL
          if (slot.blobUrl) URL.revokeObjectURL(slot.blobUrl);
          return {
            ...slot,
            url:     cloudinaryUrl,
            status:  'done',
            blobUrl: null,       // blob is gone
            errorMsg: undefined,
          };
        }),
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ||
        'Upload failed. Please try again.';

      setImageSlots((prev) =>
        prev.map((slot) =>
          slot.key === slotKey ? { ...slot, status: 'error', errorMsg: msg } : slot,
        ),
      );
    } finally {
      // Allow re-upload (retry) of this File if needed
      uploadingFiles.current.delete(file);
    }
  }, []);

  // ── Retry a failed slot ─────────────────────────────────────────────────────

  const handleRetry = useCallback(
    (slot: ImageSlot) => {
      if (!slot.file || uploadingFiles.current.has(slot.file)) return;

      uploadingFiles.current.add(slot.file);
      setImageSlots((prev) =>
        prev.map((s) =>
          s.key === slot.key ? { ...s, status: 'uploading', errorMsg: undefined } : s,
        ),
      );
      void uploadFile(slot.file, slot.key);
    },
    [uploadFile],
  );

  // ── Handle file input change ────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setImageError('');
    const currentSlots = [...imageSlots];
    const newSlots: ImageSlot[] = [];

    for (const file of files) {
      const remaining = MAX_IMAGES - (currentSlots.length + newSlots.length);
      if (remaining <= 0) {
        setImageError(`Maximum ${MAX_IMAGES} images allowed.`);
        break;
      }

      // Client-side validation (backend also validates)
      if (file.size > MAX_FILE_SIZE) {
        setImageError(`"${file.name}" exceeds the 5 MB limit.`);
        continue;
      }
      if (!ALLOWED_MIME.has(file.type)) {
        setImageError(`"${file.name}" is not a supported image format (JPG, PNG, WebP).`);
        continue;
      }

      // Guard: don't start a second upload for the same File object
      if (uploadingFiles.current.has(file)) continue;
      uploadingFiles.current.add(file);

      const blobUrl = URL.createObjectURL(file);
      const slotKey = `new-${file.name}-${file.size}-${Date.now()}-${Math.random()}`;

      newSlots.push({
        key:    slotKey,
        url:    blobUrl,   // preview only — will be replaced with Cloudinary URL
        status: 'uploading',
        file,
        blobUrl,
        errorMsg: undefined,
      });
    }

    if (newSlots.length > 0) {
      setImageSlots((prev) => [...prev, ...newSlots]);
      // Fire uploads (do not await — state updates handle the result)
      for (const slot of newSlots) {
        void uploadFile(slot.file!, slot.key);
      }
    }

    // Reset input so the same file can be re-selected after removal
    e.target.value = '';
  };

  // ── Remove a slot ───────────────────────────────────────────────────────────

  const handleRemoveImage = (index: number) => {
    setImageSlots((prev) => {
      const slot = prev[index];
      if (slot.blobUrl) URL.revokeObjectURL(slot.blobUrl);
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
    setImageError('');
  };

  // ── Keyboard / focus effects ────────────────────────────────────────────────

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ── Submit ──────────────────────────────────────────────────────────────────

  const onSubmit = async (data: FormData) => {
    // Extra guard — submit button is disabled during upload but check anyway
    if (hasUploadingSlots) {
      setError('root', { message: 'Please wait for all images to finish uploading.' });
      return;
    }

    // Only include slots that are fully uploaded (permanent HTTPS URLs).
    // Blob URLs and error slots are intentionally excluded.
    const confirmedUrls = imageSlots
      .filter((s) => s.status === 'done' && s.url.startsWith('https://'))
      .map((s) => s.url);

    const payload = { ...data, images: confirmedUrls };

    try {
      if (isEdit && room) {
        await updateRoom({ id: room._id, payload });
        reset();
        onClose();
      } else {
        await createRoom(payload as Parameters<typeof createRoom>[0]);
        reset();
        setShowCertificate(true);
      }
    } catch (err: unknown) {
      const apiMsg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || 'Submission failed';
      setError('root', { message: apiMsg });
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (showCertificate) {
    return <MembershipCertificateModal onClose={onClose} />;
  }

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="modal-content card room-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-form-title"
      >
        <div className="modal-header">
          <h3 id="room-form-title">{isEdit ? 'Edit Room' : 'Add New Room'}</h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close form"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="room-form"
          aria-label={isEdit ? 'Edit room form' : 'Create room form'}
          noValidate
        >
          {errors.root && (
            <div className="error-card" role="alert">
              {errors.root.message}
            </div>
          )}

          {/* Title */}
          <div className="form-group">
            <label className="form-label" htmlFor="rf-title">Title *</label>
            <input
              id="rf-title"
              className="form-input"
              placeholder="e.g. Furnished Single Room in Andheri West"
              aria-describedby={errors.title ? 'rf-title-err' : undefined}
              aria-invalid={!!errors.title}
              aria-required="true"
              autoFocus
              {...register('title')}
            />
            {errors.title && (
              <span id="rf-title-err" className="error-text" role="alert">
                {errors.title.message}
              </span>
            )}
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="rf-desc">Description *</label>
            <textarea
              id="rf-desc"
              className="form-input"
              rows={4}
              placeholder="Describe the room, surroundings, rules, etc."
              aria-describedby={errors.description ? 'rf-desc-err' : undefined}
              aria-invalid={!!errors.description}
              aria-required="true"
              {...register('description')}
            />
            {errors.description && (
              <span id="rf-desc-err" className="error-text" role="alert">
                {errors.description.message}
              </span>
            )}
          </div>

          {/* Rent + Room Type */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="rf-rent">Rent (₹/month) *</label>
              <input
                id="rf-rent"
                className="form-input"
                type="number"
                min="1"
                placeholder="e.g. 8000"
                aria-describedby={errors.rent ? 'rf-rent-err' : undefined}
                aria-invalid={!!errors.rent}
                aria-required="true"
                {...register('rent', { valueAsNumber: true })}
              />
              {errors.rent && (
                <span id="rf-rent-err" className="error-text" role="alert">
                  {errors.rent.message}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="rf-type">Room Type *</label>
              <select id="rf-type" className="form-input" aria-required="true" {...register('roomType')}>
                <option value="Single">Single</option>
                <option value="Double">Double</option>
                <option value="PG">PG</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <fieldset className="form-fieldset">
            <legend>Location</legend>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="rf-country">Country *</label>
                <input
                  id="rf-country"
                  className="form-input"
                  placeholder="Country"
                  aria-invalid={!!errors.location?.country}
                  {...register('location.country')}
                />
                {errors.location?.country && (
                  <span className="error-text" role="alert">{errors.location.country.message}</span>
                )}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="rf-state">State *</label>
                <input
                  id="rf-state"
                  className="form-input"
                  placeholder="State"
                  aria-invalid={!!errors.location?.state}
                  {...register('location.state')}
                />
                {errors.location?.state && (
                  <span className="error-text" role="alert">{errors.location.state.message}</span>
                )}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="rf-city">City *</label>
                <input
                  id="rf-city"
                  className="form-input"
                  placeholder="City"
                  aria-invalid={!!errors.location?.city}
                  {...register('location.city')}
                />
                {errors.location?.city && (
                  <span className="error-text" role="alert">{errors.location.city.message}</span>
                )}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="rf-area">Area *</label>
                <input
                  id="rf-area"
                  className="form-input"
                  placeholder="Area / Locality"
                  aria-invalid={!!errors.location?.area}
                  {...register('location.area')}
                />
                {errors.location?.area && (
                  <span className="error-text" role="alert">{errors.location.area.message}</span>
                )}
              </div>
            </div>
          </fieldset>

          {/* Contact */}
          <div className="form-group">
            <label className="form-label" htmlFor="rf-contact">Contact Number *</label>
            <input
              id="rf-contact"
              className="form-input"
              type="tel"
              placeholder="e.g. 9876543210"
              aria-describedby={errors.contactNumber ? 'rf-contact-err' : undefined}
              aria-invalid={!!errors.contactNumber}
              aria-required="true"
              {...register('contactNumber')}
            />
            {errors.contactNumber && (
              <span id="rf-contact-err" className="error-text" role="alert">
                {errors.contactNumber.message}
              </span>
            )}
          </div>

          {/* Facilities */}
          <Controller
            name="facilities"
            control={control}
            render={({ field }) => (
              <CheckboxChipGroup
                id="rf-facility"
                legend="Facilities"
                options={FACILITY_OPTIONS}
                value={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />

          {/* Suitable For */}
          <Controller
            name="suitableFor"
            control={control}
            render={({ field }) => (
              <CheckboxChipGroup
                id="rf-suitable"
                legend="Suitable For"
                options={SUITABLE_OPTIONS}
                value={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />

          {/* ── Image Upload Section ─────────────────────────────────────── */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label" id="rf-images-label">
              Room Images
              <span className="text-muted" style={{ fontWeight: 400, marginLeft: '0.35rem' }}>
                (First image is the cover.)
              </span>
            </label>

            {/* Helper text — replaces the old "pending" warning */}
            <p
              className="text-muted"
              style={{ fontSize: '0.8rem', marginBottom: '0.75rem', marginTop: '0.25rem' }}
            >
              Upload up to 4 images &bull; JPG, PNG or WebP &bull; Max 5 MB each
            </p>

            {/* Client-side validation error */}
            {imageError && (
              <div className="error-text" role="alert" style={{ marginBottom: '0.5rem' }}>
                {imageError}
              </div>
            )}

            {/* Upload slots grid */}
            <div className="image-slots-grid" aria-labelledby="rf-images-label">

              {imageSlots.map((slot, idx) => (
                <div key={slot.key} className="image-slot-item">
                  <div className="image-slot-preview" style={{ position: 'relative' }}>
                    <img
                      src={slot.url}
                      alt={`Room image ${idx + 1}`}
                      style={{
                        opacity: slot.status === 'uploading' ? 0.5 : 1,
                        transition: 'opacity 0.2s ease',
                      }}
                    />

                    {/* Uploading overlay */}
                    {slot.status === 'uploading' && (
                      <div
                        style={{
                          position:       'absolute',
                          inset:          0,
                          display:        'flex',
                          flexDirection:  'column',
                          alignItems:     'center',
                          justifyContent: 'center',
                          background:     'rgba(0,0,0,0.45)',
                          borderRadius:   'var(--radius-sm, 6px)',
                          gap:            '0.3rem',
                        }}
                        aria-label="Uploading…"
                        role="status"
                      >
                        <span
                          className="upload-spinner"
                          aria-hidden="true"
                          style={{
                            width:        '22px',
                            height:       '22px',
                            border:       '3px solid rgba(255,255,255,0.3)',
                            borderTop:    '3px solid #fff',
                            borderRadius: '50%',
                            animation:    'spin 0.8s linear infinite',
                            display:      'block',
                          }}
                        />
                        <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 600 }}>
                          Uploading…
                        </span>
                      </div>
                    )}

                    {/* Error overlay */}
                    {slot.status === 'error' && (
                      <div
                        style={{
                          position:       'absolute',
                          inset:          0,
                          display:        'flex',
                          flexDirection:  'column',
                          alignItems:     'center',
                          justifyContent: 'center',
                          background:     'rgba(220,38,38,0.82)',
                          borderRadius:   'var(--radius-sm, 6px)',
                          gap:            '0.35rem',
                          padding:        '0.5rem',
                          textAlign:      'center',
                        }}
                        role="alert"
                        aria-label={slot.errorMsg || 'Upload failed'}
                      >
                        <span style={{ color: '#fff', fontSize: '0.65rem', lineHeight: 1.3 }}>
                          {slot.errorMsg || 'Upload failed'}
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleRetry(slot)}
                          aria-label={`Retry upload for image ${idx + 1}`}
                          style={{
                            background:   '#fff',
                            color:        '#dc2626',
                            border:       'none',
                            borderRadius: '4px',
                            padding:      '0.15rem 0.5rem',
                            fontSize:     '0.65rem',
                            fontWeight:   700,
                            cursor:       'pointer',
                          }}
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="image-slot-actions">
                    {idx === 0 && (
                      <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleRemoveImage(idx)}
                      aria-label={`Remove image ${idx + 1}`}
                      style={{ padding: '0.2rem 0.5rem', marginLeft: 'auto' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}

              {/* Add-image slot — only shown when fewer than MAX_IMAGES */}
              {imageSlots.length < MAX_IMAGES && (
                <div className="image-slot-add">
                  <label
                    htmlFor="rf-image-upload"
                    className="image-upload-label"
                    aria-label="Add image"
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        document.getElementById('rf-image-upload')?.click();
                      }
                    }}
                  >
                    <div className="image-upload-icon">➕</div>
                    <span>Add Image</span>
                  </label>
                  <input
                    id="rf-image-upload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                    style={{ display: 'none' }}
                    aria-label="Select images to upload"
                  />
                </div>
              )}
            </div>

            {/* Uploading in-progress indicator below the grid */}
            {hasUploadingSlots && (
              <p
                className="text-muted"
                style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}
                role="status"
                aria-live="polite"
              >
                ⏳ Images are uploading — the form will be enabled once complete.
              </p>
            )}
          </div>

          {/* Spinner keyframe — injected inline for self-containment */}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              aria-busy={isSubmitting}
              aria-disabled={isSubmitting}
              title={hasUploadingSlots ? 'Wait for images to finish uploading' : undefined}
            >
              {isSaving ? 'Saving…' : hasUploadingSlots ? 'Uploading images…' : isEdit ? 'Save Changes' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
