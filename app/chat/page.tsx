'use client'

import { useState, useEffect, useRef } from 'react'

// Supabase 관련 타입 정의
interface Message {
  id: string
  content: string
  username: string
  created_at: string
  user_id?: string
}

interface User {
  id: string
  username: string
  created_at: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [message, setMessage] = useState('')
  const [username, setUsername] = useState('')
  const [usernameInput, setUsernameInput] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [supabase, setSupabase] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<any>(null)

  // 자동 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Supabase 클라이언트 초기화 (클라이언트에서만)
  useEffect(() => {
    const initializeSupabase = async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        
        if (!supabaseUrl || !supabaseAnonKey) {
          console.error('Supabase credentials not found')
          return
        }

        const client = createClient(supabaseUrl, supabaseAnonKey, {
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
    if (username && supabase) {
      initializeChat()
    }

    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [username, supabase])

  const initializeChat = async () => {
    if (!supabase) return

    try {
      setIsLoading(true)
      setIsConnected(false)

      // 1. 사용자 등록 또는 가져오기
      const userId = await registerOrGetUser()
      setCurrentUserId(userId)

      // 2. 이전 메시지 로드
      await loadPreviousMessages()

      // 3. 실시간 구독 설정
      setupRealtimeSubscription()

      // 4. 온라인 사용자 추적
      await trackOnlineUser(userId)

      setIsConnected(true)
      setIsLoading(false)

    } catch (error) {
      console.error('Chat initialization error:', error)
      setIsLoading(false)
    }
  }

  const registerOrGetUser = async (): Promise<string> => {
    if (!supabase) throw new Error('Supabase not initialized')

    // 기존 사용자 확인
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (existingUser) {
      return existingUser.id
    }

    // 새 사용자 생성
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({ username })
      .select('id')
      .single()

    if (error) throw error
    return newUser.id
  }

  const loadPreviousMessages = async () => {
    if (!supabase) return

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      console.error('Error loading messages:', error)
      return
    }

    setMessages(data || [])
  }

  const setupRealtimeSubscription = () => {
    if (!supabase) return

    // 이전 채널 정리
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // 새 실시간 채널 생성
    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload: any) => {
          const newMessage = payload.new as Message
          setMessages(prev => [...prev, newMessage])
        }
      )
      .subscribe((status: string) => {
        console.log('Realtime subscription status:', status)
        setIsConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel
  }

  const trackOnlineUser = async (userId: string) => {
    if (!supabase) return

    // 간단한 온라인 사용자 추적
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    
    const { data } = await supabase
      .from('messages')
      .select('username')
      .gte('created_at', fiveMinutesAgo)

    if (data) {
      const uniqueUsers = new Set(data.map((msg: any) => msg.username))
      setOnlineUsers(uniqueUsers.size)
    }
  }

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (usernameInput.trim()) {
      setUsername(usernameInput.trim())
      setUsernameInput('')
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !currentUserId || !isConnected || !supabase) return

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          content: message.trim(),
          username: username,
          user_id: currentUserId
        })

      if (error) throw error

      setMessage('')
      
