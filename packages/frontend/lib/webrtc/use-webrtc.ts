import { useState, useEffect, useRef, useCallback } from 'react'
import { WebRTCManager, PeerConnection } from './webrtc-manager'

interface UseWebRTCProps {
  supabase: any
  userId: string
  connectedUsers: any[]
}

export function useWebRTC({ supabase, userId, connectedUsers }: UseWebRTCProps) {
  const [connectedPeers, setConnectedPeers] = useState<PeerConnection[]>([])
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const webrtcManagerRef = useRef<WebRTCManager | null>(null)

  // WebRTC 매니저 초기화
  useEffect(() => {
    if (supabase && userId) {
      webrtcManagerRef.current = new WebRTCManager(supabase, userId)
      
      return () => {
        if (webrtcManagerRef.current) {
          webrtcManagerRef.current.disconnect()
        }
      }
    }
  }, [supabase, userId])

  // 연결된 사용자 변화 감지 및 P2P 연결 관리
  useEffect(() => {
    if (!webrtcManagerRef.current || !isVoiceEnabled) return

    const currentPeerIds = new Set(connectedPeers.map(peer => peer.id))
    const newUserIds = connectedUsers
      .filter(user => user.id !== userId && !currentPeerIds.has(user.id))
      .map(user => user.id)

    // 새 사용자들과 연결
    newUserIds.forEach(async (newUserId) => {
      const user = connectedUsers.find(u => u.id === newUserId)
      if (user && webrtcManagerRef.current) {
        await webrtcManagerRef.current.connectToPeer(
          user.id,
          user.username,
          user.displayName
        )
      }
    })

    // 연결된 피어 목록 업데이트
    const updateConnectedPeers = () => {
      if (webrtcManagerRef.current) {
        setConnectedPeers(webrtcManagerRef.current.getConnectedPeers())
      }
    }

    const interval = setInterval(updateConnectedPeers, 1000)
    return () => clearInterval(interval)
  }, [connectedUsers, userId, isVoiceEnabled, connectedPeers])

  // 음성 스트림 설정
  const setLocalAudioStream = useCallback(async (stream: MediaStream) => {
    if (webrtcManagerRef.current) {
      await webrtcManagerRef.current.setLocalStream(stream)
      setIsVoiceEnabled(true)
    }
  }, [])

  // 음성 통신 시작
  const startVoice = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      await setLocalAudioStream(stream)
      return stream
    } catch (error) {
      console.error('Failed to start voice:', error)
      throw error
    }
  }, [setLocalAudioStream])

  // 음성 통신 중지
  const stopVoice = useCallback(() => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.disconnect()
      setIsVoiceEnabled(false)
      setConnectedPeers([])
    }
  }, [])

  // 특정 피어와의 연결 상태 확인
  const isPeerConnected = useCallback((userId: string) => {
    return webrtcManagerRef.current ? 
      webrtcManagerRef.current.isPeerConnected(userId) : false
  }, [])

  return {
    connectedPeers,
    isVoiceEnabled,
    startVoice,
    stopVoice,
    setLocalAudioStream,
    isPeerConnected
  }
}