const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const { PrismaClient } = require('@prisma/client')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

const prisma = new PrismaClient()

interface ConnectedUser {
  userId: string
  username: string
  socketId: string
}

const connectedUsers = new Map<string, ConnectedUser>()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  const io = new Server(httpServer, {
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

        console.log(`${username} joined the chat`)
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

        console.log(`Message from ${user.username}: ${content}`)
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

        console.log(`${user.username} disconnected`)
      }
    })
  })

  httpServer
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
    })
})