      // 온라인 사용자 수 업데이트
      await trackOnlineUser(currentUserId)
      
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Supabase 로딩 중
  if (!supabase) {
    return (
      <div className="min-h-screen bg-black text-green-400 flex items-center justify-center p-4 crt-effect">
        <div className="retro-border p-6 md:p-8 w-full max-w-sm md:max-w-md relative">
          <div className="scanline"></div>
          <h1 className="text-xl md:text-2xl mb-6 text-center retro-glow typewriter">
            INITIALIZING_SUPABASE...
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

  if (!username) {
    return (
      <div className="min-h-screen bg-black text-green-400 flex items-center justify-center p-4 crt-effect">
        <div className="retro-border p-6 md:p-8 w-full max-w-sm md:max-w-md relative">
          <div className="scanline"></div>
          <h1 className="text-xl md:text-2xl mb-6 text-center retro-glow typewriter">
            SUPABASE_TERMINAL
          </h1>
          
          <form onSubmit={handleUsernameSubmit} className="space-y-4 md:space-y-6">
            <div>
              <label className="block text-xs md:text-sm mb-2 text-green-400">
                &gt; ENTER_USERNAME:
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="retro-input w-full text-sm md:text-base"
                placeholder="username_"
                maxLength={20}
                required
                autoFocus
                disabled={isLoading}
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="retro-button w-full text-xs md:text-sm py-3 md:py-4"
            >
              {isLoading ? 'CONNECTING...' : 'CONNECT_TO_SUPABASE'}
            </button>
          </form>
          
          <div className="mt-4 md:mt-6 text-xs text-gray-500 space-y-1">
            <p>&gt; Connection: Supabase Realtime</p>
            <p>&gt; Protocol: WebSocket + PostgreSQL</p>
            <p>&gt; Database: Supabase Cloud</p>
            <p>&gt; Deployment: Vercel Compatible</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-black text-green-400 flex flex-col crt-effect overflow-hidden">
      {/* Header */}
      <header className="border-b-2 border-green-400 p-3 md:p-4 retro-flicker flex-shrink-0">
        <div className="max-w-6xl mx-auto">
          {/* Desktop Header */}
          <div className="hidden md:flex justify-between items-center">
            <h1 className="text-xl retro-glow">
              SUPABASE_CHAT.EXE
            </h1>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <span className="text-sm">ACTIVE_USERS:</span>
                <span className="text-yellow-400">{onlineUsers}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 retro-pulse ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-sm">{isConnected ? 'REALTIME' : 'CONNECTING'}</span>
              </div>
              
              <a href="/" className="retro-button text-xs py-1 px-3">
                EXIT
              </a>
            </div>
          </div>

          {/* Mobile Header */}
          <div className="md:hidden space-y-3">
            <div className="flex justify-between items-center">
              <h1 className="text-lg retro-glow">
                SUPABASE_CHAT
              </h1>
              <a href="/" className="retro-button text-xs py-1 px-3">
                EXIT
              </a>
            </div>
            
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center space-x-2">
                <span>USERS:</span>
                <span className="text-yellow-400">{onlineUsers}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 retro-pulse ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span>{isConnected ? 'REALTIME' : 'LOADING'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* User Info */}
      <div className="border-b border-gray-700 p-2 md:p-3 bg-gray-900 bg-opacity-50 flex-shrink-0">
        <div className="max-w-6xl mx-auto">
          <span className="text-xs md:text-sm">
            &gt; Logged in as: <span className="text-orange-400">{username}</span>
            {!isConnected && <span className="text-red-400 ml-2">(Connecting to Supabase...)</span>}
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
              <p className="text-sm md:text-base">&gt; Connecting to Supabase Realtime...</p>
              <div className="mt-2">
                <span className="inline-block w-2 h-2 bg-green-400 retro-pulse mr-1"></span>
                <span className="inline-block w-2 h-2 bg-green-400 retro-pulse mr-1 delay-100"></span>
                <span className="inline-block w-2 h-2 bg-green-400 retro-pulse delay-200"></span>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-4 md:mt-8 fade-in-up">
              <p className="text-sm md:text-base">&gt; Supabase Realtime ready...</p>
              <p className="text-xs mt-2">&gt; Type your message below to begin communication</p>
              <p className="text-xs mt-1 text-green-400">&gt; Messages are stored in PostgreSQL cloud database</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="fade-in-up">
                <div className={`retro-message ${msg.username === username ? 'user' : ''} text-sm md:text-base`}>
                  <div className="flex justify-between items-start mb-1 md:mb-2">
                    <span className="text-xs md:text-sm font-bold">
                      {msg.username === 'SYSTEM' ? (
                        <span className="text-yellow-400">[SYSTEM]</span>
                      ) : (
                        <span className={msg.username === username ? 'text-orange-400' : 'text-green-400'}>
                          {msg.username}
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
          <form onSubmit={sendMessage} className="space-y-2 md:space-y-3">
            {/* Desktop Input */}
            <div className="hidden md:flex space-x-3">
              <span className="text-green-400 text-sm self-center">&gt;</span>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="retro-input flex-1"
                placeholder="Enter your message..."
                maxLength={500}
                disabled={!isConnected}
                autoFocus
              />
              <button
                type="submit"
                disabled={!isConnected || !message.trim()}
                className="retro-button px-6"
              >
                SEND
              </button>
            </div>

            {/* Mobile Input */}
            <div className="md:hidden space-y-3">
              <div className="flex space-x-2">
                <span className="text-green-400 text-sm self-center">&gt;</span>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="retro-input flex-1 text-sm"
                  placeholder="Type message..."
                  maxLength={500}
                  disabled={!isConnected}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!isConnected || !message.trim()}
                className="retro-button w-full text-xs py-3"
              >
                SEND MESSAGE
              </button>
            </div>
            
            <div className="flex justify-between text-xs text-gray-500">
              <span className="hidden md:block">
                &gt; Status: {isConnected ? 'Supabase Realtime Connected' : 'Connecting to database...'}
              </span>
              <span className="md:hidden">
                &gt; {isConnected ? 'Connected' : 'Loading...'}
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
        <div className="hidden md:block absolute bottom-1/3 left-1/4 w-px h-px bg-orange-400 shadow-[0_0_15px_8px_rgba(255,107,53,0.2)] animate-pulse delay-1000"></div>
      </div>
    </div>
  )
}
