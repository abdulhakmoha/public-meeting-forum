import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

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
      const { data } = await api.post(`/auth/reset-password/${token}`, { password });
      setSuccess(data.message || 'Password updated successfully.');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset password. Request a new link.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <h1 className="font-display text-3xl text-slate-900 tracking-tight mb-2">Set new password</h1>
          <p className="text-slate-600">Choose a new password for your PMCFMS account.</p>
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

          <form className="space-y-5" onSubmit={handleSubmit}>
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
              disabled={isSubmitting || !!success}
              className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 text-white rounded-xl font-bold transition-all ${
                isSubmitting || success
                  ? 'bg-teal-400 cursor-not-allowed'
                  : 'bg-teal-600 hover:bg-teal-500 hover:-translate-y-0.5 shadow-lg shadow-teal-600/25'
              }`}
            >
              {isSubmitting ? 'Updating...' : 'Update password'} <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
