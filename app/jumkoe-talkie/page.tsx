'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AuthUser {
  id: string
  username: string
  displayName: string
  loginTime: string
}

interface VoiceUser {
  id: string
  username: string
  displayName: string
  isConnected: boolean
  isSpeaking: boolean
  lastActivity: Date
}

export default function JumkoeTalkiePage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState<VoiceUser[]>([])
  const [isPTTActive, setIsPTTActive] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
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
      }
    }

    checkAuth()
  }, [router])

  // 마이크 권한 확인
  useEffect(() => {
    const checkMicPermission = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        setMicPermission(result.state as 'granted' | 'denied' | 'prompt')
        
        result.addEventListener('change', () => {
          setMicPermission(result.state as 'granted' | 'denied' | 'prompt')
        })
      } catch (error) {
        console.log('Permission API not supported')
      }
      setIsLoading(false)
    }

    if (authUser) {
      checkMicPermission()
    }
  }, [authUser])

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setMicPermission('granted')
      stream.getTracks().forEach(track => track.stop()) // 테스트 후 중지
    } catch (error) {
      console.error('Microphone permission denied:', error)
      setMicPermission('denied')
    }
  }

  const handlePTTStart = () => {
    if (micPermission !== 'granted') {
      requestMicPermission()
      return
    }
    setIsPTTActive(true)
    // TODO: WebRTC 음성 전송 시작
  }

  const handlePTTEnd = () => {
    setIsPTTActive(false)
    // TODO: WebRTC 음성 전송 중지
  }

  const handleLogout = () => {
    sessionStorage.removeItem('auth_user')
    router.push('/auth')
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
    <div className="h-screen bg-black text-green-400 flex flex-col crt-effect overflow-hidden">
      {/* Header */}
      <header className="border-b-2 border-green-400 p-3 md:p-4 retro-flicker flex-shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          <h1 className="text-lg sm:text-xl retro-glow">
            JUMKOE-TALKIE.EXE
          </h1>
          
          <div className="flex items-center space-x-2 md:space-x-4 flex-wrap">
            <div className="flex items-center space-x-2">
              <span className="text-xs md:text-sm">CONNECTED:</span>
              <span className="text-yellow-400">{connectedUsers.length}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 md:w-3 md:h-3 retro-pulse ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-xs md:text-sm">{isConnected ? 'VOICE_READY' : 'CONNECTING'}</span>
            </div>

            {/* Admin Tools - Only show to admin */}
            {isAdmin(authUser) && (
              <Link href="/admin" className="retro-button text-xs py-1 px-3 border-red-400 text-red-400 hover:bg-red-400 hover:text-black">
                🔑 ADMIN_TOOLS
              </Link>
            )}
            
            <Link href="/" className="retro-button text-xs py-1 px-3">
              HOME
            </Link>
            
            <button 
              onClick={handleLogout}
              className="retro-button text-xs py-1 px-3 border-red-400 text-red-400 hover:bg-red-400 hover:text-black"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      {/* User Info */}
      <div className="border-b border-gray-700 p-2 md:p-3 bg-gray-900 bg-opacity-50 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <span className="text-xs md:text-sm">
            &gt; Voice User: <span className="text-orange-400">{authUser.displayName}</span>
            <span className="text-gray-500 ml-2">(@{authUser.username})</span>
            {isAdmin(authUser) && <span className="text-red-400 ml-2">👑 ADMIN</span>}
          </span>
          <span className="text-xs text-gray-500">
            &gt; Mic: {micPermission === 'granted' ? '🎤 READY' : '🎤 NEEDS_PERMISSION'}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-6xl mx-auto w-full flex flex-col lg:flex-row min-h-0">
        
        {/* User List */}
        <div className="lg:w-1/3 retro-border border-r-0 lg:border-r-2 border-b-2 lg:border-b-0 border-green-400 p-4 bg-black bg-opacity-80">
          <h3 className="text-lg retro-glow mb-4">&gt; CONNECTED USERS</h3>
          
          {isLoading ? (
            <div className="text-center text-gray-500 mt-8">
              <p className="text-sm">&gt; Scanning voice channels...</p>
              <div className="mt-2">
                <span className="inline-block w-2 h-2 bg-green-400 retro-pulse mr-1"></span>
                <span className="inline-block w-2 h-2 bg-green-400 retro-pulse mr-1 delay-100"></span>
                <span className="inline-block w-2 h-2 bg-green-400 retro-pulse delay-200"></span>
              </div>
            </div>
          ) : connectedUsers.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <p className="text-sm">&gt; No users connected</p>
              <p className="text-xs mt-2 text-green-400">&gt; Be the first to join!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {connectedUsers.map((user) => (
                <div key={user.id} className="retro-border p-3 bg-gray-900 bg-opacity-50">
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 font-bold">{user.displayName}</span>
                    <div className="flex items-center space-x-2">
                      {user.isSpeaking && (
                        <span className="text-red-400 text-xs animate-pulse">🔴 SPEAKING</span>
                      )}
                      <div className={`w-2 h-2 retro-pulse ${user.isConnected ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">@{user.username}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PTT Control Area */}
        <div className="flex-1 flex flex-col justify-center items-center p-8 bg-black bg-opacity-80">
          
          {micPermission !== 'granted' && (
            <div className="retro-border p-6 mb-8 bg-red-900 bg-opacity-30 border-red-400">
              <h3 className="text-red-400 text-lg mb-4">&gt; MICROPHONE ACCESS REQUIRED</h3>
              <p className="text-sm text-gray-300 mb-4">
                Jumkoe-Talkie needs microphone access for voice communication.
              </p>
              <button 
                onClick={requestMicPermission}
                className="retro-button border-red-400 text-red-400 hover:bg-red-400 hover:text-black"
              >
                GRANT PERMISSION
              </button>
            </div>
          )}

          {/* PTT Button */}
          <div className="text-center">
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl retro-glow mb-2">
                PUSH TO TALK
              </h2>
              <p className="text-sm text-gray-400">
                Hold button or press SPACE to transmit
              </p>
            </div>

            <button
              onMouseDown={handlePTTStart}
              onMouseUp={handlePTTEnd}
              onTouchStart={handlePTTStart}
              onTouchEnd={handlePTTEnd}
              disabled={micPermission !== 'granted'}
              className={`
                w-32 h-32 md:w-40 md:h-40 rounded-full border-4 text-xl md:text-2xl font-bold
                transition-all duration-150 select-none
                ${isPTTActive 
                  ? 'bg-red-400 border-red-600 text-black shadow-[0_0_30px_15px_rgba(255,0,0,0.3)]' 
                  : micPermission === 'granted'
                    ? 'bg-gray-800 border-green-400 text-green-400 hover:bg-gray-700 shadow-[0_0_15px_8px_rgba(0,255,65,0.2)]'
                    : 'bg-gray-900 border-gray-600 text-gray-600 cursor-not-allowed'
                }
              `}
            >
              {isPTTActive ? '🔴 ON AIR' : '🎤 PTT'}
            </button>

            {isPTTActive && (
              <div className="mt-4 text-red-400 animate-pulse">
                <p className="text-lg font-bold">&gt; TRANSMITTING</p>
                <div className="flex justify-center space-x-1 mt-2">
                  <div className="w-2 h-4 bg-red-400 animate-pulse"></div>
                  <div className="w-2 h-6 bg-red-400 animate-pulse delay-100"></div>
                  <div className="w-2 h-8 bg-red-400 animate-pulse delay-200"></div>
                  <div className="w-2 h-6 bg-red-400 animate-pulse delay-300"></div>
                  <div className="w-2 h-4 bg-red-400 animate-pulse delay-400"></div>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-8 text-center max-w-md">
            <div className="retro-border p-4 bg-gray-900 bg-opacity-50">
              <h4 className="text-green-400 text-sm mb-2">&gt; INSTRUCTIONS</h4>
              <ul className="text-xs text-gray-400 space-y-1 text-left">
                <li>&gt; Hold PTT button to transmit</li>
                <li>&gt; Press SPACE key for quick PTT</li>
                <li>&gt; Maximum 8 users per channel</li>
                <li>&gt; Clear audio quality guaranteed</li>
                <li>&gt; P2P encryption enabled</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-px h-px bg-green-400 shadow-[0_0_20px_10px_rgba(0,255,65,0.2)] animate-pulse"></div>
        <div className="hidden md:block absolute bottom-1/3 left-1/4 w-px h-px bg-blue-400 shadow-[0_0_15px_8px_rgba(0,100,255,0.2)] animate-pulse delay-1000"></div>
        <div className="absolute top-1/4 left-1/3 w-px h-px bg-purple-400 shadow-[0_0_25px_12px_rgba(150,0,255,0.2)] animate-pulse delay-2000"></div>
      </div>
    </div>
  )
}