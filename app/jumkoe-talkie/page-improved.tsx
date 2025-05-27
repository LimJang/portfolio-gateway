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
  }, [micPermission, toggleMicrophone])

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
    <div className="h-screen bg-black text-green-400 flex flex-col crt-effect overflow-hidden font-mono">
      {/* Header */}
      <header className="border-b-2 border-green-400 p-3 md:p-4 retro-flicker flex-shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          <h1 className="text-lg sm:text-xl retro-glow font-bold">
            JUMKOE-TALKIE.EXE
          </h1>
          
          <div className="flex items-center space-x-2 md:space-x-4 flex-wrap">
            <div className="flex items-center space-x-2">
              <span className="text-xs md:text-sm">CONNECTED:</span>
              <span className="text-yellow-400 font-bold">{connectedUsers.length}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-xs md:text-sm">P2P:</span>
              <span className="text-blue-400 font