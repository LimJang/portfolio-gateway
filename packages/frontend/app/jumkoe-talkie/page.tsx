'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWebRTC } from '@/lib/webrtc/use-webrtc'

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
  const [isMicOn, setIsMicOn] = useState(false) // 홀드 대신 토글 방식
  const [isLoading, setIsLoading] = useState(true)
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const [audioLevel, setAudioLevel] = useState(0)
  const [supabase, setSupabase] = useState<any>(null)
  
  const router = useRouter()
  const audioStreamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const channelRef = useRef<any>(null)
  const animationFrameRef = useRef<number | null>(null)

  // WebRTC 훅 사용
  const {
    connectedPeers,
    isVoiceEnabled,
    startVoice,
    stopVoice,
    setLocalAudioStream,
    isPeerConnected
  } = useWebRTC({
    supabase,
    userId: authUser?.id || '',
    connectedUsers
  })

  // 관리자 체크
  const isAdmin = (user: AuthUser): boolean => {
    return user.username.toLowerCase() === 'admin'
  }

  // Supabase 초기화
  useEffect(() => {
    const initSupabase = async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const url = 'https://vdiqoxxaiiwgqvmtwxxy.supabase.co'
        const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkaXFveHhhaWl3Z3F2bXR3eHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzQ0ODAsImV4cCI6MjA2Mzc1MDQ4MH0.ZxwDHCADi5Q5jxJt6Isjik5j_AmalQE2wYH7SvPpHDA'
        
        const client = createClient(url, key, {
          realtime: {
            params: {
              eventsPerSecond: 10
            }
          }
        })

        setSupabase(client)
      } catch (error) {
        console.error('Failed to initialize Supabase:', error)
      }
    }

    initSupabase()
  }, [])

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

  // Supabase Realtime 사용자 상태 관리
  useEffect(() => {
    if (authUser && supabase) {
      setupVoiceChannel()
    }

    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [authUser, supabase])

  const setupVoiceChannel = () => {
    if (!supabase || !authUser) return

    try {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }

      const channel = supabase
        .channel('jumkoe-talkie-presence')
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState()
          const users: VoiceUser[] = []
          
          Object.keys(state).forEach(key => {
            const presences = state[key]
            presences.forEach((presence: any) => {
              users.push({
                id: presence.user_id,
                username: presence.username,
                displayName: presence.display_name,
                isConnected: true,
                isSpeaking: presence.is_speaking || false,
                lastActivity: new Date(presence.last_activity)
              })
            })
          })
          
          setConnectedUsers(users)
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }: { key: string, newPresences: any[] }) => {
          console.log('User joined:', key, newPresences)
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }: { key: string, leftPresences: any[] }) => {
          console.log('User left:', key, leftPresences)
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              user_id: authUser.id,
              username: authUser.username,
              display_name: authUser.displayName,
              is_speaking: false,
              last_activity: new Date().toISOString()
            })
            setIsConnected(true)
          }
        })

      channelRef.current = channel
    } catch (error) {
      console.error('Failed to setup voice channel:', error)
    }
  }

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      setMicPermission('granted')
      setupAudioAnalyzer(stream)
      
      // WebRTC에 오디오 스트림 설정
      if (isVoiceEnabled) {
        await setLocalAudioStream(stream)
      }
    } catch (error) {
      console.error('Microphone permission denied:', error)
      setMicPermission('denied')
    }
  }

  const setupAudioAnalyzer = (stream: MediaStream) => {
    try {
      audioStreamRef.current = stream
      audioContextRef.current = new AudioContext()
      const analyser = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)
      
      analyserRef.current = analyser
    } catch (error) {
      console.error('Failed to setup audio analyzer:', error)
    }
  }

  const getAudioLevel = useCallback(() => {
    if (!analyserRef.current) return 0

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length
    return Math.min(100, (average / 128) * 100)
  }, [])

  const updateAudioLevel = useCallback(() => {
    if (isMicOn && analyserRef.current) {
      const level = getAudioLevel()
      setAudioLevel(level)
      
      // Supabase presence 업데이트 (speaking 상태)
      if (channelRef.current && level > 20) { // 임계값 이상일 때만 speaking으로 표시
        channelRef.current.track({
          user_id: authUser?.id,
          username: authUser?.username,
          display_name: authUser?.displayName,
          is_speaking: true,
          last_activity: new Date().toISOString()
        })
      }
    } else {
      setAudioLevel(0)
    }

    if (isMicOn) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
    }
  }, [isMicOn, authUser, getAudioLevel])

  // 마이크 토글 함수 (디스코드 스타일)
  const toggleMicrophone = async () => {
    if (micPermission !== 'granted') {
      await requestMicPermission()
      return
    }

    // WebRTC 음성 통신 시작 (처음 켤 때)
    if (!isVoiceEnabled) {
      try {
        const stream = await startVoice()
        setupAudioAnalyzer(stream)
      } catch (error) {
        console.error('Failed to start voice communication:', error)
        return
      }
    }

    if (!audioStreamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        })
        setupAudioAnalyzer(stream)
        
        if (isVoiceEnabled) {
          await setLocalAudioStream(stream)
        }
      } catch (error) {
        console.error('Failed to get audio stream:', error)
        return
      }
    }

    const newMicState = !isMicOn
    setIsMicOn(newMicState)

    if (newMicState) {
      // 마이크 켜기
      updateAudioLevel()
    } else {
      // 마이크 끄기
      setAudioLevel(0)
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      // Supabase presence 업데이트 (speaking 중지)
      if (channelRef.current && authUser) {
        channelRef.current.track({
          user_id: authUser.id,
          username: authUser.username,
          display_name: authUser.displayName,
          is_speaking: false,
          last_activity: new Date().toISOString()
        })
      }
    }
  }

  // 스페이스바 단축키 (토글 방식)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && micPermission === 'granted') {
        e.preventDefault()
        toggleMicrophone()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [micPermission])

  const handleLogout = () => {
    // 오디오 스트림 정리
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop())
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
    if (channelRef.current && supabase) {
      supabase.removeChannel(channelRef.current)
    }
    
    sessionStorage.removeItem('auth_user')
    router.push('/auth')
  }

  // 인증 로딩 중
  if (!authUser) {
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

  return (
    <div className="h-screen bg-black text-green-400 flex flex-col crt-effect overflow-hidden font-mono">
      {/* Header */}
      <header className="border-b-2 border-green-400 p-3 md:p-4 retro-flicker flex-shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          <h1 className="text-lg sm:text-xl retro-glow font-bold">
            JUMKOE-TALKIE.EXE
          </h1>
          
          <div className="flex items-center space-x-2 md:space-x-4 flex-wrap">
            <div className="flex items-center space-x-2">
              <span className="text-xs md:text-sm font-bold">CONNECTED:</span>
              <span className="text-yellow-400 font-bold">{connectedUsers.length}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-xs md:text-sm font-bold">P2P:</span>
              <span className="text-blue-400 font-bold">{connectedPeers.length}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 md:w-3 md:h-3 retro-pulse ${
                isVoiceEnabled ? 'bg-blue-400' : 
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
              <span className="text-xs md:text-sm font-bold">{
                isVoiceEnabled ? 'VOICE_ACTIVE' : 
                isConnected ? 'VOICE_READY' : 'CONNECTING'
              }</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs md:text-sm font-bold">AUDIO:</span>
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i}
                    className={`w-1 h-3 ${
                      audioLevel > (i + 1) * 20 ? 'bg-green-400' : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>

            {isAdmin(authUser) && (
              <Link href="/admin" className="retro-button text-xs py-1 px-3 border-red-400 text-red-400 hover:bg-red-400 hover:text-black font-bold">
                🔑 ADMIN_TOOLS
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

      {/* User Info */}
      <div className="border-b border-gray-700 p-2 md:p-3 bg-gray-900 bg-opacity-50 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <span className="text-xs md:text-sm">
            &gt; Voice User: <span className="text-orange-400 font-bold">{authUser.displayName}</span>
            <span className="text-gray-500 ml-2">(@{authUser.username})</span>
            {isAdmin(authUser) && <span className="text-red-400 ml-2 font-bold">👑 ADMIN</span>}
          </span>
          <span className="text-xs text-gray-500">
            &gt; Mic: <span className="font-bold">{micPermission === 'granted' ? '🎤 READY' : '🎤 NEEDS_PERMISSION'}</span> | 
            Realtime: <span className="font-bold">{isConnected ? '📡 SYNC' : '📡 OFFLINE'}</span>
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-6xl mx-auto w-full flex flex-col lg:flex-row min-h-0">
        
        {/* User List */}
        <div className="lg:w-1/3 retro-border border-r-0 lg:border-r-2 border-b-2 lg:border-b-0 border-green-400 p-4 bg-black bg-opacity-80">
          <h3 className="text-lg retro-glow mb-4 font-bold">&gt; CONNECTED USERS</h3>
          
          {isLoading ? (
            <div className="text-center text-gray-500 mt-8">
              <p className="text-sm font-bold">&gt; Scanning voice channels...</p>
              <div className="mt-2">
                <span className="inline-block w-2 h-2 bg-green-400 retro-pulse mr-1"></span>
                <span className="inline-block w-2 h-2 bg-green-400 retro-pulse mr-1 delay-100"></span>
                <span className="inline-block w-2 h-2 bg-green-400 retro-pulse delay-200"></span>
              </div>
            </div>
          ) : connectedUsers.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <p className="text-sm font-bold">&gt; No users connected</p>
              <p className="text-xs mt-2 text-green-400 font-bold">&gt; Be the first to join!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {connectedUsers.map((user) => {
                const isP2PConnected = isPeerConnected(user.id)
                return (
                  <div key={user.id} className="retro-border p-3 bg-gray-900 bg-opacity-50">
                    <div className="flex items-center justify-between">
                      <span className="text-green-400 font-bold">{user.displayName}</span>
                      <div className="flex items-center space-x-2">
                        {user.isSpeaking && (
                          <span className="text-red-400 text-xs animate-pulse font-bold">🔴 SPEAKING</span>
                        )}
                        {isP2PConnected && (
                          <span className="text-blue-400 text-xs font-bold">📞 P2P</span>
                        )}
                        <div className={`w-2 h-2 retro-pulse ${
                          isP2PConnected ? 'bg-blue-400' : 
                          user.isConnected ? 'bg-green-400' : 'bg-gray-500'
                        }`}></div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">@{user.username}</span>
                    {isP2PConnected && (
                      <div className="text-xs text-blue-400 mt-1 font-bold">
                        &gt; Direct voice connection active
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Voice Control Area */}
        <div className="flex-1 flex flex-col justify-center items-center p-8 bg-black bg-opacity-80">
          
          {micPermission !== 'granted' && (
            <div className="retro-border p-6 mb-8 bg-red-900 bg-opacity-30 border-red-400">
              <h3 className="text-red-400 text-lg mb-4 font-bold">&gt; MICROPHONE ACCESS REQUIRED</h3>
              <p className="text-sm text-gray-300 mb-4">
                Jumkoe-Talkie needs microphone access for voice communication.
              </p>
              <button 
                onClick={requestMicPermission}
                className="retro-button border-red-400 text-red-400 hover:bg-red-400 hover:text-black font-bold"
              >
                GRANT PERMISSION
              </button>
            </div>
          )}

          {/* Discord-style Toggle Button */}
          <div className="text-center">
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl retro-glow mb-2 font-bold">
                VOICE CHAT
              </h2>
              <p className="text-sm text-gray-400 font-bold">
                Click to toggle microphone or press SPACE
              </p>
            </div>

            <button
              onClick={toggleMicrophone}
              disabled={micPermission !== 'granted'}
              className={`
                w-32 h-32 md:w-40 md:h-40 rounded-full border-4 text-lg md:text-xl font-bold
                transition-all duration-300 select-none font-mono
                ${isMicOn 
                  ? 'bg-green-500 border-green-400 text-black shadow-[0_0_30px_15px_rgba(0,255,65,0.4)] scale-105' 
                  : micPermission === 'granted'
                    ? 'bg-gray-800 border-gray-500 text-gray-400 hover:bg-gray-700 hover:border-gray-400 shadow-[0_0_15px_8px_rgba(128,128,128,0.2)]'
                    : 'bg-gray-900 border-gray-600 text-gray-600 cursor-not-allowed'
                }
              `}
            >
              <div className="flex flex-col items-center">
                <div className="text-2xl md:text-3xl mb-1">
                  {isMicOn ? '🎤' : '🔇'}
                </div>
                <div className="text-xs md:text-sm font-bold">
                  {isMicOn ? 'ON' : 'OFF'}
                </div>
              </div>
            </button>

            {isMicOn && (
              <div className="mt-4 text-green-400">
                <p className="text-lg font-bold">&gt; MICROPHONE ACTIVE</p>
                <div className="flex justify-center space-x-1 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i}
                      className={`w-2 transition-all duration-150 ${
                        audioLevel > (i + 1) * 20 
                          ? `h-${Math.min(8, Math.max(4, Math.floor(audioLevel / 20) + 2))} bg-green-400` 
                          : 'h-4 bg-green-900'
                      } animate-pulse`}
                      style={{ animationDelay: `${i * 100}ms` }}
                    />
                  ))}
                </div>
                <p className="text-xs mt-2 font-bold">Audio Level: {Math.round(audioLevel)}%</p>
              </div>
            )}

            {!isVoiceEnabled && micPermission === 'granted' && (
              <div className="mt-4 text-yellow-400">
                <p className="text-sm font-bold">&gt; Click to join voice channel</p>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-8 text-center max-w-md">
            <div className="retro-border p-4 bg-gray-900 bg-opacity-50">
              <h4 className="text-green-400 text-sm mb-2 font-bold">&gt; CONTROLS</h4>
              <ul className="text-xs text-gray-400 space-y-1 text-left">
                <li className="font-bold">&gt; Click button to toggle microphone</li>
                <li className="font-bold">&gt; Press SPACE for quick toggle</li>
                <li className="font-bold">&gt; Real-time P2P voice communication</li>
                <li className="font-bold">&gt; Echo cancellation enabled</li>
                <li className="font-bold">&gt; Auto noise suppression active</li>
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