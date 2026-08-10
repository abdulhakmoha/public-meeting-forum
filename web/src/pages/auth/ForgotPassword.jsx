import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim() });
      setSuccess(data.message || 'Check your email for a reset link.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send reset email. Try again.');
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
          <h1 className="font-display text-3xl text-slate-900 tracking-tight mb-2">Forgot password</h1>
          <p className="text-slate-600">
            Enter your account email and we&apos;ll send you a link to reset your password.
          </p>
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
              disabled={isSubmitting || !!success}
              className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 text-white rounded-xl font-bold transition-all ${
                isSubmitting || success
                  ? 'bg-teal-400 cursor-not-allowed'
                  : 'bg-teal-600 hover:bg-teal-500 hover:-translate-y-0.5 shadow-lg shadow-teal-600/25'
              }`}
            >
              {isSubmitting ? 'Sending...' : 'Send reset link'} <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
