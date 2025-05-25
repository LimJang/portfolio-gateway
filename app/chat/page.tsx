'use client'

import { useState, useEffect, useRef } from 'react'

interface Message {
  id: string
  user: string
  message: string
  timestamp: Date
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [message, setMessage] = useState('')
  const [username, setUsername] = useState('')
  const [usernameInput, setUsernameInput] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState(1)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Simulate connection
    setIsConnected(true)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (usernameInput.trim()) {
      setUsername(usernameInput.trim())
      const welcomeMessage = {
        id: Date.now().toString(),
        user: 'SYSTEM',
        message: `User "${usernameInput.trim()}" connected to terminal`,
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
      setUsernameInput('')
    }
  }

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && username.trim()) {
      const messageData = {
        id: Date.now().toString(),
        user: username.trim(),
        message: message.trim(),
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, messageData])
      setMessage('')
    }
  }

  if (!username) {
    return (
      <div className="min-h-screen bg-black text-green-400 flex items-center justify-center p-4 crt-effect">
        <div className="retro-border p-8 w-full max-w-md relative">
          <div className="scanline"></div>
          <h1 className="text-2xl mb-6 text-center retro-glow typewriter">
            TERMINAL_LOGIN
          </h1>
          
          <form onSubmit={handleUsernameSubmit} className="space-y-6">
            <div>
              <label className="block text-sm mb-2 text-green-400">
                &gt; ENTER_USERNAME:
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="retro-input w-full"
                placeholder="username_"
                maxLength={20}
                required
                autoFocus
              />
            </div>
            
            <button
              type="submit"
              className="retro-button w-full"
            >
              CONNECT_TO_SYSTEM
            </button>
          </form>
          
          <div className="mt-6 text-xs text-gray-500 space-y-1">
            <p>&gt; Connection secured via SSL</p>
            <p>&gt; Protocol: WebSocket 2.0</p>
            <p>&gt; Server status: ONLINE</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-green-400 flex flex-col crt-effect">
      {/* Header */}
      <header className="border-b-2 border-green-400 p-4 retro-flicker">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl retro-glow">
            CHAT_TERMINAL.EXE
          </h1>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <span className="text-sm">USERS_ONLINE:</span>
              <span className="text-yellow-400">{onlineUsers}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 retro-pulse ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm">{isConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
            </div>
            
            <a href="/" className="retro-button text-xs py-1 px-3">
              EXIT
            </a>
          </div>
        </div>
      </header>

      {/* User Info */}
      <div className="border-b border-gray-700 p-3 bg-gray-900 bg-opacity-50">
        <div className="max-w-6xl mx-auto">
          <span className="text-sm">
            &gt; Logged in as: <span className="text-orange-400">{username}</span>
          </span>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 max-w-6xl mx-auto w-full flex flex-col">
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black bg-opacity-80 retro-border border-t-0 border-b-0">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8 fade-in-up">
              <p>&gt; Terminal ready for input...</p>
              <p className="text-xs mt-2">&gt; Type your message below to begin communication</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="fade-in-up">
                <div className={`retro-message ${msg.user === username ? 'user' : ''}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-bold">
                      {msg.user === 'SYSTEM' ? (
                        <span className="text-yellow-400">[SYSTEM]</span>
                      ) : (
                        <span className={msg.user === username ? 'text-orange-400' : 'text-green-400'}>
                          {msg.user}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-white">{msg.message}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="retro-border border-t-2 border-green-400 p-4 bg-gray-900 bg-opacity-50">
          <form onSubmit={sendMessage} className="space-y-3">
            <div className="flex space-x-3">
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
            
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                &gt; Status: {isConnected ? 'Ready for input' : 'Connection lost'}
              </span>
              <span>
                &gt; Characters: {message.length}/500
              </span>
            </div>
          </form>
        </div>
      </div>

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-px h-px bg-green-400 shadow-[0_0_20px_10px_rgba(0,255,65,0.2)] animate-pulse"></div>
        <div className="absolute bottom-1/3 left-1/4 w-px h-px bg-orange-400 shadow-[0_0_15px_8px_rgba(255,107,53,0.2)] animate-pulse delay-1000"></div>
      </div>
    </div>
  )
}
