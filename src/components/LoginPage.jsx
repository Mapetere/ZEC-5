import { useState, useRef, useEffect } from 'react';

/**
 * LoginPage — Email + OTP authentication flow (LocalLink-style).
 * Simulates OTP verification for demo purposes.
 */
export default function LoginPage({ onLogin }) {
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const otpRefs = useRef([]);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    // Simulate OTP send
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOtp(code);
    setTimeout(() => {
      setLoading(false);
      setStep('otp');
      console.log(`[ZET-5] OTP for ${email}: ${code}`);
    }, 1200);
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;

    const next = [...otp];
    next[index] = value;
    setOtp(next);
    setError('');

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      if (code === generatedOtp) {
        localStorage.setItem('zet5_auth', JSON.stringify({ email, ts: Date.now() }));
        onLogin(email);
      } else {
        setError('Invalid verification code. Please try again.');
        setOtp(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
      }
      setLoading(false);
    }, 800);
  };

  useEffect(() => {
    if (step === 'otp') {
      otpRefs.current[0]?.focus();
    }
  }, [step]);

  return (
    <div className="login-wrapper">
      <div className="login-card fade-in">
        <div className="login-logo">
          <div className="login-logo-icon">ZET</div>
          <h1>ZET<span>-5</span></h1>
        </div>
        <p className="login-subtitle">Energy Controller Interface</p>

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit}>
            {error && <div className="login-error">{error}</div>}
            <label className="login-label" htmlFor="login-email">Email Address</label>
            <div className="login-input-wrap">
              <input
                id="login-email"
                className="login-input"
                type="email"
                placeholder="engineer@zet5.co.zw"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                autoFocus
                autoComplete="email"
              />
            </div>
            <button className="btn-primary" type="submit" disabled={loading} id="btn-send-otp">
              {loading ? 'Sending Code...' : 'Send Verification Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Verification code sent to
            </p>
            <p style={{ fontSize: 14, color: 'var(--accent-blue)', marginBottom: 24, fontWeight: 500 }}>
              {email}
            </p>
            {error && <div className="login-error">{error}</div>}
            <label className="login-label">Enter 6-Digit Code</label>
            <div className="otp-inputs" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  className="otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  id={`otp-input-${i}`}
                />
              ))}
            </div>
            <button className="btn-primary" type="submit" disabled={loading} id="btn-verify-otp">
              {loading ? 'Verifying...' : 'Verify & Access'}
            </button>
            <button
              type="button"
              className="login-back"
              onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setError(''); }}
            >
              Back to email
            </button>
            <p style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'var(--text-muted)' }}>
              Check browser console for demo OTP
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
