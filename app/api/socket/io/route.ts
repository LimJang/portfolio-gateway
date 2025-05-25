import { NextRequest, NextResponse } from 'next/server'
import { Server as NetServer } from 'http'
import { Server as ServerIO } from 'socket.io'
import { prisma } from '@/lib/prisma'

interface SocketServer extends NetServer {
  io?: ServerIO
}

interface ConnectedUser {
  userId: string
  username: string
  socketId: string
}

const connectedUsers = new Map<string, ConnectedUser>()

export async function GET(req: NextRequest) {
  const res = NextResponse.next()
  
  if (process.env.NODE_ENV === 'development') {
    // 개발 환경에서는 매번 새로운 서버 생성하지 않도록 체크
    if (!global.io) {
      console.log('Initializing Socket.IO server...')
      
      const httpServer: SocketServer = res as any
      const io = new ServerIO(httpServer, {
        path: '/api/socket/io',
        addTrailingSlash: false,
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        }
      })

      io.on('connection', (socket) => {
        console.log('User connected:', socket.id)

        // 사용자 연결
        socket.on('user_join', async ({ username }) => {
          try {
            let user = await prisma.user.upsert({
              where: { username },
              update: {},
              create: { username }
            })

            connectedUsers.set(socket.id, {
              userId: user.id,
              username: user.username,
              socketId: socket.id
            })

            // 이전 메시지들 가져오기
            const recentMessages = await prisma.message.findMany({
              orderBy: { timestamp: 'desc' },
              take: 50
            })

            const messages = recentMessages.reverse()
            socket.emit('previous_messages', messages)

            // 입장 메시지
            const joinMessage = {
              id: `system_${Date.now()}`,
              content: `${username} joined the chat`,
              username: 'SYSTEM',
              timestamp: new Date().toISOString(),
              userId: null
            }

            io.emit('new_message', joinMessage)
            io.emit('users_count', connectedUsers.size)

          } catch (error) {
            console.error('Error handling user join:', error)
          }
        })

        // 메시지 전송
        socket.on('send_message', async ({ content }) => {
          try {
            const user = connectedUsers.get(socket.id)
            if (!user) return

            const savedMessage = await prisma.message.create({
              data: {
                content,
                username: user.username,
                userId: user.userId
              }
            })

            io.emit('new_message', {
              id: savedMessage.id,
              content: savedMessage.content,
              username: savedMessage.username,
              timestamp: savedMessage.timestamp.toISOString(),
              userId: savedMessage.userId
            })

          } catch (error) {
            console.error('Error handling message:', error)
          }
        })

        // 연결 해제
        socket.on('disconnect', () => {
          const user = connectedUsers.get(socket.id)
          if (user) {
            connectedUsers.delete(socket.id)
            
            const leaveMessage = {
              id: `system_${Date.now()}`,
              content: `${user.username} left the chat`,
              username: 'SYSTEM',
              timestamp: new Date().toISOString(),
              userId: null
            }

            io.emit('new_message', leaveMessage)
            io.emit('users_count', connectedUsers.size)
          }
        })
      })

      global.io = io
    }
  }

  return new Response('Socket.IO server initialized', { status: 200 })
}

// Global 타입 확장
declare global {
  var io: ServerIO | undefined
}
