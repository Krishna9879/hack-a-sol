'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  AcademicCapIcon, 
  ChartBarIcon, 
  BookOpenIcon,
  RocketLaunchIcon,
  FireIcon,
  TrophyIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function DashboardPage() {
  const [userRole] = useState('student') // This would come from auth context

  const studentStats = {
    totalPoints: 1250,
    currentStreak: 7,
    completedCourses: 3,
    mockTestsTaken: 12,
    averageScore: 78
  }

  const recentCourses = [
    {
      id: 1,
      title: 'Introduction to HTML',
      progress: 85,
      subject: 'Web Development',
      lastAccessed: '2 hours ago'
    },
    {
      id: 2,
      title: 'JavaScript Fundamentals',
      progress: 60,
      subject: 'Programming',
      lastAccessed: '1 day ago'
    },
    {
      id: 3,
      title: 'React Basics',
      progress: 30,
      subject: 'Frontend',
      lastAccessed: '3 days ago'
    }
  ]

  const upcomingMockTests = [
    {
      id: 1,
      title: 'JEE Main Mock Test #5',
      date: '2024-01-15',
      duration: '3 hours',
      subjects: ['Physics', 'Chemistry', 'Mathematics']
    },
    {
      id: 2,
      title: 'NEET Practice Test',
      date: '2024-01-18',
      duration: '3 hours',
      subjects: ['Biology', 'Chemistry', 'Physics']
    }
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Header */}
      <header className="bg-slate-900/60 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <AcademicCapIcon className="h-8 w-8 text-primary-400" />
              <span className="text-2xl font-bold text-gradient">Rural Learn</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FireIcon className="h-5 w-5 text-orange-500" />
                <span className="font-medium">{studentStats.currentStreak} day streak</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrophyIcon className="h-5 w-5 text-yellow-500" />
                <span className="font-medium">{studentStats.totalPoints} points</span>
              </div>
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-50 mb-2">
            Welcome back, Student! 👋
          </h1>
          <p className="text-slate-300">
            Ready to continue your learning journey? Let's make today count!
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-primary-500/10 rounded-lg">
                <BookOpenIcon className="h-6 w-6 text-primary-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-300">Completed Courses</p>
                <p className="text-2xl font-bold text-slate-50">{studentStats.completedCourses}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-300">Mock Tests</p>
                <p className="text-2xl font-bold text-slate-50">{studentStats.mockTestsTaken}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <TrophyIcon className="h-6 w-6 text-amber-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-300">Average Score</p>
                <p className="text-2xl font-bold text-slate-50">{studentStats.averageScore}%</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <FireIcon className="h-6 w-6 text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-300">Current Streak</p>
                <p className="text-2xl font-bold text-slate-50">{studentStats.currentStreak} days</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Courses */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="card"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-50">Continue Learning</h2>
              <Link href="/courses" className="text-primary-600 hover:text-primary-700 font-medium">
                View All
              </Link>
            </div>

            <div className="space-y-4">
              {recentCourses.map((course) => (
                <div key={course.id} className="border border-white/10 rounded-xl p-4 bg-white/5 hover:bg-white/10 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-slate-50">{course.title}</h3>
                    <span className="text-sm text-slate-300">{course.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full" 
                      style={{ width: `${course.progress}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>{course.subject}</span>
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {course.lastAccessed}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Upcoming Mock Tests */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="card"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-50">Upcoming Mock Tests</h2>
              <Link href="/mock-tests" className="text-primary-600 hover:text-primary-700 font-medium">
                View All
              </Link>
            </div>

            <div className="space-y-4">
              {upcomingMockTests.map((test) => (
                <div key={test.id} className="border border-white/10 rounded-xl p-4 bg-white/5 hover:bg-white/10 hover:shadow-lg transition-all">
                  <h3 className="font-medium text-slate-50 mb-2">{test.title}</h3>
                  <div className="flex items-center justify-between text-sm text-slate-300 mb-2">
                    <span>{test.date}</span>
                    <span>{test.duration}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {test.subjects.map((subject) => (
                      <span 
                        key={subject}
                        className="px-2 py-1 bg-slate-900/60 text-slate-200 text-xs rounded-full"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8"
        >
          <h2 className="text-xl font-bold text-slate-50 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/courses/generate" className="card hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-center">
                <RocketLaunchIcon className="h-12 w-12 text-primary-600 mx-auto mb-4" />
                <h3 className="font-medium text-slate-50 mb-2">Generate AI Course</h3>
                <p className="text-sm text-slate-300">Create personalized learning content</p>
              </div>
            </Link>

            <Link href="/mock-tests/generate" className="card hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-center">
                <ChartBarIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-medium text-slate-50 mb-2">Take Mock Test</h3>
                <p className="text-sm text-slate-300">Test your knowledge with AI predictions</p>
              </div>
            </Link>

            <Link href="/career" className="card hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-center">
                <TrophyIcon className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                <h3 className="font-medium text-slate-50 mb-2">Career Guidance</h3>
                <p className="text-sm text-slate-300">Get AI-powered career roadmaps</p>
              </div>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}