import { useRef, useState } from 'react';
import { jsPDF } from 'jspdf';

/**
 * Displays the RoomSetu Certificate of Membership.
 *
 * The certificate is a static image — no dynamic overlays, no personalization.
 * The <img> is the entire certificate. Downloads capture it directly.
 */
export default function MembershipCertificate() {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const CERT_SRC = '/certificate-template.png';

  // ── Download PNG: fetch the static asset and trigger save ─────────────────
  const handleDownloadPNG = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(CERT_SRC);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'RoomSetu_Membership_Certificate.png';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[Certificate] PNG download failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // ── Download PDF: place the image on a landscape PDF page ─────────────────
  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      // Load image to get its natural dimensions
      const img = imgRef.current;
      if (!img) return;
      const w = img.naturalWidth  || 1024;
      const h = img.naturalHeight || 682;

      // Fetch as blob → base64
      const res = await fetch(CERT_SRC);
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [w, h] });
      pdf.addImage(dataUrl, 'JPEG', 0, 0, w, h);
      pdf.save('RoomSetu_Membership_Certificate.pdf');
    } catch (err) {
      console.error('[Certificate] PDF download failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // ── Share ──────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    try {
      const res = await fetch(CERT_SRC);
      const blob = await res.blob();
      const file = new File([blob], 'RoomSetu_Membership_Certificate.png', { type: blob.type });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'RoomSetu Membership Certificate',
          text: 'I am now a proud member of RoomSetu!',
          files: [file],
        });
      } else {
        alert('Sharing is not supported on this browser. Please use the download button instead.');
      }
    } catch (err) {
      console.error('[Certificate] Share failed:', err);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
    >
      {/* Certificate image — this is the entire certificate, no overlays */}
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          borderRadius: '8px',
          overflow: 'hidden',
          lineHeight: 0,
        }}
      >
        <img
          ref={imgRef}
          src={CERT_SRC}
          alt="RoomSetu Certificate of Membership"
          style={{ display: 'block', width: '100%', height: 'auto' }}
          crossOrigin="anonymous"
        />
      </div>

      {/* Action buttons — outside the certificate, never part of download */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'center',
          marginTop: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={handleDownloadPNG}
          disabled={isExporting}
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          ⬇ {isExporting ? 'Exporting…' : 'Download PNG'}
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={isExporting}
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          📄 {isExporting ? 'Exporting…' : 'Download PDF'}
        </button>
        <button
          onClick={handleShare}
          disabled={isExporting}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          ↗ Share Certificate
        </button>
      </div>
    </div>
  );
}
