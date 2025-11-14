'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  PlayIcon,
  ClockIcon,
  UserIcon,
  StarIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [selectedLevel, setSelectedLevel] = useState('all')

  const subjects = [
    'All Subjects', 'Web Development', 'Programming', 'Data Science', 
    'Mobile Development', 'AI/ML', 'Mathematics', 'Physics', 'Chemistry'
  ]

  const levels = ['All Levels', 'Beginner', 'Intermediate', 'Advanced']

  const courses = [
    {
      id: 1,
      title: 'Complete HTML & CSS Mastery',
      description: 'Learn HTML and CSS from basics to advanced with hands-on projects',
      subject: 'Web Development',
      level: 'Beginner',
      duration: '8 hours',
      modules: 12,
      rating: 4.8,
      students: 1250,
      instructor: 'AI Generated',
      isAIGenerated: true,
      thumbnail: '/api/placeholder/300/200',
      progress: 0
    },
    {
      id: 2,
      title: 'JavaScript Fundamentals',
      description: 'Master JavaScript programming with interactive examples and projects',
      subject: 'Programming',
      level: 'Beginner',
      duration: '12 hours',
      modules: 15,
      rating: 4.9,
      students: 980,
      instructor: 'Prof. Sharma',
      isAIGenerated: false,
      thumbnail: '/api/placeholder/300/200',
      progress: 60
    },
    {
      id: 3,
      title: 'React Development Bootcamp',
      description: 'Build modern web applications with React and its ecosystem',
      subject: 'Web Development',
      level: 'Intermediate',
      duration: '20 hours',
      modules: 25,
      rating: 4.7,
      students: 750,
      instructor: 'AI Generated',
      isAIGenerated: true,
      thumbnail: '/api/placeholder/300/200',
      progress: 30
    },
    {
      id: 4,
      title: 'Data Science with Python',
      description: 'Learn data analysis, visualization, and machine learning with Python',
      subject: 'Data Science',
      level: 'Intermediate',
      duration: '25 hours',
      modules: 30,
      rating: 4.6,
      students: 650,
      instructor: 'Dr. Patel',
      isAIGenerated: false,
      thumbnail: '/api/placeholder/300/200',
      progress: 0
    }
  ]

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSubject = selectedSubject === 'all' || course.subject === selectedSubject
    const matchesLevel = selectedLevel === 'all' || course.level.toLowerCase() === selectedLevel.toLowerCase()
    
    return matchesSearch && matchesSubject && matchesLevel
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Header */}
      <header className="bg-slate-900/60 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-gradient">Rural Learn</span>
            </Link>
            <Link href="/courses/generate" className="btn-primary flex items-center">
              <RocketLaunchIcon className="h-5 w-5 mr-2" />
              Generate AI Course
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-50 mb-2">Explore Courses</h1>
          <p className="text-slate-300">
            Discover AI-generated and teacher-created courses tailored for rural education
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="card mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Subject Filter */}
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="pl-10 pr-8 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
              >
                {subjects.map((subject) => (
                  <option key={subject} value={subject === 'All Subjects' ? 'all' : subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            {/* Level Filter */}
            <div>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
              >
                {levels.map((level) => (
                  <option key={level} value={level === 'All Levels' ? 'all' : level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Courses Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredCourses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="card hover:shadow-2xl transition-shadow cursor-pointer"
            >
              <Link href={`/courses/${course.id}`}>
                {/* Course Thumbnail */}
                <div className="relative mb-4">
                  <div className="w-full h-48 bg-gradient-to-br from-slate-900/80 to-slate-700/80 rounded-xl flex items-center justify-center">
                    <PlayIcon className="h-12 w-12 text-primary-400" />
                  </div>
                  {course.isAIGenerated && (
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                      AI Generated
                    </div>
                  )}
                  {course.progress > 0 && (
                    <div className="absolute bottom-2 left-2 right-2">
                    <div className="bg-slate-900/80 rounded-full p-1">
                        <div className="w-full bg-slate-800 rounded-full h-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full" 
                            style={{ width: `${course.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Course Info */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-1 bg-primary-500/20 text-primary-200 text-xs rounded-full">
                      {course.subject}
                    </span>
                    <span className="px-2 py-1 bg-slate-900/60 text-slate-200 text-xs rounded-full">
                      {course.level}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-50 mb-2 line-clamp-2">
                    {course.title}
                  </h3>
                  
                  <p className="text-slate-300 text-sm mb-4 line-clamp-2">
                    {course.description}
                  </p>

                  {/* Course Stats */}
                  <div className="flex items-center justify-between text-sm text-slate-300 mb-4">
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {course.duration}
                    </div>
                    <div className="flex items-center">
                      <span>{course.modules} modules</span>
                    </div>
                  </div>

                  {/* Rating and Students */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="ml-1 text-sm font-medium">{course.rating}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-300">
                      <UserIcon className="h-4 w-4 mr-1" />
                      {course.students}
                    </div>
                  </div>

                  {/* Instructor */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-slate-300">
                      by <span className="font-medium">{course.instructor}</span>
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* No Results */}
        {filteredCourses.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center py-12"
          >
            <div className="text-gray-400 mb-4">
              <MagnifyingGlassIcon className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search criteria or generate a new AI course
            </p>
            <Link href="/courses/generate" className="btn-primary">
              Generate AI Course
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  )
}