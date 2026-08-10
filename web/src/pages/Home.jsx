import { motion } from 'framer-motion';
import { ArrowRight, MessageSquare, Calendar, Shield, Megaphone, FileText, Vote } from 'lucide-react';
import { Link } from 'react-router-dom';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=2000&q=80';

const cards = [
  {
    icon: Calendar,
    title: 'Public meetings',
    desc: 'Schedule, join, and follow hybrid meetings with a clear agenda and archive.',
    to: '/register',
    accent: 'from-teal-600 to-teal-500',
    iconBg: 'bg-teal-50 text-teal-700',
  },
  {
    icon: MessageSquare,
    title: 'Open forums',
    desc: 'Moderated discussions where citizens and officials can exchange ideas.',
    to: '/forums',
    accent: 'from-cyan-700 to-teal-600',
    iconBg: 'bg-cyan-50 text-cyan-800',
  },
  {
    icon: Vote,
    title: 'Polls & feedback',
    desc: 'Collect community opinions quickly and share results with transparency.',
    to: '/register',
    accent: 'from-emerald-700 to-teal-600',
    iconBg: 'bg-emerald-50 text-emerald-800',
  },
  {
    icon: Megaphone,
    title: 'Announcements',
    desc: 'Publish official updates so everyone stays informed in one place.',
    to: '/about',
    accent: 'from-teal-800 to-teal-600',
    iconBg: 'bg-teal-50 text-teal-800',
  },
  {
    icon: FileText,
    title: 'Documents',
    desc: 'Share agendas, minutes, and public files with secure access controls.',
    to: '/register',
    accent: 'from-slate-700 to-teal-700',
    iconBg: 'bg-slate-100 text-slate-700',
  },
  {
    icon: Shield,
    title: 'Secure roles',
    desc: 'Citizen, moderator, and admin roles built for public accountability.',
    to: '/about',
    accent: 'from-teal-700 to-emerald-600',
    iconBg: 'bg-teal-50 text-teal-700',
  },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      <section className="relative min-h-[min(88vh,860px)] flex items-end overflow-hidden -mt-[1px]">
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <img
            src={HERO_IMAGE}
            alt="Community members in a public meeting"
            className="h-full w-full object-cover"
          />
        </motion.div>

        <div className="absolute inset-0 bg-gradient-to-t from-[#061510] via-[#0B1F1A]/75 to-[#0B1F1A]/35" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(13,148,136,0.25),transparent_55%)]" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-28 md:pb-24 md:pt-32">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white tracking-tight mb-5"
          >
            PMCFMS
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="font-sans text-2xl sm:text-3xl md:text-4xl font-semibold text-teal-100/95 max-w-2xl leading-snug mb-4"
          >
            Your community voice, in one place
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.22 }}
            className="text-base sm:text-lg text-white/75 max-w-xl mb-9 leading-relaxed"
          >
            Public meetings, open forums, and civic updates — built for citizens and decision-makers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.32 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-[#042F2E] px-7 py-3.5 rounded-lg font-bold text-base transition-transform hover:-translate-y-0.5"
            >
              Get Started
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center justify-center gap-2 border border-white/35 hover:border-white/70 text-white px-7 py-3.5 rounded-lg font-semibold text-base backdrop-blur-sm bg-white/5 transition-colors"
            >
              Learn More
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="py-20 md:py-24 px-4 sm:px-6 lg:px-8 bg-[#F4F7F5]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mb-12"
          >
            <h2 className="font-display text-3xl md:text-4xl text-slate-900 tracking-tight mb-3">
              Explore the platform
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              Pick a path — each card opens the tools your community needs.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {cards.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: idx * 0.06 }}
              >
                <Link
                  to={item.to}
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white border border-slate-200/90 shadow-sm shadow-slate-200/40 hover:shadow-lg hover:shadow-teal-900/5 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className={`h-1.5 w-full bg-gradient-to-r ${item.accent}`} />
                  <div className="p-6 flex flex-col flex-1">
                    <div className={`w-12 h-12 rounded-xl ${item.iconBg} flex items-center justify-center mb-4`}>
                      <item.icon className="w-6 h-6" strokeWidth={1.75} />
                    </div>
                    <h3 className="font-semibold text-lg text-slate-900 mb-2 group-hover:text-teal-800 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed flex-1">{item.desc}</p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700">
                      Open
                      <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
