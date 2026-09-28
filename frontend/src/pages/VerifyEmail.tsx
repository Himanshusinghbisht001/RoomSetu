import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { verifyEmail, resendVerification } from '../auth/authApi.js';
import logoSrc from '../assets/logo.jpg';
import { useAuth } from '../auth/AuthProvider.js';

export default function VerifyEmail() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  // Accept email passed via location.state, else redirect if none
  const email = (location.state as any)?.email;

  useEffect(() => {
    if (!email && !isAuthenticated) {
      navigate('/register', { replace: true });
    }
  }, [email, isAuthenticated, navigate]);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    try {
      await verifyEmail({ email, otp });
      setSuccess('Email verified successfully!');
      setTimeout(() => {
        navigate('/login', { state: { verified: true }, replace: true });
      }, 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Verification failed. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setSuccess('');
    
    try {
      await resendVerification({ email });
      setSuccess('A new verification code has been sent.');
      setResendCooldown(60);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to resend code.';
      setError(msg);
    }
  };

  if (!email) return null;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src={logoSrc} alt="RoomSetu" />
        </div>
        <h1 className="auth-title">Verify Your Email</h1>
        <p className="auth-subtitle">We've sent a 6-digit verification code to <strong>{email}</strong>.</p>

        {error && (
          <div className="error-card" role="alert" aria-live="assertive">
            {error}
          </div>
        )}
        
        {success && (
          <div className="success-card" role="status" aria-live="polite">
            {success}
          </div>
        )}

        <form
          className="auth-form"
          onSubmit={handleSubmit}
          noValidate
          aria-label="Email Verification Form"
        >
          <div className="form-group">
            <label className="form-label" htmlFor="verify-otp">
              Verification Code
            </label>
            <input
              id="verify-otp"
              className="form-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
              style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.25rem', fontWeight: 'bold' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={isSubmitting || otp.length !== 6 || !!success}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <p className="auth-footer" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span>Didn't receive the code?</span>
          <button 
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="btn btn-secondary btn-full"
            style={{ width: '100%', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer' }}
          >
            {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend Code'}
          </button>
        </p>
        
        <p className="auth-footer">
          <Link to="/login">Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
