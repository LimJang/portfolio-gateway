'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Supabase 관련 타입 정의
interface Message {
  id: string
  content: string
  username: string
  display_name: string
  created_at: string
  user_id?: string
}

interface AuthUser {
  id: string
  username: string
  displayName: string
  loginTime: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [message, setMessage] = useState('')
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [supabase, setSupabase] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<any>(null)
  const router = useRouter()

  // 관리자 체크
  const isAdmin = (user: AuthUser): boolean => {
    return user.username.toLowerCase() === 'admin'
  }

  // 자동 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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

  // Supabase 클라이언트 초기화
  useEffect(() => {
    const initializeSupabase = async () => {
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

    initializeSupabase()
  }, [])

  // 채팅 초기화
  useEffect(() => {
    if (authUser && supabase) {
      initializeChat()
    }
  }, [authUser, supabase])

  const initializeChat = async () => {
    if (!supabase || !authUser) return

    try {
      setIsLoading(true)
      setIsConnected(false)

      await loadPreviousMessages()
      setupRealtimeSubscription()
      await trackOnlineUser()

      setIsConnected(true)
      setIsLoading(false)

    } catch (error) {
      console.error('Chat initialization error:', error)
      setIsLoading(false)
    }
  }

  const loadPreviousMessages = async () => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          username,
          created_at,
          user_id,
          users!messages_user_id_fkey(display_name)
        `)
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) {
        console.error('Error loading messages:', error)
        return
      }

      // 메시지 데이터 변환
      const formattedMessages = data?.map((msg: any) => ({
        ...msg,
        display_name: msg.users?.display_name || msg.username
      })) || []

      setMessages(formattedMessages)
    } catch (error) {
      console.error('loadPreviousMessages error:', error)
    }
  }

  const setupRealtimeSubscription = () => {
    if (!supabase) return

    try {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }

      const channel = supabase
        .channel('auth-chat-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
          },
          async (payload: any) => {
            const newMessage = payload.new

            // 사용자 정보 가져오기
            const { data: userData } = await supabase
              .from('users')
              .select('display_name')
              .eq('id', newMessage.user_id)
              .single()

            const formattedMessage = {
              ...newMessage,
              display_name: userData?.display_name || newMessage.username
            }

            setMessages(prev => [...prev, formattedMessage])
          }
        )
        .subscribe((status: string) => {
          console.log('Realtime subscription status:', status)
          setIsConnected(status === 'SUBSCRIBED')
        })

      channelRef.current = channel
    } catch (error) {
      console.error('setupRealtimeSubscription error:', error)
    }
  }

  const trackOnlineUser = async () => {
    if (!supabase) return

    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      
      const { data } = await supabase
        .from('messages')
        .select('username')
        .gte('created_at', fiveMinutesAgo)

      if (data) {
        const uniqueUsers = new Set(data.map((msg: any) => msg.username))
        setOnlineUsers(uniqueUsers.size)
      }
    } catch (error) {
      console.error('trackOnlineUser error:', error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !authUser || !isConnected || !supabase) return

    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          content: message.trim(),
          username: authUser.username,
          user_id: authUser.id
        }])

      if (error) {
        console.error('Error sending message:', error)
        return
      }

      setMessage('')
      await trackOnlineUser()
      
    } catch (error) {
      console.error('sendMessage error:', error)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('auth_user')
    if (channelRef.current && supabase) {
      supabase.removeChannel(channelRef.current)
    }
    router.push('/auth')
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    })
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
            SECURE_CHAT.EXE
          </h1>
          
          <div className="flex items-center space-x-2 md:space-x-4 flex-wrap">
            <div className="flex items-center space-x-2">
              <span className="text-xs md:text-sm">USERS:</span>
              <span className="text-yellow-400">{onlineUsers}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 md:w-3 md:h-3 retro-pulse ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-xs md:text-sm">{isConnected ? 'SECURE' : 'CONNECTING'}</span>
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
            &gt; Authenticated as: <span className="text-orange-400">{authUser.displayName}</span>
            <span className="text-gray-500 ml-2">(@{authUser.username})</span>
            {isAdmin(authUser) && <span className="text-red-400 ml-2">👑 ADMIN</span>}
          </span>
          <span className="text-xs text-gray-500">
            &gt; Session: {new Date(authUser.loginTime).toLocaleTimeString('ko-KR')}
          </span>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 max-w-6xl mx-auto w-full flex flex-col min-h-0">
        
        {/* Messages Area */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3 bg-black bg-opacity-80 retro-border border-t-0 border-b-0"
        >
          {isLoading ? (
            <div className="text-center text-gray-500 mt-4 md:mt-8 fade-in-up">
              <p className="text-sm md:text-base">&gt; Establishing secure connection...</p>
              <div className="mt-2">
                <span className="inline-block w-2 h-2 bg-green-400 retro-pulse mr-1"></span>
                <span className="inline-block w-2 h-2 bg-green-400 retro-pulse mr-1 delay-100"></span>
                <span className="inline-block w-2 h-2 bg-green-400 retro-pulse delay-200"></span>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-4 md:mt-8 fade-in-up">
              <p className="text-sm md:text-base">&gt; Secure channel established...</p>
              <p className="text-xs mt-2">&gt; Authenticated users only</p>
              <p className="text-xs mt-1 text-green-400">&gt; All messages are encrypted and stored securely</p>
            </div>
          ) : (
            messages.map((msg: Message) => (
              <div key={msg.id} className="fade-in-up">
                <div className={`retro-message ${msg.username === authUser.username ? 'user' : ''} text-sm md:text-base`}>
                  <div className="flex justify-between items-start mb-1 md:mb-2">
                    <span className="text-xs md:text-sm font-bold">
                      {msg.username === 'SYSTEM' ? (
                        <span className="text-yellow-400">[SYSTEM]</span>
                      ) : (
                        <span className={msg.username === authUser.username ? 'text-orange-400' : 'text-green-400'}>
                          {msg.display_name}
                          <span className="text-gray-500 ml-1 text-xs">@{msg.username}</span>
                          {msg.username === 'admin' && <span className="text-red-400 ml-1 text-xs">👑</span>}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                  <p className="text-white break-words">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="retro-border border-t-2 border-green-400 p-3 md:p-4 bg-gray-900 bg-opacity-50 flex-shrink-0">
          <form onSubmit={sendMessage} className="space-y-3">
            <div className="flex space-x-3">
              <span className="text-green-400 text-sm self-center flex-shrink-0">&gt;</span>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="retro-input flex-1"
                placeholder="Enter secure message..."
                maxLength={500}
                disabled={!isConnected}
                autoFocus
              />
              <button
                type="submit"
                disabled={!isConnected || !message.trim()}
                className="retro-button px-4 md:px-6"
              >
                SEND
              </button>
            </div>
            
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                &gt; Status: {isConnected ? 'Secure Channel Active' : 'Establishing connection...'}
              </span>
              <span>
                &gt; {message.length}/500
              </span>
            </div>
          </form>
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
