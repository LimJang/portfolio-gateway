'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    password: '',
    confirmPassword: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [supabase, setSupabase] = useState<any>(null)
  const router = useRouter()

  // Supabase 초기화
  useState(() => {
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
  })

  // 비밀번호 해시 함수 (간단한 해시)
  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(password + 'portfolio_salt_2025')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const validateForm = (): boolean => {
    if (!formData.username.trim()) {
      setError('사용자명을 입력해주세요')
      return false
    }

    if (formData.username.length < 3) {
      setError('사용자명은 3자 이상이어야 합니다')
      return false
    }

    if (!formData.password) {
      setError('비밀번호를 입력해주세요')
      return false
    }

    if (formData.password.length < 4) {
      setError('비밀번호는 4자 이상이어야 합니다')
      return false
    }

    if (!isLogin) {
      if (!formData.displayName.trim()) {
        setError('표시 이름을 입력해주세요')
        return false
      }

      if (formData.password !== formData.confirmPassword) {
        setError('비밀번호가 일치하지 않습니다')
        return false
      }
    }

    return true
  }

  const handleLogin = async () => {
    if (!supabase) return

    try {
      const passwordHash = await hashPassword(formData.password)
      
      const { data: user, error } = await supabase
        .from('users')
        .select('id, username, display_name')
        .eq('username', formData.username.trim())
        .eq('password_hash', passwordHash)
        .single()

      if (error || !user) {
        setError('사용자명 또는 비밀번호가 올바르지 않습니다')
        return
      }

      // 로그인 시간 업데이트
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id)

      // 세션 저장 (localStorage 대신 sessionStorage 사용)
      sessionStorage.setItem('auth_user', JSON.stringify({
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        loginTime: new Date().toISOString()
      }))

      // 채팅으로 리다이렉트
      router.push('/chat')

    } catch (error) {
      console.error('로그인 에러:', error)
      setError('로그인 중 오류가 발생했습니다')
    }
  }

  const handleRegister = async () => {
    if (!supabase) return

    try {
      // 사용자명 중복 체크
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', formData.username.trim())
        .single()

      if (existingUser) {
        setError('이미 사용중인 사용자명입니다')
        return
      }

      const passwordHash = await hashPassword(formData.password)

      // 새 사용자 생성
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([{
          username: formData.username.trim(),
          display_name: formData.displayName.trim(),
          password_hash: passwordHash,
          last_login: new Date().toISOString()
        }])
        .select('id, username, display_name')
        .single()

      if (error) {
        console.error('회원가입 에러:', error)
        setError('회원가입 중 오류가 발생했습니다')
        return
      }

      // 세션 저장
      sessionStorage.setItem('auth_user', JSON.stringify({
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.display_name,
        loginTime: new Date().toISOString()
      }))

      // 채팅으로 리다이렉트
      router.push('/chat')

    } catch (error) {
      console.error('회원가입 에러:', error)
      setError('회원가입 중 오류가 발생했습니다')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    setError('')

    try {
      if (isLogin) {
        await handleLogin()
      } else {
        await handleRegister()
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-green-400 flex items-center justify-center p-4 crt-effect">
      <div className="retro-border p-6 md:p-8 w-full max-w-md relative">
        <div className="scanline"></div>
        
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl md:text-2xl retro-glow typewriter mb-2">
            {isLogin ? 'USER_LOGIN.EXE' : 'USER_REGISTER.EXE'}
          </h1>
          <p className="text-xs text-gray-500">
            &gt; {isLogin ? 'Access Terminal Authentication' : 'Create New User Account'}
          </p>
        </div>

        {/* Auth Toggle */}
        <div className="flex mb-6 retro-border bg-gray-900 bg-opacity-30">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 text-xs transition-all ${
              isLogin 
                ? 'bg-green-400 text-black retro-glow' 
                : 'text-green-400 hover:bg-green-400 hover:bg-opacity-10'
            }`}
          >
            LOGIN
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 text-xs transition-all ${
              !isLogin 
                ? 'bg-green-400 text-black retro-glow' 
                : 'text-green-400 hover:bg-green-400 hover:bg-opacity-10'
            }`}
          >
            REGISTER
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-xs mb-2 text-green-400">
              &gt; USERNAME:
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="retro-input w-full"
              placeholder="enter_username"
              maxLength={20}
              required
              disabled={isLoading}
            />
          </div>

          {/* Display Name (Register only) */}
          {!isLogin && (
            <div>
              <label className="block text-xs mb-2 text-green-400">
                &gt; DISPLAY_NAME:
              </label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleInputChange}
                className="retro-input w-full"
                placeholder="your_display_name"
                maxLength={30}
                required
                disabled={isLoading}
              />
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-xs mb-2 text-green-400">
              &gt; PASSWORD:
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="retro-input w-full"
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </div>

          {/* Confirm Password (Register only) */}
          {!isLogin && (
            <div>
              <label className="block text-xs mb-2 text-green-400">
                &gt; CONFIRM_PASSWORD:
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="retro-input w-full"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="retro-border border-red-400 bg-red-400 bg-opacity-10 p-3">
              <p className="text-red-400 text-xs">
                &gt; ERROR: {error}
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
                <span className="mr-2">PROCESSING</span>
                <span className="inline-block w-2 h-2 bg-green-400 retro-pulse mr-1"></span>
                <span className="inline-block w-2 h-2 bg-green-400 retro-pulse mr-1 delay-100"></span>
                <span className="inline-block w-2 h-2 bg-green-400 retro-pulse delay-200"></span>
              </div>
            ) : (
              <>EXECUTE_{isLogin ? 'LOGIN' : 'REGISTER'}</>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="text-center">
            <a 
              href="/" 
              className="text-xs text-gray-500 hover:text-green-400 transition-colors"
            >
              &gt; RETURN_TO_MAIN_TERMINAL
            </a>
          </div>
          
          <div className="mt-3 text-xs text-gray-600 space-y-1">
            <p>&gt; Security: SHA-256 Password Hash</p>
            <p>&gt; Session: Browser Session Storage</p>
            <p>&gt; Database: Supabase PostgreSQL</p>
          </div>
        </div>
      </div>

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-px h-px bg-green-400 shadow-[0_0_20px_10px_rgba(0,255,65,0.3)] animate-pulse"></div>
        <div className="hidden md:block absolute top-3/4 right-1/3 w-px h-px bg-red-400 shadow-[0_0_15px_8px_rgba(255,0,0,0.3)] animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 right-1/4 w-px h-px bg-blue-400 shadow-[0_0_25px_12px_rgba(0,100,255,0.3)] animate-pulse delay-2000"></div>
      </div>
    </div>
  )
}
