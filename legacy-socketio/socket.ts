import { Server as SocketIOServer } from 'socket.io'
import { Server as NetServer } from 'http'

interface Message {
  id: string
  user: string
  message: string
  timestamp: Date
}

const messages: Message[] = []
let userCount = 0

export function initializeSocket(httpServer: NetServer) {
  const io = new SocketIOServer(httpServer, {
    path: '/api/socket/io',
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  })

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id)
    userCount++
    
    // Send current user count to all clients
    io.emit('userCount', userCount)
    
    // Send recent messages to new user
    socket.emit('recentMessages', messages.slice(-20))

    socket.on('join', (username: string) => {
      socket.data.username = username
      console.log(`${username} joined the chat`)
      
      // Send welcome message
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        user: 'System',
        message: `${username} joined the chat`,
        timestamp: new Date()
      }
      
      messages.push(welcomeMessage)
      io.emit('message', welcomeMessage)
    })

    socket.on('message', (data: Message) => {
      console.log('Message received:', data)
      messages.push(data)
      
      // Keep only last 100 messages
      if (messages.length > 100) {
        messages.splice(0, messages.length - 100)
      }
      
      io.emit('message', data)
    })

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id)
      userCount = Math.max(0, userCount - 1)
      io.emit('userCount', userCount)
      
      if (socket.data.username) {
        const leaveMessage: Message = {
          id: Date.now().toString(),
          user: 'System',
          message: `${socket.data.username} left the chat`,
          timestamp: new Date()
        }
        
        messages.push(leaveMessage)
        io.emit('message', leaveMessage)
      }
    })
  })

  return io
}
