'use client'

import { motion } from 'framer-motion'
import { AcademicCapIcon } from '@heroicons/react/24/outline'

export default function Loading() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <div className="relative flex flex-col items-center space-y-6">
        <motion.div
          className="w-20 h-20 rounded-3xl border border-white/20 bg-white/5 flex items-center justify-center shadow-xl shadow-slate-900/60 backdrop-blur-xl"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [0.9, 1.05, 0.9], opacity: 1 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <AcademicCapIcon className="h-10 w-10 text-primary-400" />
        </motion.div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <p className="text-sm font-medium tracking-[0.2em] uppercase text-slate-300 mb-2">
            Rural Learn
          </p>
          <p className="text-lg text-slate-100">Preparing your learning experience...</p>
        </motion.div>

        <div className="mt-2 w-40 h-1.5 rounded-full bg-slate-900/60 overflow-hidden">
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary-400 via-sky-400 to-indigo-400"
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </div>
  )
}
