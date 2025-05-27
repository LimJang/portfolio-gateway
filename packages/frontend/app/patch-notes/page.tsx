'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// 패치노트 타입 정의
interface PatchNote {
  id: string
  version: string
  title: string
  description: string
  category: 'feature' | 'bugfix' | 'security' | 'improvement'
  is_major: boolean
  author_name: string
  created_at: string
  published: boolean
}

// 카테고리 설정
const categoryConfig = {
  feature: { label: 'NEW FEATURE', color: 'text-green-400', bg: 'bg-green-400', icon: '✨' },
  improvement: { label: 'IMPROVEMENT', color: 'text-blue-400', bg: 'bg-blue-400', icon: '⚡' },
  security: { label: 'SECURITY', color: 'text-orange-400', bg: 'bg-orange-400', icon: '🔒' },
  bugfix: { label: 'BUG FIX', color: 'text-red-400', bg: 'bg-red-400', icon: '🐛' }
}

export default function PatchNotesPage() {
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [supabase, setSupabase] = useState<any>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Supabase 초기화
  useEffect(() => {
    const initSupabase = async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const url = 'https://vdiqoxxaiiwgqvmtwxxy.supabase.co'
        const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkaXFveHhhaWl3Z3F2bXR3eHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzQ0ODAsImV4cCI6MjA2Mzc1MDQ4MH0.ZxwDHCADi5Q5jxJt6Isjik5j_AmalQE2wYH7SvPpHDA'
        
        const client = createClient(url, key)
        setSupabase(client)
      } catch (error) {
        console.error('Supabase 초기화 실패:', error)
      }
    }
    initSupabase()
  }, [])

  // 패치노트 로드
  useEffect(() => {
    if (supabase) {
      loadPatchNotes()
    }
  }, [supabase])

  const loadPatchNotes = async () => {
    if (!supabase) return

    try {
      setIsLoading(true)

      const { data, error } = await supabase
        .from('patch_notes')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('패치노트 로드 에러:', error)
        return
      }

      setPatchNotes(data || [])
    } catch (error) {
      console.error('loadPatchNotes error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 필터링된 패치노트
  const filteredPatchNotes = patchNotes.filter(note => {
    const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory
    const matchesSearch = searchTerm === '' || 
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.version.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesCategory && matchesSearch
  })

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDescription = (description: string) => {
    return description.split('\n').map((line, index) => (
      <div key={index} className="mb-1">
        {line.trim() && (
          <span className="text-gray-300">
            {line.startsWith('•') ? line : `• ${line}`}
          </span>
        )}
      </div>
    ))
  }

  return (
    <div className="min-h-screen bg-black text-green-400 crt-effect">
      {/* Header */}
      <header className="border-b-2 border-green-400 p-3 md:p-4 retro-flicker">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          <h1 className="text-lg sm:text-xl md:text-2xl retro-glow typewriter">
            PATCH_NOTES.EXE
          </h1>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 md:w-3 md:h-3 bg-green-400 retro-pulse"></div>
              <span className="text-xs md:text-sm">SYSTEM_ONLINE</span>
            </div>
            
            <Link href="/" className="retro-button text-xs py-1 px-3">
              RETURN_HOME
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        
        {/* Welcome Section */}
        <section className="text-center mb-8 md:mb-12 fade-in-up">
          <h2 className="text-2xl sm:text-3xl md:text-4xl mb-4 retro-glow">
            &gt; UPDATE_HISTORY.LOG_
          </h2>
          <p className="text-sm md:text-lg text-gray-400 mb-6">
            포트폴리오 게이트웨이 개발 변경사항 및 업데이트 내역
          </p>
        </section>

        {/* Controls */}
        <section className="mb-8 space-y-4">
          {/* Search */}
          <div className="retro-border p-4">
            <label className="block text-xs mb-2 text-green-400">
              &gt; SEARCH_UPDATES:
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="retro-input w-full"
              placeholder="search_version_or_feature..."
              maxLength={50}
            />
          </div>

          {/* Category Filter */}
          <div className="retro-border p-4">
            <label className="block text-xs mb-3 text-green-400">
              &gt; FILTER_CATEGORY:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`retro-button text-xs py-2 px-3 ${
                  selectedCategory === 'all' ? 'bg-green-400 text-black' : ''
                }`}
              >
                ALL
              </button>
              {Object.entries(categoryConfig).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`retro-button text-xs py-2 px-3 ${
                    selectedCategory === key ? `${config.bg} text-black` : `${config.color}`
                  }`}
                >
                  {config.icon} {config.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Patch Notes List */}
        <section className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="retro-border p-8">
                <h3 className="text-xl mb-4">LOADING_PATCH_NOTES...</h3>
                <div className="flex justify-center">
                  <span className="inline-block w-2 h-2 bg-green-400 retro-pulse mr-1"></span>
                  <span className="inline-block w-2 h-2 bg-green-400 retro-pulse mr-1 delay-100"></span>
                  <span className="inline-block w-2 h-2 bg-green-400 retro-pulse delay-200"></span>
                </div>
              </div>
            </div>
          ) : filteredPatchNotes.length === 0 ? (
            <div className="text-center py-12">
              <div className="retro-border p-8 border-yellow-400">
                <h3 className="text-xl mb-4 text-yellow-400">NO_PATCHES_FOUND</h3>
                <p className="text-gray-400">
                  &gt; {searchTerm || selectedCategory !== 'all' 
                    ? '검색 조건에 맞는 패치노트가 없습니다' 
                    : '패치노트를 불러올 수 없습니다'}
                </p>
              </div>
            </div>
          ) : (
            filteredPatchNotes.map((note, index) => (
              <div key={note.id} className="fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className={`retro-border p-6 relative ${
                  note.is_major ? 'border-yellow-400 bg-yellow-400 bg-opacity-5' : ''
                }`}>
                  {note.is_major && <div className="scanline"></div>}
                  
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start mb-4 space-y-2 sm:space-y-0">
                    <div className="flex items-center space-x-3">
                      <span className={`text-xl md:text-2xl font-bold ${
                        note.is_major ? 'text-yellow-400 retro-glow' : 'text-green-400'
                      }`}>
                        {note.version}
                        {note.is_major && <span className="ml-2">⭐</span>}
                      </span>
                      
                      <div className={`retro-border px-2 py-1 ${categoryConfig[note.category].bg} bg-opacity-20`}>
                        <span className={`text-xs ${categoryConfig[note.category].color}`}>
                          {categoryConfig[note.category].icon} {categoryConfig[note.category].label}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 text-right">
                      <div>&gt; {formatDate(note.created_at)}</div>
                      <div>&gt; by {note.author_name}</div>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className={`text-lg md:text-xl mb-4 ${
                    note.is_major ? 'text-yellow-400' : 'text-white'
                  }`}>
                    &gt; {note.title}
                  </h3>

                  {/* Description */}
                  <div className="space-y-1 text-sm md:text-base">
                    {formatDescription(note.description)}
                  </div>

                  {/* Major Release Badge */}
                  {note.is_major && (
                    <div className="mt-4 pt-4 border-t border-yellow-400">
                      <span className="text-xs text-yellow-400 retro-glow">
                        🌟 MAJOR_RELEASE - 주요 기능 업데이트
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </section>

        {/* Stats */}
        <section className="mt-12 retro-border p-6 bg-gray-900 bg-opacity-30">
          <h3 className="text-lg md:text-xl mb-4 text-green-400 retro-glow text-center">
            &gt; UPDATE_STATISTICS
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl md:text-3xl text-green-400 retro-glow mb-1">
                {patchNotes.length}
              </div>
              <div className="text-xs text-gray-400">TOTAL_UPDATES</div>
            </div>
            
            <div>
              <div className="text-2xl md:text-3xl text-yellow-400 retro-glow mb-1">
                {patchNotes.filter(note => note.is_major).length}
              </div>
              <div className="text-xs text-gray-400">MAJOR_RELEASES</div>
            </div>
            
            <div>
              <div className="text-2xl md:text-3xl text-green-400 retro-glow mb-1">
                {patchNotes.filter(note => note.category === 'feature').length}
              </div>
              <div className="text-xs text-gray-400">NEW_FEATURES</div>
            </div>
            
            <div>
              <div className="text-2xl md:text-3xl text-orange-400 retro-glow mb-1">
                {patchNotes.filter(note => note.category === 'security').length}
              </div>
              <div className="text-xs text-gray-400">SECURITY_UPDATES</div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <section className="mt-8 retro-border p-4 retro-flicker">
          <div className="text-xs space-y-1 text-gray-500">
            <p>&gt; PATCH_SYSTEM: Supabase PostgreSQL Database</p>
            <p>&gt; REAL_TIME: WebSocket subscription enabled</p>
            <p>&gt; LAST_SYNC: {new Date().toLocaleString('ko-KR')}</p>
          </div>
        </section>
      </main>

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-px h-px bg-green-400 shadow-[0_0_20px_10px_rgba(0,255,65,0.3)] animate-pulse"></div>
        <div className="hidden md:block absolute top-3/4 right-1/3 w-px h-px bg-blue-400 shadow-[0_0_15px_8px_rgba(0,100,255,0.3)] animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 right-1/4 w-px h-px bg-yellow-400 shadow-[0_0_25px_12px_rgba(255,255,0,0.3)] animate-pulse delay-2000"></div>
      </div>
    </div>
  )
}
