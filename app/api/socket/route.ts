import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    status: 'Socket.io server will be initialized on server startup',
    timestamp: new Date().toISOString()
  })
}

export async function POST() {
  return NextResponse.json({ 
    status: 'Socket.io server ready',
    timestamp: new Date().toISOString()
  })
}
