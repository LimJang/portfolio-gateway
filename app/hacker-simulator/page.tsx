// Terminal Hacker Simulator - Main Game Page
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

export default function HackerSimulatorPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // 관리자 체크
  const isAdmin = (user: AuthUser): boolean => {
    return user.username.toLowerCase() === 'admin'
  }

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
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = () => {
    sessionStorage.removeItem('auth_user')
    router.push('/auth')
  }

  // 인증 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-green-400 flex items-center justify-center p-4 crt-effect font-mono">
        <div className="retro-border p-6 md:p-8 w-full max-w-sm md:max-w-md relative">
          <div className="scanline"></div>
          <h1 className="text-xl md:text-2xl mb-6 text-center retro-glow typewriter font-bold">
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

  if (!authUser) return null

  return (
    <div className="min-h-screen bg-black text-green-400 flex flex-col crt-effect font-mono">
      {/* Header */}
      <header className="border-b-2 border-green-400 p-3 md:p-4 retro-flicker">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          <h1 className="text-lg sm:text-xl retro-glow font-bold">
            TERMINAL HACKER SIMULATOR
          </h1>
          
          <div className="flex items-center space-x-2 md:space-x-4 flex-wrap">
            <div className="flex items-center space-x-2">
              <span className="text-xs md:text-sm font-bold">USER:</span>
              <span className="text-orange-400 font-bold">{authUser.displayName}</span>
            </div>

            {isAdmin(authUser) && (
              <Link href="/admin" className="retro-button text-xs py-1 px-3 border-red-400 text-red-400 hover:bg-red-400 hover:text-black font-bold">
                🔑 ADMIN
              </Link>
            )}
            
            <Link href="/" className="retro-button text-xs py-1 px-3 font-bold">
              HOME
            </Link>
            
            <button 
              onClick={handleLogout}
              className="retro-button text-xs py-1 px-3 border-red-400 text-red-400 hover:bg-red-400 hover:text-black font-bold"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-4xl w-full">
          <div className="retro-border p-8 bg-black bg-opacity-80">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl retro-glow font-bold mb-4">
                HACKER SIMULATOR
              </h2>
              <p className="text-lg text-gray-400 font-bold">
                Test your typing skills in this terminal hacking game
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Game Options */}
              <div className="space-y-4">
                <button className="w-full retro-button p-4 text-left border-green-400 text-green-400 hover:bg-green-400 hover:text-black font-bold">
                  <div className="text-lg mb-2">🎮 START NEW MISSION</div>
                  <div className="text-sm text-gray-400">Begin hacking simulation</div>
                </button>

                <button className="w-full retro-button p-4 text-left border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black font-bold">
                  <div className="text-lg mb-2">🏆 LEADERBOARD</div>
                  <div className="text-sm text-gray-400">View top hackers</div>
                </button>

                <button className="w-full retro-button p-4 text-left border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black font-bold">
                  <div className="text-lg mb-2">💪 TRAINING MODE</div>
                  <div className="text-sm text-gray-400">Practice your skills</div>
                </button>
              </div>

              {/* Stats Panel */}
              <div className="retro-border p-6 bg-gray-900 bg-opacity-50">
                <h3 className="text-xl font-bold mb-4 text-green-400">&gt; PLAYER STATS</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-bold">BEST SCORE:</span>
                    <span className="text-yellow-400 font-bold">-- PTS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">MAX WPM:</span>
                    <span className="text-blue-400 font-bold">-- WPM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">ACCURACY:</span>
                    <span className="text-green-400 font-bold">--%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">MISSIONS:</span>
                    <span className="text-red-400 font-bold">0/5</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-8 retro-border p-6 bg-gray-900 bg-opacity-30">
              <h4 className="text-green-400 text-lg mb-4 font-bold">&gt; GAME INSTRUCTIONS</h4>
              <ul className="text-sm text-gray-400 space-y-2">
                <li className="font-bold">&gt; Type commands exactly as shown</li>
                <li className="font-bold">&gt; Speed and accuracy determine your score</li>
                <li className="font-bold">&gt; Complete all 5 missions to become elite hacker</li>
                <li className="font-bold">&gt; Each mission has time limits and objectives</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/3 w-px h-px bg-green-400 shadow-[0_0_20px_10px_rgba(0,255,65,0.2)] animate-pulse"></div>
        <div className="hidden md:block absolute bottom-1/4 left-1/3 w-px h-px bg-red-400 shadow-[0_0_15px_8px_rgba(255,0,65,0.2)] animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 left-1/4 w-px h-px bg-blue-400 shadow-[0_0_25px_12px_rgba(0,100,255,0.2)] animate-pulse delay-2000"></div>
      </div>
    </div>
  )
}
