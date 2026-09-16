export default function FullPageSpinner() {
  return (
    <div className="full-page-spinner" aria-label="Loading…" role="status">
      <div className="spinner" />
      <p className="spinner-label">Loading…</p>
    </div>
  );
}
