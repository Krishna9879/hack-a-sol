'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  AcademicCapIcon, 
  ChartBarIcon, 
  UserGroupIcon, 
  LightBulbIcon,
  HeartIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline'

export default function HomePage() {
  const [userType, setUserType] = useState<'student' | 'teacher' | null>(null)

  const features = [
    {
      icon: LightBulbIcon,
      title: 'AI-Powered Learning',
      description: 'Get personalized content and explanations powered by Gemini AI'
    },
    {
      icon: ChartBarIcon,
      title: 'Mock Test Prediction',
      description: 'Predict exam performance with 50% accuracy across JEE, NEET, CLAT, CAT'
    },
    {
      icon: RocketLaunchIcon,
      title: 'Career Roadmaps',
      description: 'Clear path from basics to advanced with AI-generated roadmaps'
    },
    {
      icon: UserGroupIcon,
      title: 'Teacher Collaboration',
      description: 'Personalized content adapted to teaching styles'
    },
    {
      icon: HeartIcon,
      title: 'Mental Health Support',
      description: 'Stress management and motivation tracking'
    },
    {
      icon: AcademicCapIcon,
      title: 'Progress Tracking',
      description: 'Track growth with meaningful milestones and achievements'
    }
  ]

  return (
    <div className="min-h-screen text-slate-50">
      {/* Header */}
      <header className="bg-slate-900/60 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <AcademicCapIcon className="h-8 w-8 text-primary-400" />
              <span className="text-2xl font-bold text-gradient">Rural Learn</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login" className="text-slate-300 hover:text-slate-50">
                Login
              </Link>
              <Link href="/auth/register" className="btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold text-slate-50 mb-6">
              Bridging the{' '}
              <span className="text-gradient">Education Gap</span>
              <br />
              in Rural India
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
              AI-powered education platform ensuring learning continuity for remote villages. 
              From personalized courses to career guidance, we're transforming rural education.
            </p>
          </motion.div>

          {/* User Type Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12"
          >
            <div className="text-lg font-medium text-slate-200 mb-4 sm:mb-0">
              I am a:
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setUserType('student')}
                className={`px-8 py-4 rounded-xl font-medium transition-all duration-200 ${
                  userType === 'student'
                    ? 'bg-primary-600 text-white shadow-lg scale-105'
                    : 'bg-white/5 text-slate-200 border-2 border-white/10 hover:border-primary-300'
                }`}
              >
                Student
              </button>
              <button
                onClick={() => setUserType('teacher')}
                className={`px-8 py-4 rounded-xl font-medium transition-all duration-200 ${
                  userType === 'teacher'
                    ? 'bg-primary-600 text-white shadow-lg scale-105'
                    : 'bg-white/5 text-slate-200 border-2 border-white/10 hover:border-primary-300'
                }`}
              >
                Teacher
              </button>
            </div>
          </motion.div>

          {userType && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Link
                href={`/auth/register?type=${userType}`}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                Start Learning as {userType === 'student' ? 'Student' : 'Teacher'}
                <RocketLaunchIcon className="ml-2 h-5 w-5" />
              </Link>
            </motion.div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-50 mb-4">
              Powerful Features for Rural Education
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Everything you need to ensure quality education reaches every corner of rural India
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card hover:shadow-2xl transition-shadow duration-200"
              >
                <feature.icon className="h-12 w-12 text-primary-600 mb-4" />
                <h3 className="text-xl font-semibold text-slate-50 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-300">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 gradient-bg text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Making a Real Impact
            </h2>
            <p className="text-xl opacity-90">
              Addressing the critical education shortage in Chhattisgarh
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold mb-2">6,800+</div>
              <div className="text-xl opacity-90">Single-teacher schools</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">212</div>
              <div className="text-xl opacity-90">Schools without teachers</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">50%</div>
              <div className="text-xl opacity-90">Mock test prediction accuracy</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950/80 border-t border-slate-800 text-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <AcademicCapIcon className="h-8 w-8" />
              <span className="text-2xl font-bold">Rural Learn</span>
            </div>
            <div className="text-gray-400">
              © 2024 Rural Learn. Empowering rural education through technology.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}