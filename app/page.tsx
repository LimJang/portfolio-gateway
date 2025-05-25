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

export default function Home() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // 관리자 체크
  const isAdmin = (user: AuthUser): boolean => {
    return user.username.toLowerCase() === 'admin'
  }

  // 인증 상태 체크
  useEffect(() => {
    const checkAuth = () => {
      try {
        const userSession = sessionStorage.getItem('auth_user')
        if (userSession) {
          const user = JSON.parse(userSession)
          setAuthUser(user)
        }
      } catch (error) {
        console.error('Auth check error:', error)
        setAuthUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const handleLogout = () => {
    sessionStorage.removeItem('auth_user')
    setAuthUser(null)
    // 페이지 새로고침하지 않고 상태만 업데이트
  }

  const handleCardClick = (requiresAuth: boolean, path: string) => {
    if (requiresAuth && !authUser) {
      router.push('/auth')
    } else {
      router.push(path)
    }
  }

  return (
    <div className="min-h-screen bg-black text-green-400 crt-effect">
      {/* Header */}
      <header className="border-b-2 border-green-400 p-3 md:p-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          <h1 className="text-lg sm:text-xl md:text-2xl retro-glow typewriter cursor text-center sm:text-left">
            PORTFOLIO_GATEWAY.EXE
          </h1>
          
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="w-2 h-2 md:w-3 md:h-3 bg-green-400 retro-pulse"></div>
            <span className="text-xs md:text-sm">SYSTEM_ONLINE</span>
            
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <span className="text-xs">AUTH_CHECK...</span>
                <span className="inline-block w-2 h-2 bg-green-400 retro-pulse"></span>
              </div>
            ) : authUser ? (
              // 로그인된 상태
              <div className="flex items-center space-x-3 md:space-x-4">
                <span className="text-xs md:text-sm text-orange-400">
                  👤 {authUser.displayName}
                  {isAdmin(authUser) && <span className="text-red-400 ml-1">👑</span>}
                </span>
                
                {/* Admin Tools - admin 사용자에게만 표시 */}
                {isAdmin(authUser) && (
                  <Link href="/admin" className="retro-button text-xs py-1 px-3 border-red-400 text-red-400 hover:bg-red-400 hover:text-black">
                    🔑 ADMIN
                  </Link>
                )}
                
                <button 
                  onClick={handleLogout}
                  className="retro-button text-xs py-1 px-3 border-red-400 text-red-400 hover:bg-red-400 hover:text-black"
                >
                  LOGOUT
                </button>
              </div>
            ) : (
              // 비로그인 상태
              <Link href="/auth" className="retro-button text-xs py-1 px-3 ml-4">
                LOGIN
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Welcome Section */}
        <section className="text-center mb-8 md:mb-16 fade-in-up">
          <div className="mb-6 md:mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl mb-4 retro-glow leading-tight">
              &gt; WELCOME TO THE MATRIX_
            </h2>
            <p className="text-sm md:text-lg text-gray-400 mb-6 md:mb-8 px-4">
              {authUser 
                ? `인증된 사용자 ${authUser.displayName}님, 포트폴리오 게이트웨이에 오신 것을 환영합니다`
                : "로그인하여 모든 기능을 이용하세요"
              }
            </p>
          </div>

          {/* Status Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
            <div className="retro-border p-4 md:p-6 relative">
              <div className="scanline"></div>
              <h3 className="text-lg md:text-xl mb-2 text-green-400">SERVER_STATUS</h3>
              <div className="flex items-center justify-center">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-green-400 retro-pulse mr-2"></div>
                <span className="text-sm md:text-base">ONLINE</span>
              </div>
            </div>
            
            <div className="retro-border p-4 md:p-6 relative">
              <div className="scanline"></div>
              <h3 className="text-lg md:text-xl mb-2 text-blue-400">AUTH_SYSTEM</h3>
              <div className="flex items-center justify-center">
                <div className={`w-3 h-3 md:w-4 md:h-4 retro-pulse mr-2 ${
                  authUser ? 'bg-green-400' : 'bg-blue-400'
                }`}></div>
                <span className="text-sm md:text-base">
                  {authUser ? 'AUTHENTICATED' : 'SECURE'}
                </span>
              </div>
            </div>
            
            <div className="retro-border p-4 md:p-6 relative">
              <div className="scanline"></div>
              <h3 className="text-lg md:text-xl mb-2 text-green-400">CHAT_SYSTEM</h3>
              <div className="flex items-center justify-center">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-yellow-400 retro-pulse mr-2"></div>
                <span className="text-sm md:text-base">ACTIVE</span>
              </div>
            </div>
            
            <div className="retro-border p-4 md:p-6 relative">
              <div className="scanline"></div>
              <h3 className="text-lg md:text-xl mb-2 text-green-400">PATCH_SYSTEM</h3>
              <div className="flex items-center justify-center">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-purple-400 retro-pulse mr-2"></div>
                <span className="text-sm md:text-base">v1.5.0</span>
              </div>
            </div>
          </div>
        </section>

        {/* Navigation Cards */}
        <section className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8 mb-8 md:mb-16">
          
          {/* Authentication */}
          <div 
            onClick={() => authUser ? null : router.push('/auth')}
            className={`retro-border p-6 md:p-8 transition-all duration-300 group relative overflow-hidden min-h-[200px] flex flex-col justify-between ${
              authUser 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-blue-400 hover:bg-opacity-10 cursor-pointer'
            }`}
          >
            <div className="relative z-10">
              <h3 className={`text-xl md:text-2xl mb-4 transition-colors ${
                authUser 
                  ? 'text-gray-500' 
                  : 'text-blue-400 group-hover:text-black'
              }`}>
                [AUTH_LOGIN.EXE]
              </h3>
              <p className={`transition-colors mb-6 text-sm md:text-base ${
                authUser 
                  ? 'text-gray-600' 
                  : 'text-gray-400 group-hover:text-gray-800'
              }`}>
                {authUser 
                  ? '> 이미 로그인된 상태입니다' 
                  : '> Secure user authentication system'
                }
              </p>
              <div className="flex items-center justify-between">
                <span className={`retro-button text-xs md:text-sm px-4 md:px-6 py-2 md:py-3 ${
                  authUser ? 'opacity-50' : ''
                }`}>
                  {authUser ? 'LOGGED_IN' : 'ACCESS'}
                </span>
                <span className={`transition-transform text-lg md:text-xl ${
                  authUser 
                    ? 'text-gray-500' 
                    : 'text-blue-400 group-hover:translate-x-2'
                }`}>
                  🔐
                </span>
              </div>
            </div>
            {!authUser && (
              <div className="absolute inset-0 bg-blue-400 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 opacity-20"></div>
            )}
          </div>

          {/* Chat Room */}
          <div 
            onClick={() => handleCardClick(true, '/chat')}
            className={`retro-border p-6 md:p-8 transition-all duration-300 group relative overflow-hidden min-h-[200px] flex flex-col justify-between ${
              !authUser 
                ? 'opacity-75 cursor-pointer hover:bg-yellow-400 hover:bg-opacity-10' 
                : 'cursor-pointer hover:bg-green-400 hover:bg-opacity-10'
            }`}
          >
            <div className="relative z-10">
              <h3 className={`text-xl md:text-2xl mb-4 transition-colors ${
                authUser 
                  ? 'text-green-400 group-hover:text-black' 
                  : 'text-yellow-400 group-hover:text-black'
              }`}>
                [SECURE_CHAT.EXE]
              </h3>
              <p className="text-gray-400 group-hover:text-gray-800 transition-colors mb-6 text-sm md:text-base">
                {authUser 
                  ? '> Authenticated real-time communication' 
                  : '> 로그인이 필요한 서비스입니다'
                }
              </p>
              <div className="flex items-center justify-between">
                <span className="retro-button text-xs md:text-sm px-4 md:px-6 py-2 md:py-3">
                  {authUser ? 'EXECUTE' : 'LOGIN_REQUIRED'}
                </span>
                <span className={`group-hover:translate-x-2 transition-transform text-lg md:text-xl ${
                  authUser ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  💬
                </span>
              </div>
            </div>
            <div className={`absolute inset-0 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 opacity-20 ${
              authUser ? 'bg-green-400' : 'bg-yellow-400'
            }`}></div>
          </div>

          {/* Patch Notes */}
          <div 
            onClick={() => router.push('/patch-notes')}
            className="retro-border p-6 md:p-8 hover:bg-purple-400 hover:bg-opacity-10 transition-all duration-300 group relative overflow-hidden cursor-pointer min-h-[200px] flex flex-col justify-between"
          >
            <div className="relative z-10">
              <h3 className="text-xl md:text-2xl mb-4 text-purple-400 group-hover:text-black transition-colors">
                [PATCH_NOTES.EXE]
              </h3>
              <p className="text-gray-400 group-hover:text-gray-800 transition-colors mb-6 text-sm md:text-base">
                &gt; View development update history
              </p>
              <div className="flex items-center justify-between">
                <span className="retro-button text-xs md:text-sm px-4 md:px-6 py-2 md:py-3">VIEW_LOG</span>
                <span className="text-purple-400 group-hover:translate-x-2 transition-transform text-lg md:text-xl">
                  📋
                </span>
              </div>
            </div>
            <div className="absolute inset-0 bg-purple-400 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 opacity-20"></div>
          </div>

          {/* Admin Tools - admin 사용자에게만 표시 */}
          {authUser && isAdmin(authUser) && (
            <div 
              onClick={() => router.push('/admin')}
              className="retro-border p-6 md:p-8 hover:bg-red-400 hover:bg-opacity-10 transition-all duration-300 group relative overflow-hidden cursor-pointer min-h-[200px] flex flex-col justify-between border-red-400"
            >
              <div className="relative z-10">
                <h3 className="text-xl md:text-2xl mb-4 text-red-400 group-hover:text-black transition-colors">
                  [ADMIN_TOOLS.EXE]
                </h3>
                <p className="text-gray-400 group-hover:text-gray-800 transition-colors mb-6 text-sm md:text-base">
                  &gt; System administration panel
                </p>
                <div className="flex items-center justify-between">
                  <span className="retro-button text-xs md:text-sm px-4 md:px-6 py-2 md:py-3 border-red-400 text-red-400">ADMIN_ACCESS</span>
                  <span className="text-red-400 group-hover:translate-x-2 transition-transform text-lg md:text-xl">
                    🔑
                  </span>
                </div>
              </div>
              <div className="absolute inset-0 bg-red-400 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 opacity-20"></div>
            </div>
          )}

          {/* Projects - 항상 표시 */}
          <div className="retro-border p-6 md:p-8 hover:bg-orange-400 hover:bg-opacity-10 transition-all duration-300 group relative overflow-hidden cursor-pointer min-h-[200px] flex flex-col justify-between">
            <div className="relative z-10">
              <h3 className="text-xl md:text-2xl mb-4 text-orange-400 group-hover:text-black transition-colors">
                [PROJECTS.DIR]
              </h3>
              <p className="text-gray-400 group-hover:text-gray-800 transition-colors mb-6 text-sm md:text-base">
                &gt; Access portfolio navigation system
              </p>
              <div className="flex items-center justify-between">
                <span className="retro-button text-xs md:text-sm px-4 md:px-6 py-2 md:py-3">BROWSE</span>
                <span className="text-orange-400 group-hover:translate-x-2 transition-transform text-lg md:text-xl">
                  📁
                </span>
              </div>
            </div>
            <div className="absolute inset-0 bg-orange-400 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 opacity-20"></div>
          </div>
        </section>

        {/* Recent Updates */}
        <section className="retro-border p-4 md:p-6 mb-8 border-purple-400 bg-purple-400 bg-opacity-5">
          <div className="text-center">
            <h3 className="text-lg md:text-xl mb-3 text-purple-400 retro-glow">
              🚀 LATEST UPDATE: v1.5.0
            </h3>
            <p className="text-sm md:text-base text-gray-400 mb-4">
              Admin 권한 시스템 및 관리자 도구 허브 완전 구현
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-500">
              <div>&gt; Admin Authority Control</div>
              <div>&gt; Management Tools Hub</div>
              <div>&gt; Real-time System Monitoring</div>
            </div>
          </div>
        </section>

        {/* Security Notice */}
        <section className="retro-border p-4 md:p-6 mb-8 border-blue-400 bg-blue-400 bg-opacity-5">
          <div className="text-center">
            <h3 className="text-lg md:text-xl mb-3 text-blue-400 retro-glow">
              🔐 SECURITY ENHANCED
            </h3>
            <p className="text-sm md:text-base text-gray-400 mb-4">
              {authUser 
                ? '인증된 사용자로 모든 보안 기능에 접근 가능합니다'
                : '로그인하여 보안이 강화된 기능들을 이용하세요'
              }
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-500">
              <div>&gt; SHA-256 Password Encryption</div>
              <div>&gt; Session-based Authentication</div>
              <div>&gt; Admin Authority Management</div>
            </div>
          </div>
        </section>

        {/* Terminal Footer */}
        <section className="retro-border p-4 md:p-6 retro-flicker">
          <div className="text-xs md:text-sm space-y-1 md:space-y-2 break-all">
            <p className="hidden sm:block">&gt; SYSTEM_INFO: Next.js 14.2.3 | Vercel Cloud Platform | Supabase Database</p>
            <p className="sm:hidden">&gt; SYSTEM: Next.js 14.2.3 + Auth + Admin</p>
            <p>&gt; BUILD_STATUS: Deployment successful ✓ | Version: v1.5.0</p>
            <p className="hidden md:block">&gt; USER_STATUS: {authUser ? `Authenticated as ${authUser.displayName}` : 'Guest User'}</p>
            <p className="md:hidden">&gt; USER: {authUser ? authUser.displayName : 'Guest'}</p>
            <p>&gt; FEATURES: Auth + Chat + Patch Notes + Admin | Security: Enhanced</p>
          </div>
        </section>
      </main>

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-px h-px bg-green-400 shadow-[0_0_20px_10px_rgba(0,255,65,0.3)] animate-pulse"></div>
        <div className="hidden md:block absolute top-3/4 right-1/3 w-px h-px bg-blue-400 shadow-[0_0_15px_8px_rgba(0,100,255,0.3)] animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 right-1/4 w-px h-px bg-orange-400 shadow-[0_0_25px_12px_rgba(255,165,0,0.3)] animate-pulse delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-px h-px bg-purple-400 shadow-[0_0_30px_15px_rgba(128,0,128,0.3)] animate-pulse delay-3000"></div>
      </div>
    </div>
  )
}
