export interface PeerConnection {
  id: string
  username: string
  displayName: string
  connection: RTCPeerConnection
  dataChannel?: RTCDataChannel
  isConnected: boolean
  isOffering: boolean
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'user-left'
  fromUserId: string
  toUserId: string
  data: any
  timestamp: string
}

export class WebRTCManager {
  private localStream: MediaStream | null = null
  private peers: Map<string, PeerConnection> = new Map()
  private supabase: any = null
  private currentUserId: string = ''
  private signalChannel: any = null
  
  // ICE 서버 설정 (STUN 서버)
  private iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]

  constructor(supabase: any, userId: string) {
    this.supabase = supabase
    this.currentUserId = userId
    this.setupSignaling()
  }

  // 시그널링 채널 설정 (Supabase Realtime)
  private setupSignaling() {
    if (!this.supabase) return

    this.signalChannel = this.supabase
      .channel('jumkoe-talkie-signaling')
      .on('broadcast', { event: 'signaling' }, ({ payload }: { payload: SignalingMessage }) => {
        if (payload.toUserId === this.currentUserId) {
          this.handleSignalingMessage(payload)
        }
      })
      .subscribe()
  }

  // 로컬 오디오 스트림 설정
  async setLocalStream(stream: MediaStream) {
    this.localStream = stream
    
    // 기존 연결된 피어들에 스트림 추가
    this.peers.forEach(peer => {
      if (peer.connection.connectionState === 'connected') {
        stream.getTracks().forEach(track => {
          peer.connection.addTrack(track, stream)
        })
      }
    })
  }

  // 새 사용자와 연결 시작
  async connectToPeer(userId: string, username: string, displayName: string) {
    if (this.peers.has(userId)) return

    const peerConnection = new RTCPeerConnection({ iceServers: this.iceServers })
    
    const peer: PeerConnection = {
      id: userId,
      username,
      displayName,
      connection: peerConnection,
      isConnected: false,
      isOffering: true
    }

    this.setupPeerConnection(peer)
    this.peers.set(userId, peer)

    // 로컬 스트림이 있으면 추가
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!)
      })
    }

    // Offer 생성 및 전송
    try {
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      })
      
      await peerConnection.setLocalDescription(offer)
      
      this.sendSignalingMessage({
        type: 'offer',
        fromUserId: this.currentUserId,
        toUserId: userId,
        data: offer,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to create offer:', error)
      this.peers.delete(userId)
    }
  }

  // 피어 연결 설정
  private setupPeerConnection(peer: PeerConnection) {
    const { connection } = peer

    // ICE candidate 이벤트
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          fromUserId: this.currentUserId,
          toUserId: peer.id,
          data: event.candidate,
          timestamp: new Date().toISOString()
        })
      }
    }

    // 연결 상태 변경
    connection.onconnectionstatechange = () => {
      peer.isConnected = connection.connectionState === 'connected'
      console.log(`Peer ${peer.username} connection state:`, connection.connectionState)
      
      if (connection.connectionState === 'failed' || connection.connectionState === 'disconnected') {
        this.removePeer(peer.id)
      }
    }

    // 원격 스트림 수신
    connection.ontrack = (event) => {
      console.log('Received remote stream from:', peer.username)
      this.playRemoteAudio(event.streams[0], peer.id)
    }
  }

  // 원격 오디오 재생
  private playRemoteAudio(stream: MediaStream, peerId: string) {
    const audio = new Audio()
    audio.srcObject = stream
    audio.autoplay = true
    audio.volume = 1.0
    
    // 오디오 엘리먼트를 DOM에 추가하여 자동 재생 허용
    audio.style.display = 'none'
    document.body.appendChild(audio)
    
    audio.play().catch(error => {
      console.error('Failed to play remote audio:', error)
    })

    // 피어가 제거될 때 오디오도 제거
    const peer = this.peers.get(peerId)
    if (peer) {
      peer.connection.addEventListener('connectionstatechange', () => {
        if (peer.connection.connectionState === 'closed') {
          audio.remove()
        }
      })
    }
  }

  // 시그널링 메시지 처리
  private async handleSignalingMessage(message: SignalingMessage) {
    const { type, fromUserId, data } = message

    try {
      switch (type) {
        case 'offer':
          await this.handleOffer(fromUserId, data)
          break
        case 'answer':
          await this.handleAnswer(fromUserId, data)
          break
        case 'ice-candidate':
          await this.handleIceCandidate(fromUserId, data)
          break
        case 'user-left':
          this.removePeer(fromUserId)
          break
      }
    } catch (error) {
      console.error('Error handling signaling message:', error)
    }
  }

  // Offer 처리
  private async handleOffer(fromUserId: string, offer: RTCSessionDescriptionInit) {
    let peer = this.peers.get(fromUserId)
    
    if (!peer) {
      // 새 피어 생성
      const peerConnection = new RTCPeerConnection({ iceServers: this.iceServers })
      peer = {
        id: fromUserId,
        username: 'Unknown',
        displayName: 'Unknown',
        connection: peerConnection,
        isConnected: false,
        isOffering: false
      }
      
      this.setupPeerConnection(peer)
      this.peers.set(fromUserId, peer)
      
      // 로컬 스트림 추가
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, this.localStream!)
        })
      }
    }

    await peer.connection.setRemoteDescription(offer)
    
    const answer = await peer.connection.createAnswer()
    await peer.connection.setLocalDescription(answer)
    
    this.sendSignalingMessage({
      type: 'answer',
      fromUserId: this.currentUserId,
      toUserId: fromUserId,
      data: answer,
      timestamp: new Date().toISOString()
    })
  }

  // Answer 처리
  private async handleAnswer(fromUserId: string, answer: RTCSessionDescriptionInit) {
    const peer = this.peers.get(fromUserId)
    if (peer) {
      await peer.connection.setRemoteDescription(answer)
    }
  }

  // ICE Candidate 처리
  private async handleIceCandidate(fromUserId: string, candidate: RTCIceCandidateInit) {
    const peer = this.peers.get(fromUserId)
    if (peer) {
      await peer.connection.addIceCandidate(candidate)
    }
  }

  // 시그널링 메시지 전송
  private sendSignalingMessage(message: SignalingMessage) {
    if (this.signalChannel) {
      this.signalChannel.send({
        type: 'broadcast',
        event: 'signaling',
        payload: message
      })
    }
  }

  // 피어 제거
  removePeer(userId: string) {
    const peer = this.peers.get(userId)
    if (peer) {
      peer.connection.close()
      this.peers.delete(userId)
      console.log('Removed peer:', userId)
    }
  }

  // 모든 연결 해제
  disconnect() {
    this.peers.forEach(peer => {
      peer.connection.close()
    })
    this.peers.clear()
    
    if (this.signalChannel) {
      this.supabase.removeChannel(this.signalChannel)
    }
  }

  // 연결된 피어 목록 반환
  getConnectedPeers(): PeerConnection[] {
    return Array.from(this.peers.values()).filter(peer => peer.isConnected)
  }

  // 특정 사용자와의 연결 상태 확인
  isPeerConnected(userId: string): boolean {
    const peer = this.peers.get(userId)
    return peer ? peer.isConnected : false
  }
}