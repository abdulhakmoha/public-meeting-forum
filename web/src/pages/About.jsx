import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function About() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-16 md:py-24 bg-[#F4F7F5]">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <p className="font-display text-teal-800 text-lg mb-3">PMCFMS</p>
          <h1 className="font-display text-4xl md:text-5xl text-slate-900 tracking-tight mb-6">
            About the platform
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-10">
            The Public Meeting & Community Forum Management System bridges citizens and
            decision-makers. We foster transparent, inclusive engagement through simple digital tools.
          </p>

          <h2 className="font-semibold text-xl text-slate-900 mb-4">What we do</h2>
          <ul className="space-y-3 text-slate-600 text-lg leading-relaxed mb-12">
            <li className="border-l-2 border-teal-600 pl-4">Facilitate virtual and hybrid public meetings.</li>
            <li className="border-l-2 border-teal-600 pl-4">Provide secure, moderated community forums.</li>
            <li className="border-l-2 border-teal-600 pl-4">Keep transparent records and archives.</li>
            <li className="border-l-2 border-teal-600 pl-4">Give citizens a clear voice in local decisions.</li>
          </ul>

          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-lg font-semibold transition-transform hover:-translate-y-0.5"
          >
            Get Started <ArrowRight size={18} />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
