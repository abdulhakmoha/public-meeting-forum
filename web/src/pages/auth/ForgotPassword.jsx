import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.get('/health').catch(() => {});
  }, []);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      const { data } = await api.post(
        '/auth/forgot-password',
        { email: email.trim().toLowerCase() },
        { timeout: 60000 }
      );
      setSuccess(data.message || 'Check your email for the 6-digit code.');
      setStep('code');
    } catch (err) {
      const msg =
        err.code === 'ECONNABORTED'
          ? 'Request timed out. Wait 1 minute for the server to wake up, then try again.'
          : err.response?.data?.message
            || (err.response ? `Server error ${err.response.status}. Wait a minute and try again.` : null)
            || 'Could not reach the server. Wait 1 minute and try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (code.replace(/\D/g, '').length !== 6) {
      setError('Enter the full 6-digit code');
      return;
    }
    setIsSubmitting(true);
    try {
      const { data } = await api.post('/auth/verify-reset-code', {
        email: email.trim().toLowerCase(),
        code: code.replace(/\D/g, ''),
      });
      setSuccess(data.message || 'Code verified.');
      setStep('password');
    } catch (err) {
      setError(err.response?.data?.message || 'That code is incorrect. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetWithCode = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setIsSubmitting(true);
    try {
      const { data } = await api.post('/auth/reset-with-code', {
        email: email.trim().toLowerCase(),
        code: code.replace(/\D/g, ''),
        password,
      });
      setSuccess(data.message || 'Password updated. You can sign in now.');
      setTimeout(() => navigate('/login'), 1600);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset password. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepHint =
    step === 'email'
      ? 'Step 1 of 3 — Enter your email. We will send a 6-digit code.'
      : step === 'code'
        ? 'Step 2 of 3 — Read the code on your phone email (do not tap the email). Type it here on this computer.'
        : 'Step 3 of 3 — Choose your new password.';

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 sm:p-8 bg-[#F4F7F5]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md"
      >
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-teal-700 mb-6"
        >
          <ArrowLeft size={16} /> Back to Sign In
        </Link>

        <div className="mb-7">
          <h1 className="font-display text-3xl text-slate-900 tracking-tight mb-2">Forgot password</h1>
          <p className="text-slate-600">{stepHint}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 text-red-600 px-4 py-3 text-sm font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-5 rounded-xl border border-teal-200 bg-teal-50 text-teal-800 px-4 py-3 text-sm font-medium">
              {success}
            </div>
          )}

          {step === 'email' && (
            <form className="space-y-5" onSubmit={handleSendCode}>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail size={18} className="text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="block w-full pl-11 pr-3 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 text-white rounded-xl font-bold transition-all ${
                  isSubmitting
                    ? 'bg-teal-400 cursor-not-allowed'
                    : 'bg-teal-600 hover:bg-teal-500 hover:-translate-y-0.5 shadow-lg shadow-teal-600/25'
                }`}
              >
                {isSubmitting ? 'Sending code...' : 'Send code'} <ArrowRight size={18} />
              </button>
            </form>
          )}

          {step === 'code' && (
            <form className="space-y-5" onSubmit={handleVerifyCode}>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">6-digit code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  autoFocus
                  className="block w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 tracking-[0.4em] text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                  placeholder="000000"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || code.length !== 6}
                className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 text-white rounded-xl font-bold transition-all ${
                  isSubmitting || code.length !== 6
                    ? 'bg-teal-400 cursor-not-allowed'
                    : 'bg-teal-600 hover:bg-teal-500 hover:-translate-y-0.5 shadow-lg shadow-teal-600/25'
                }`}
              >
                {isSubmitting ? 'Checking...' : 'Verify code'} <ArrowRight size={18} />
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSendCode}
                className="w-full text-sm font-medium text-teal-700 hover:text-teal-600"
              >
                Resend code
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setCode('');
                  setError('');
                  setSuccess('');
                }}
                className="w-full text-sm font-medium text-slate-500 hover:text-teal-700"
              >
                Use a different email
              </button>
            </form>
          )}

          {step === 'password' && (
            <form className="space-y-5" onSubmit={handleResetWithCode}>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">New password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock size={18} className="text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoFocus
                    className="block w-full pl-11 pr-11 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock size={18} className="text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={6}
                    className="block w-full pl-11 pr-3 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                    placeholder="Repeat new password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 text-white rounded-xl font-bold transition-all ${
                  isSubmitting
                    ? 'bg-teal-400 cursor-not-allowed'
                    : 'bg-teal-600 hover:bg-teal-500 hover:-translate-y-0.5 shadow-lg shadow-teal-600/25'
                }`}
              >
                {isSubmitting ? 'Updating...' : 'Update password'} <ArrowRight size={18} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('code');
                  setPassword('');
                  setConfirm('');
                  setError('');
                  setSuccess('');
                }}
                className="w-full text-sm font-medium text-slate-500 hover:text-teal-700"
              >
                Back to code step
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
