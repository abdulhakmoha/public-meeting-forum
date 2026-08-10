import { Outlet, Link, useLocation } from 'react-router-dom';
import { LogIn, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, [location.pathname]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const linkClass = isHome
    ? 'text-white/80 hover:text-white font-medium transition-colors'
    : 'text-slate-600 hover:text-slate-900 font-medium transition-colors';

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F4F7F5] text-slate-900">
      <nav
        className={`sticky top-0 z-50 px-4 py-3 sm:px-6 lg:px-8 transition-colors ${
          isHome
            ? 'bg-[#0B1F1A]/80 backdrop-blur-md border-b border-white/10 text-white'
            : 'bg-white/90 backdrop-blur-md border-b border-slate-200/80 text-slate-900'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className={`text-lg font-semibold tracking-tight transition-colors ${
              isHome ? 'text-white hover:text-teal-200' : 'text-slate-900 hover:text-teal-700'
            }`}
          >
            Home
          </Link>

          <div className="hidden md:flex items-center gap-7">
            <Link to="/about" className={linkClass}>About</Link>
            <Link to="/forums" className={linkClass}>Forums</Link>
            <div className={`h-5 w-px ${isHome ? 'bg-white/20' : 'bg-slate-200'}`} />
            <Link
              to="/login"
              className={`flex items-center gap-2 ${linkClass} ${!isHome ? 'hover:text-teal-700' : ''}`}
            >
              <LogIn size={18} />
              Sign In
            </Link>
            <Link
              to="/register"
              className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 rounded-lg font-semibold transition-all hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>

          <button
            type="button"
            className={`md:hidden p-2 rounded-lg transition-colors ${isHome ? 'text-white hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-200 overflow-hidden"
          >
            <div className="px-4 py-4 flex flex-col gap-3">
              <Link to="/" className="text-slate-900 font-semibold py-2">Home</Link>
              <Link to="/about" className="text-slate-700 font-medium py-2">About</Link>
              <Link to="/forums" className="text-slate-700 font-medium py-2">Forums</Link>
              <hr className="border-slate-200" />
              <Link to="/login" className="text-teal-700 font-medium py-2 flex items-center gap-2">
                <LogIn size={18} /> Sign In
              </Link>
              <Link to="/register" className="bg-teal-600 text-white px-5 py-2.5 rounded-lg font-semibold text-center">
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-grow">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-sm">
          <span className="font-display text-slate-800 text-base">PMCFMS</span>
          <p>&copy; {new Date().getFullYear()} Public Meeting & Community Forum. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
