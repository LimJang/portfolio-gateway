'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AuthUser {
  id: string
  username: string
  displayName: string
  loginTime: string
}

export default function AdminPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [supabase, setSupabase] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')
  const router = useRouter()

  // 폼 데이터
  const [formData, setFormData] = useState({
    version: '',
    title: '',
    description: '',
    category: 'feature' as 'feature' | 'bugfix' | 'security' | 'improvement',
    is_major: false
  })

  // 인증 체크
  useEffect(() => {
    const checkAuth = () => {
      try {
        const userSession = sessionStorage.getItem('auth_user')
        if (!userSession) {
          router.push('/auth')
          return
        }

        const user = JSON.parse(userSession)
        setAuthUser(user)
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/auth')
      }
    }

    checkAuth()
  }, [router])

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
    setMessage('')
  }

  const validateForm = (): boolean => {
    if (!formData.version.trim()) {
      setMessage('버전을 입력해주세요')
      setMessageType('error')
      return false
    }

    if (!formData.title.trim()) {
      setMessage('제목을 입력해주세요')
      setMessageType('error')
      return false
    }

    if (!formData.description.trim()) {
      setMessage('설명을 입력해주세요')
      setMessageType('error')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !authUser || !supabase) return
    
    setIsLoading(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('patch_notes')
        .insert([{
          version: formData.version.trim(),
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          is_major: formData.is_major,
          author_id: authUser.id,
          author_name: authUser.displayName || authUser.username,
          published: true
        }])

      if (error) {
        console.error('패치노트 생성 에러:', error)
        setMessage('패치노트 생성 중 오류가 발생했습니다')
        setMessageType('error')
        return
      }

      setMessage(`패치노트 ${formData.version} 생성 완료!`)
      setMessageType('success')
      
      // 폼 초기화
      setFormData({
        version: '',
        title: '',
        description: '',
        category: 'feature',
        is_major: false
      })

    } catch (error) {
      console.error('패치노트 생성 에러:', error)
      setMessage('패치노트 생성 중 오류가 발생했습니다')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  // 인증 로딩 중
  if (!authUser) {
    return (
      <div className="min-h-screen bg-black text-green-400 flex items-center justify-center p-4 crt-effect">
        <div className="retro-border p-6 md:p-8 w-full max-w-sm md:max-w-md relative">
          <div className="scanline"></div>
          <h1 className="text-xl md:text-2xl mb-6 text-center retro-glow typewriter">
            AUTHENTICATING...
          </h1>
          <div className="text-center">
            <div className="mt-4">
              <span className="inline-block w-2 h-2 bg-green-400 retro-pulse mr-1"></span>
              <span className="inline-block w-2 h-2 bg-green-400 retro-pulse mr-1 delay-100"></span>
              <span className="inline-block w-2 h-2 bg-green-400 retro-pulse delay-200"></span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-green-400 crt-effect">
      {/* Header */}
      <header className="border-b-2 border-green-400 p-3 md:p-4 retro-flicker">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          <h1 className="text-lg sm:text-xl md:text-2xl retro-glow typewriter">
            ADMIN_PANEL.EXE
          </h1>
          
          <div className="flex items-center space-x-4">
            <span className="text-xs text-gray-400">
              &gt; {authUser.displayName} (@{authUser.username})
            </span>
            
            <Link href="/patch-notes" className="retro-button text-xs py-1 px-3">
              VIEW_PATCHES
            </Link>
            
            <Link href="/" className="retro-button text-xs py-1 px-3">
              HOME
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        
        {/* Welcome Section */}
        <section className="text-center mb-8 fade-in-up">
          <h2 className="text-2xl sm:text-3xl md:text-4xl mb-4 retro-glow">
            &gt; CREATE_PATCH_NOTE_
          </h2>
          <p className="text-sm md:text-lg text-gray-400 mb-6">
            새로운 업데이트 내역을 추가하세요
          </p>
        </section>

        {/* Form Section */}
        <section className="retro-border p-6 md:p-8 relative">
          <div className="scanline"></div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Version & Major Release */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs mb-2 text-green-400">
                  &gt; VERSION:
                </label>
                <input
                  type="text"
                  name="version"
                  value={formData.version}
                  onChange={handleInputChange}
                  className="retro-input w-full"
                  placeholder="v1.5.0"
                  maxLength={20}
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="flex items-end">
                <label className="flex items-center space-x-2 text-yellow-400">
                  <input
                    type="checkbox"
                    name="is_major"
                    checked={formData.is_major}
                    onChange={handleInputChange}
                    className="w-4 h-4 bg-black border-2 border-yellow-400 text-yellow-400 focus:ring-yellow-400"
                    disabled={isLoading}
                  />
                  <span className="text-xs">MAJOR_RELEASE ⭐</span>
                </label>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs mb-2 text-green-400">
                &gt; CATEGORY:
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="retro-input w-full"
                required
                disabled={isLoading}
              >
                <option value="feature">✨ NEW FEATURE</option>
                <option value="improvement">⚡ IMPROVEMENT</option>
                <option value="security">🔒 SECURITY</option>
                <option value="bugfix">🐛 BUG FIX</option>
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs mb-2 text-green-400">
                &gt; TITLE:
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="retro-input w-full"
                placeholder="새로운 기능 추가"
                maxLength={100}
                required
                disabled={isLoading}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs mb-2 text-green-400">
                &gt; DESCRIPTION:
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="retro-input w-full h-32 resize-none"
                placeholder="• 새로운 기능 설명&#10;• 개선사항 목록&#10;• 주요 변경사항"
                maxLength={1000}
                required
                disabled={isLoading}
              />
              <div className="text-xs text-gray-500 mt-1">
                &gt; TIP: 각 항목을 새 줄에 작성하세요 (• 자동 추가됨)
              </div>
            </div>

            {/* Message */}
            {message && (
              <div className={`retro-border p-3 ${
                messageType === 'success' 
                  ? 'border-green-400 bg-green-400 bg-opacity-10' 
                  : 'border-red-400 bg-red-400 bg-opacity-10'
              }`}>
                <p className={`text-xs ${
                  messageType === 'success' ? 'text-green-400' : 'text-red-400'
                }`}>
                  &gt; {messageType === 'success' ? 'SUCCESS' : 'ERROR'}: {message}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !supabase}
              className="retro-button w-full py-3 text-sm"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <span className="mr-2">CREATING_PATCH</span>
                  <span className="inline-block w-2 h-2 bg-green-400 retro-pulse mr-1"></span>
                  <span className="inline-block w-2 h-2 bg-green-400 retro-pulse mr-1 delay-100"></span>
                  <span className="inline-block w-2 h-2 bg-green-400 retro-pulse delay-200"></span>
                </div>
              ) : (
                <>EXECUTE_CREATE_PATCH</>
              )}
            </button>
          </form>
        </section>

        {/* Instructions */}
        <section className="mt-8 retro-border p-4 md:p-6 bg-gray-900 bg-opacity-30">
          <h3 className="text-lg mb-4 text-yellow-400 retro-glow">
            &gt; INSTRUCTIONS
          </h3>
          
          <div className="space-y-2 text-xs md:text-sm text-gray-400">
            <p>&gt; VERSION: 시맨틱 버저닝 사용 (v1.2.3)</p>
            <p>&gt; CATEGORY: 적절한 카테고리 선택</p>
            <p>&gt; MAJOR_RELEASE: 중요한 업데이트인 경우 체크</p>
            <p>&gt; DESCRIPTION: 각 변경사항을 새 줄에 작성</p>
            <p>&gt; ACCESS: 로그인된 사용자만 패치노트 생성 가능</p>
          </div>
        </section>

        {/* Footer */}
        <section className="mt-8 retro-border p-4 retro-flicker">
          <div className="text-xs space-y-1 text-gray-500">
            <p>&gt; ADMIN_SYSTEM: Supabase Database Management</p>
            <p>&gt; AUTHOR: {authUser.displayName} (@{authUser.username})</p>
            <p>&gt; TIMESTAMP: {new Date().toLocaleString('ko-KR')}</p>
          </div>
        </section>
      </main>

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-px h-px bg-green-400 shadow-[0_0_20px_10px_rgba(0,255,65,0.3)] animate-pulse"></div>
        <div className="hidden md:block absolute top-3/4 right-1/3 w-px h-px bg-purple-400 shadow-[0_0_15px_8px_rgba(128,0,255,0.3)] animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 right-1/4 w-px h-px bg-yellow-400 shadow-[0_0_25px_12px_rgba(255,255,0,0.3)] animate-pulse delay-2000"></div>
      </div>
    </div>
  )
}
