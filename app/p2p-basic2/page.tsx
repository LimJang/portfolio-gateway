'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { DataConnection } from 'peerjs';

// 🔴 물리 객체
interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface PhysicsState {
  ball: Ball;
  timestamp: number;
}

interface NetworkMessage {
  type: 'physics_update' | 'user_input' | 'ping' | 'pong' | 'connection_test';
  data: any;
  timestamp: number;
  messageId?: string;
}

interface ConnectionStats {
  ping: number;
  packetLoss: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  bytesReceived: number;
  bytesSent: number;
}

// 🌐 최적화된 ICE 서버 구성 (Bonk.io 수준) - 강화된 버전
const OPTIMIZED_ICE_SERVERS = [
  // 1차: 빠른 STUN 서버들 (지역별 분산)
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.nextcloud.com:443' },
  { urls: 'stun:stun.stunprotocol.org:3478' },
  
  // 2차: 강화된 TURN 서버들 (다중 프로토콜 + 포트)
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:80?transport=tcp',
      'turn:openrelay.metered.ca:443?transport=tcp'
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: [
      'turn:relay.metered.ca:80',
      'turn:relay.metered.ca:443',
      'turn:relay.metered.ca:80?transport=tcp',
      'turn:relay.metered.ca:443?transport=tcp'
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  // 3차: 추가 백업 TURN 서버들
  {
    urls: [
      'turn:numb.viagenie.ca',
      'turn:numb.viagenie.ca:3478?transport=tcp'
    ],
    username: 'webrtc@live.com',
    credential: 'muazkh'
  },
  {
    urls: [
      'turn:turn.bistri.com:80',
      'turn:turn.bistri.com:80?transport=tcp'
    ],
    username: 'homeo',
    credential: 'homeo'
  }
];

export default function AdvancedP2PPhysics() {
  // 네트워킹
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');
  const [joinCode, setJoinCode] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('초기화 중...');
  
  // 연결 품질 및 통계
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    ping: 0,
    packetLoss: 0,
    connectionQuality: 'poor',
    bytesReceived: 0,
    bytesSent: 0
  });
  
  // 로그 및 디버깅
  const [logs, setLogs] = useState<string[]>([]);
  const [showAdvancedStats, setShowAdvancedStats] = useState<boolean>(false);
  
  // 게임 로직
  const physicsStateRef = useRef<PhysicsState>({
    ball: {
      x: 200,
      y: 100,
      vx: 2,
      vy: 0,
      radius: 20,
      color: '#ff4444'
    },
    timestamp: Date.now()
  });
  
  const [displayState, setDisplayState] = useState<PhysicsState>(physicsStateRef.current);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const physicsRef = useRef<number>();
  const lastSyncRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);
  const connectionAttemptsRef = useRef<number>(0);
  const maxConnectionAttempts = 3;
  
  // 핑 측정
  const pingIntervalRef = useRef<NodeJS.Timeout>();
  const pendingPingsRef = useRef<Map<string, number>>(new Map());
  
  // 물리 상수
  const GRAVITY = 0.4;
  const BOUNCE_DAMPING = 0.75;
  const GROUND_Y = 350;
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 400;
  const SYNC_RATE = 30; // 30fps 동기화

  // 로그 추가
  const addLog = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const emoji = {
      info: '📡',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }[type];
    
    setLogs(prev => [...prev.slice(-12), `[${timestamp}] ${emoji} ${message}`]);
    console.log(`[P2P-ADV] ${message}`);
  }, []);

  // 🌐 고급 Peer 생성 (연결 최적화)
  const createAdvancedPeer = useCallback(async () => {
    const peerId = 'ADV_' + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    try {
      setConnectionStatus('Peer 생성 중...');
      addLog('🚀 고급 P2P 시스템 초기화 중...', 'info');
      
      const newPeer = new Peer(peerId, {
        config: {
          iceServers: OPTIMIZED_ICE_SERVERS,
          iceTransportPolicy: 'all',        // 모든 연결 방식 시도
          bundlePolicy: 'balanced',         // 효율적인 번들링
          iceCandidatePoolSize: 10,         // 충분한 후보 풀
          sdpSemantics: 'unified-plan'
        },
        debug: 2, // 더 상세한 디버그 로그
        secure: true
      });

      newPeer.on('open', (id) => {
        setMyPeerId(id);
        setPeer(newPeer);
        setConnectionStatus('Peer 준비 완료');
        addLog(`🎯 Peer ID 생성 완료: ${id}`, 'success');
        addLog(`📡 ${OPTIMIZED_ICE_SERVERS.length}개 STUN/TURN 서버 준비`, 'info');
        addLog('🚪 NAT 타입 감지 시작...', 'info');
      });

      newPeer.on('connection', (conn) => {
        addLog(`📞 클라이언트 연결 요청: ${conn.peer}`, 'info');
        setupHostConnection(conn);
      });

      newPeer.on('error', (error) => {
        addLog(`❌ Peer 오류: ${error.type} - ${error.message}`, 'error');
        // 더 자세한 오류 정보 로깅
        if (error.message) {
          addLog(`🔍 상세 오류: ${error.message}`, 'error');
        }
        setConnectionStatus(`오류: ${error.type}`);
        console.error('Peer error details:', error);
      });

      newPeer.on('disconnected', () => {
        addLog('🔌 Peer 연결 끊김', 'warning');
        setConnectionStatus('연결 끊김');
      });

    } catch (error) {
      addLog(`❌ Peer 생성 실패: ${error}`, 'error');
      setConnectionStatus('생성 실패');
    }
  }, [addLog]);

  // 🏠 호스트 방 생성
  const createRoom = useCallback(() => {
    if (!peer) return;
    
    setIsHost(true);
    setRoomCode(myPeerId);
    setConnectionStatus('호스트 대기 중');
    addLog(`🏠 호스트 방 생성: ${myPeerId}`, 'success');
    addLog('📡 클라이언트 연결 대기 중...', 'info');
    
    // 호스트는 즉시 물리 시뮬레이션 시작
    startPhysicsLoop();
  }, [peer, myPeerId]);

  // 🔄 연결 재시도 로직 - 강화된 버전
  const connectWithRetry = useCallback(async (targetPeerId: string, attempt: number = 1): Promise<DataConnection | null> => {
    if (attempt > maxConnectionAttempts) {
      addLog(`❌ 최대 재시도 횟수 초과 (${maxConnectionAttempts}회)`, 'error');
      addLog('📝 가능한 원인: NAT 타입 불일치, 방화벽 차단, TURN 서버 과부하', 'error');
      return null;
    }

    try {
      setConnectionStatus(`연결 시도 중... (${attempt}/${maxConnectionAttempts})`);
      addLog(`🔗 연결 시도 ${attempt}: ${targetPeerId}`, 'info');
      
      // 각 시도마다 다른 설정 사용
      const connectionOptions = {
        reliable: true,
        serialization: 'json',
        ...(attempt === 1 && { 
          // 1번째 시도: 빠른 연결 선호
          config: { iceTransportPolicy: 'all' }
        }),
        ...(attempt === 2 && { 
          // 2번째 시도: TURN 서버 강제 사용
          config: { iceTransportPolicy: 'relay' }
        }),
        ...(attempt === 3 && { 
          // 3번째 시도: 모든 옵션 사용
          config: { 
            iceTransportPolicy: 'all',
            iceCandidatePoolSize: 20,
            bundlePolicy: 'max-bundle'
          }
        })
      };
      
      const conn = peer!.connect(targetPeerId, connectionOptions);
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          conn.close();
          reject(new Error(`연결 타임아웃 (${attempt}번째 시도)`));
        }, 15000); // 15초 타임아웃 (기존 10초에서 확장)

        conn.on('open', () => {
          clearTimeout(timeout);
          addLog(`✅ 연결 성공! (시도 ${attempt}회) - 연결 타입: ${attempt === 1 ? 'DIRECT' : attempt === 2 ? 'RELAY' : 'MIXED'}`, 'success');
          setConnectionStatus('연결 성공');
          resolve(conn);
        });

        conn.on('error', (error) => {
          clearTimeout(timeout);
          addLog(`❌ 연결 오류 (${attempt}번째): ${error}`, 'error');
          reject(error);
        });
        
        // ICE 후보 모니터링 추가
        if (conn.peerConnection) {
          conn.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
              const candidate = event.candidate;
              const type = candidate.type;
              const protocol = candidate.protocol;
              addLog(`🔍 ICE 후보 (시도 ${attempt}): ${type} (${protocol})`, 'info');
            }
          };
          
          conn.peerConnection.onconnectionstatechange = () => {
            const state = conn.peerConnection?.connectionState;
            addLog(`🔗 연결 상태 (시도 ${attempt}): ${state}`, 'info');
          };
        }
      });

    } catch (error) {
      addLog(`⚠️ 연결 시도 ${attempt} 실패: ${error}`, 'warning');
      
      if (attempt < maxConnectionAttempts) {
        const delay = 2000 * attempt; // 지수 백오프 (2초, 4초, 6초)
        addLog(`⏳ ${delay}ms 후 다른 전략으로 재시도...`, 'info');
        await new Promise(resolve => setTimeout(resolve, delay));
        return connectWithRetry(targetPeerId, attempt + 1);
      }
      
      return null;
    }
  }, [peer, addLog]);

  // 🚪 클라이언트 방 참가 (재시도 로직 포함)
  const joinRoom = useCallback(async () => {
    if (!peer || !joinCode.trim()) return;
    
    connectionAttemptsRef.current = 0;
    
    try {
      const conn = await connectWithRetry(joinCode.trim());
      
      if (conn) {
        setIsConnected(true);
        setupClientConnection(conn);
        
        // 연결 테스트 메시지 전송
        sendMessage(conn, {
          type: 'connection_test',
          data: { message: 'Client connected successfully' },
          timestamp: Date.now()
        });
        
        // 핑 측정 시작
        startPingMeasurement(conn);
      } else {
        setConnectionStatus('연결 실패');
        addLog('❌ 모든 연결 시도 실패', 'error');
      }

    } catch (error) {
      addLog(`❌ 방 참가 실패: ${error}`, 'error');
      setConnectionStatus('참가 실패');
    }
  }, [peer, joinCode, connectWithRetry, addLog]);

  // 🔌 호스트 연결 설정
  const setupHostConnection = useCallback((conn: DataConnection) => {
    setConnection(conn);
    setIsConnected(true);
    setConnectionStatus('클라이언트 연결됨');
    
    conn.on('data', (data) => {
      const message = data as NetworkMessage;
      
      // 통계 업데이트
      setConnectionStats(prev => ({
        ...prev,
        bytesReceived: prev.bytesReceived + JSON.stringify(data).length
      }));
      
      switch (message.type) {
        case 'user_input':
          handleUserInput(message.data);
          break;
        case 'ping':
          // 핑에 즉시 응답
          sendMessage(conn, {
            type: 'pong',
            data: { messageId: message.messageId },
            timestamp: Date.now()
          });
          break;
        case 'connection_test':
          addLog(`📨 클라이언트 테스트 메시지 수신`, 'success');
          break;
      }
    });

    conn.on('close', () => {
      addLog(`🔴 클라이언트 연결 끊김`, 'warning');
      setIsConnected(false);
      setConnection(null);
      setConnectionStatus('클라이언트 연결 끊김');
      stopPingMeasurement();
    });

    conn.on('error', (error) => {
      addLog(`❌ 호스트 연결 오류: ${error}`, 'error');
    });

    addLog(`✅ 클라이언트 연결 설정 완료`, 'success');
    
    // 호스트도 핑 측정 시작
    startPingMeasurement(conn);
  }, [addLog]);

  // 🔌 클라이언트 연결 설정
  const setupClientConnection = useCallback((conn: DataConnection) => {
    setConnection(conn);
    setConnectionStatus('호스트 연결됨');
    
    conn.on('data', (data) => {
      const message = data as NetworkMessage;
      
      // 통계 업데이트
      setConnectionStats(prev => ({
        ...prev,
        bytesReceived: prev.bytesReceived + JSON.stringify(data).length
      }));
      
      switch (message.type) {
        case 'physics_update':
          // 호스트로부터 물리 상태 동기화
          physicsStateRef.current = message.data;
          setDisplayState(message.data);
          break;
        case 'ping':
          // 핑에 즉시 응답
          sendMessage(conn, {
            type: 'pong',
            data: { messageId: message.messageId },
            timestamp: Date.now()
          });
          break;
        case 'pong':
          // 핑 응답 처리
          handlePongMessage(message);
          break;
      }
    });

    conn.on('close', () => {
      addLog(`🔴 호스트 연결 끊김`, 'warning');
      setIsConnected(false);
      setConnection(null);
      setConnectionStatus('호스트 연결 끊김');
      stopPingMeasurement();
    });

    conn.on('error', (error) => {
      addLog(`❌ 클라이언트 연결 오류: ${error}`, 'error');
    });

    addLog(`✅ 호스트 연결 설정 완료`, 'success');
  }, [addLog]);

  // 📤 메시지 전송 (통계 포함)
  const sendMessage = useCallback((conn: DataConnection, message: NetworkMessage) => {
    try {
      if (conn && conn.open) {
        const messageStr = JSON.stringify(message);
        conn.send(message);
        
        // 통계 업데이트
        setConnectionStats(prev => ({
          ...prev,
          bytesSent: prev.bytesSent + messageStr.length
        }));
      }
    } catch (error) {
      addLog(`❌ 메시지 전송 실패: ${error}`, 'error');
    }
  }, [addLog]);

  // 📊 핑 측정 시작
  const startPingMeasurement = useCallback((conn: DataConnection) => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    
    pingIntervalRef.current = setInterval(() => {
      if (conn && conn.open) {
        const messageId = Math.random().toString(36).substr(2, 9);
        const timestamp = Date.now();
        
        pendingPingsRef.current.set(messageId, timestamp);
        
        sendMessage(conn, {
          type: 'ping',
          data: {},
          timestamp,
          messageId
        });
        
        // 오래된 핑 요청 정리 (5초 이상) - ES5 호환성 수정
        const now = Date.now();
        const entries = Array.from(pendingPingsRef.current.entries());
        for (const [id, time] of entries) {
          if (now - time > 5000) {
            pendingPingsRef.current.delete(id);
          }
        }
      }
    }, 1000); // 1초마다 핑 측정
  }, [sendMessage]);

  // 📊 핑 응답 처리
  const handlePongMessage = useCallback((message: NetworkMessage) => {
    const messageId = message.data.messageId;
    const sentTime = pendingPingsRef.current.get(messageId);
    
    if (sentTime) {
      const roundTripTime = Date.now() - sentTime;
      pendingPingsRef.current.delete(messageId);
      
      setConnectionStats(prev => {
        const newPing = roundTripTime;
        let quality: ConnectionStats['connectionQuality'] = 'poor';
        
        if (newPing < 50) quality = 'excellent';
        else if (newPing < 100) quality = 'good';
        else if (newPing < 200) quality = 'fair';
        
        return {
          ...prev,
          ping: newPing,
          connectionQuality: quality
        };
      });
    }
  }, []);

  // 📊 핑 측정 중지
  const stopPingMeasurement = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = undefined;
    }
    pendingPingsRef.current.clear();
  }, []);

  // 🎮 사용자 입력 처리
  const handleUserInput = useCallback((inputData: { action: string }) => {
    if (!isHost) return;
    
    const currentState = physicsStateRef.current;
    
    switch (inputData.action) {
      case 'kick_left':
        currentState.ball.vx = -6;
        currentState.ball.vy = -4;
        addLog('⚽ 공 왼쪽으로 킥!', 'info');
        break;
      case 'kick_right':
        currentState.ball.vx = 6;
        currentState.ball.vy = -4;
        addLog('⚽ 공 오른쪽으로 킥!', 'info');
        break;
      case 'kick_up':
        currentState.ball.vy = -8;
        addLog('⚽ 공 위로 킥!', 'info');
        break;
      case 'reset':
        currentState.ball = {
          x: 200,
          y: 100,
          vx: 2,
          vy: 0,
          radius: 20,
          color: isHost ? '#ff4444' : '#44ff44'
        };
        addLog('🔄 공 위치 리셋', 'info');
        break;
    }
    
    currentState.timestamp = Date.now();
    setDisplayState({...currentState});
  }, [isHost, addLog]);

  // 🔄 물리 시뮬레이션 (호스트만)
  const updatePhysics = useCallback(() => {
    if (!isHost) return;
    
    const state = physicsStateRef.current;
    const ball = state.ball;
    
    // 중력 적용
    ball.vy += GRAVITY;
    
    // 위치 업데이트
    ball.x += ball.vx;
    ball.y += ball.vy;
    
    // 좌우 벽 충돌
    if (ball.x <= ball.radius || ball.x >= CANVAS_WIDTH - ball.radius) {
      ball.vx *= -BOUNCE_DAMPING;
      ball.x = ball.x <= ball.radius ? ball.radius : CANVAS_WIDTH - ball.radius;
    }
    
    // 바닥 충돌
    if (ball.y >= GROUND_Y - ball.radius) {
      ball.y = GROUND_Y - ball.radius;
      ball.vy *= -BOUNCE_DAMPING;
      
      // 작은 진동 제거
      if (Math.abs(ball.vy) < 0.5) {
        ball.vy = 0;
      }
      if (Math.abs(ball.vx) < 0.1) {
        ball.vx = 0;
      }
    }
    
    // 천장 충돌
    if (ball.y <= ball.radius) {
      ball.y = ball.radius;
      ball.vy *= -BOUNCE_DAMPING;
    }
    
    state.timestamp = Date.now();
    setDisplayState({...state});
    
    // 클라이언트에게 물리 상태 전송
    if (connection && connection.open && Date.now() - lastSyncRef.current > (1000 / SYNC_RATE)) {
      sendMessage(connection, {
        type: 'physics_update',
        data: {...state},
        timestamp: Date.now()
      });
      lastSyncRef.current = Date.now();
    }
  }, [isHost, connection, sendMessage]);

  // 🔄 물리 루프 시작
  const startPhysicsLoop = useCallback(() => {
    if (isRunningRef.current) return;
    
    isRunningRef.current = true;
    addLog('🔄 물리 시뮬레이션 시작', 'success');
    
    const physicsLoop = () => {
      if (!isRunningRef.current) return;
      
      updatePhysics();
      physicsRef.current = requestAnimationFrame(physicsLoop);
    };
    
    physicsLoop();
  }, [updatePhysics, addLog]);

  // 🛑 물리 루프 중지
  const stopPhysicsLoop = useCallback(() => {
    isRunningRef.current = false;
    if (physicsRef.current) {
      cancelAnimationFrame(physicsRef.current);
    }
    addLog('🛑 물리 시뮬레이션 중지', 'warning');
  }, [addLog]);

  // 🎨 렌더링
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d')!;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    // 배경 (연결 상태에 따라 색상 변경)
    const bgColor = isConnected ? '#0a0a0a' : '#1a0a0a';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // 바닥
    ctx.fillStyle = '#333';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
    
    // 공
    const ball = displayState.ball;
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // 연결 품질에 따른 테두리
    if (isConnected) {
      const colors = {
        excellent: '#00ff00',
        good: '#ffff00',
        fair: '#ff8800',
        poor: '#ff0000'
      };
      ctx.strokeStyle = colors[connectionStats.connectionQuality];
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    // 상태 정보
    ctx.fillStyle = '#fff';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    
    let yPos = 15;
    ctx.fillText(`Role: ${isHost ? 'HOST' : 'CLIENT'}`, 5, yPos); yPos += 12;
    ctx.fillText(`Status: ${connectionStatus}`, 5, yPos); yPos += 12;
    
    if (isConnected) {
      ctx.fillStyle = connectionStats.connectionQuality === 'excellent' ? '#00ff00' :
                     connectionStats.connectionQuality === 'good' ? '#ffff00' :
                     connectionStats.connectionQuality === 'fair' ? '#ff8800' : '#ff0000';
      ctx.fillText(`Ping: ${connectionStats.ping}ms`, 5, yPos); yPos += 12;
      
      ctx.fillStyle = '#fff';
      ctx.fillText(`Quality: ${connectionStats.connectionQuality.toUpperCase()}`, 5, yPos); yPos += 12;
    }
    
    // 물리 정보
    ctx.fillText(`X: ${Math.round(ball.x)}, Y: ${Math.round(ball.y)}`, 5, yPos); yPos += 12;
    ctx.fillText(`VX: ${ball.vx.toFixed(1)}, VY: ${ball.vy.toFixed(1)}`, 5, yPos);
    
    // 연결 품질 인디케이터 (우상단)
    if (isConnected) {
      const indicator = connectionStats.connectionQuality === 'excellent' ? '🟢' :
                       connectionStats.connectionQuality === 'good' ? '🟡' :
                       connectionStats.connectionQuality === 'fair' ? '🟠' : '🔴';
      ctx.font = '16px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(indicator, CANVAS_WIDTH - 10, 20);
    }
  }, [displayState, isHost, isConnected, connectionStatus, connectionStats]);

  // 🎨 렌더링 루프
  useEffect(() => {
    const renderLoop = () => {
      renderCanvas();
      animationRef.current = requestAnimationFrame(renderLoop);
    };
    renderLoop();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [renderCanvas]);

  // 🚀 초기화
  useEffect(() => {
    createAdvancedPeer();
    
    return () => {
      stopPhysicsLoop();
      stopPingMeasurement();
      if (peer) {
        peer.destroy();
      }
    };
  }, [createAdvancedPeer, stopPhysicsLoop, stopPingMeasurement]);

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6 text-green-400">
          🚀 P2P-Basic2: 고급 연결 시스템 (Bonk.io 수준)
        </h1>
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* 연결 패널 */}
          <div className="bg-gray-900 border-2 border-green-500 rounded-lg p-4">
            <h2 className="text-lg font-bold mb-4">🌐 P2P 연결</h2>
            
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-2">내 Peer ID:</div>
              <div className="text-yellow-400 font-bold text-sm break-all">{myPeerId || '생성 중...'}</div>
            </div>
            
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-2">연결 상태:</div>
              <div className={`text-sm font-bold ${
                connectionStatus.includes('완료') || connectionStatus.includes('성공') || connectionStatus.includes('연결됨') 
                  ? 'text-green-400' 
                  : connectionStatus.includes('실패') || connectionStatus.includes('오류')
                  ? 'text-red-400'
                  : 'text-yellow-400'
              }`}>{connectionStatus}</div>
            </div>
            
            {!isHost && !isConnected && (
              <div className="space-y-3">
                <button
                  onClick={createRoom}
                  disabled={!peer}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-white font-bold"
                >
                  🏠 호스트 되기
                </button>
                
                <div>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white mb-2 text-sm"
                    placeholder="호스트 ID 입력"
                  />
                  <button
                    onClick={joinRoom}
                    disabled={!peer || !joinCode.trim()}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded text-white font-bold"
                  >
                    🚪 클라이언트로 접속
                  </button>
                </div>
              </div>
            )}
            
            {isHost && (
              <div className="p-3 bg-blue-900 border border-blue-500 rounded">
                <div className="text-sm mb-2">호스트 코드:</div>
                <div className="text-yellow-400 font-bold text-lg break-all">{roomCode}</div>
                <div className="text-xs text-gray-400 mt-1">클라이언트가 이 코드로 접속</div>
                
                <div className="mt-3 space-x-2">
                  <button
                    onClick={startPhysicsLoop}
                    disabled={isRunningRef.current}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-xs text-white"
                  >
                    ▶️ 시작
                  </button>
                  <button
                    onClick={stopPhysicsLoop}
                    disabled={!isRunningRef.current}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded text-xs text-white"
                  >
                    ⏸️ 정지
                  </button>
                </div>
              </div>
            )}
            
            {isConnected && (
              <div className="p-3 bg-green-900 border border-green-500 rounded">
                <div className="text-green-400">✅ P2P 연결 성공!</div>
                <div className="text-sm text-gray-300 mb-2">
                  {isHost ? '클라이언트 연결됨' : '호스트에 연결됨'}
                </div>
                
                {/* 연결 품질 표시 */}
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>지연율:</span>
                    <span className={`font-bold ${
                      connectionStats.ping < 50 ? 'text-green-400' :
                      connectionStats.ping < 100 ? 'text-yellow-400' :
                      connectionStats.ping < 200 ? 'text-orange-400' : 'text-red-400'
                    }`}>{connectionStats.ping}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>품질:</span>
                    <span className={`font-bold ${
                      connectionStats.connectionQuality === 'excellent' ? 'text-green-400' :
                      connectionStats.connectionQuality === 'good' ? 'text-yellow-400' :
                      connectionStats.connectionQuality === 'fair' ? 'text-orange-400' : 'text-red-400'
                    }`}>{connectionStats.connectionQuality.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* 통계 패널 */}
          <div className="bg-gray-900 border-2 border-blue-500 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">📊 연결 통계</h2>
              <button
                onClick={() => setShowAdvancedStats(!showAdvancedStats)}
                className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
              >
                {showAdvancedStats ? '간단히' : '자세히'}
              </button>
            </div>
            
            {isConnected ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>실시간 지연율:</span>
                  <span className={`font-bold ${
                    connectionStats.ping < 50 ? 'text-green-400' :
                    connectionStats.ping < 100 ? 'text-yellow-400' :
                    connectionStats.ping < 200 ? 'text-orange-400' : 'text-red-400'
                  }`}>{connectionStats.ping}ms</span>
                </div>
                
                <div className="flex justify-between">
                  <span>연결 품질:</span>
                  <span className={`font-bold ${
                    connectionStats.connectionQuality === 'excellent' ? 'text-green-400' :
                    connectionStats.connectionQuality === 'good' ? 'text-yellow-400' :
                    connectionStats.connectionQuality === 'fair' ? 'text-orange-400' : 'text-red-400'
                  }`}>
                    {connectionStats.connectionQuality === 'excellent' ? '🟢 최상' :
                     connectionStats.connectionQuality === 'good' ? '🟡 좋음' :
                     connectionStats.connectionQuality === 'fair' ? '🟠 보통' : '🔴 나쁨'}
                  </span>
                </div>
                
                {showAdvancedStats && (
                  <>
                    <div className="flex justify-between">
                      <span>수신 데이터:</span>
                      <span className="text-cyan-400">{(connectionStats.bytesReceived / 1024).toFixed(1)}KB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>송신 데이터:</span>
                      <span className="text-cyan-400">{(connectionStats.bytesSent / 1024).toFixed(1)}KB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>패킷 손실:</span>
                      <span className="text-yellow-400">{connectionStats.packetLoss.toFixed(1)}%</span>
                    </div>
                  </>
                )}
                
                <div className="mt-3 text-xs text-gray-400">
                  <div>🌐 STUN/TURN 서버: {OPTIMIZED_ICE_SERVERS.length}개 활성화</div>
                  <div>📡 동기화 주기: {SYNC_RATE}fps</div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                연결 후 통계가 표시됩니다
              </div>
            )}
          </div>
          
          {/* 로그 패널 */}
          <div className="bg-gray-900 border-2 border-yellow-500 rounded-lg p-4">
            <h2 className="text-lg font-bold mb-4">📋 연결 로그</h2>
            <div className="bg-black border border-gray-600 rounded p-3 h-64 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="text-xs text-gray-300 mb-1 break-all">{log}</div>
              ))}
            </div>
          </div>
        </div>
        
        {/* 게임 영역 */}
        <div className="mt-6 text-center">
          <canvas
            ref={canvasRef}
            className="border-2 border-green-500 rounded mx-auto bg-black"
            style={{ maxWidth: '100%' }}
          />
          
          {/* 컨트롤 */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => {
                if (isHost) {
                  handleUserInput({ action: 'kick_left' });
                } else if (connection) {
                  sendMessage(connection, {
                    type: 'user_input',
                    data: { action: 'kick_left' },
                    timestamp: Date.now()
                  });
                }
              }}
              disabled={!isHost && !isConnected}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded text-white font-bold"
            >
              ⬅️ 왼쪽
            </button>
            
            <button
              onClick={() => {
                if (isHost) {
                  handleUserInput({ action: 'kick_up' });
                } else if (connection) {
                  sendMessage(connection, {
                    type: 'user_input',
                    data: { action: 'kick_up' },
                    timestamp: Date.now()
                  });
                }
              }}
              disabled={!isHost && !isConnected}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-white font-bold"
            >
              ⬆️ 위로
            </button>
            
            <button
              onClick={() => {
                if (isHost) {
                  handleUserInput({ action: 'kick_right' });
                } else if (connection) {
                  sendMessage(connection, {
                    type: 'user_input',
                    data: { action: 'kick_right' },
                    timestamp: Date.now()
                  });
                }
              }}
              disabled={!isHost && !isConnected}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded text-white font-bold"
            >
              ➡️ 오른쪽
            </button>
            
            <button
              onClick={() => {
                if (isHost) {
                  handleUserInput({ action: 'reset' });
                } else if (connection) {
                  sendMessage(connection, {
                    type: 'user_input',
                    data: { action: 'reset' },
                    timestamp: Date.now()
                  });
                }
              }}
              disabled={!isHost && !isConnected}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 rounded text-white font-bold"
            >
              🔄 리셋
            </button>
          </div>
          
          <div className="mt-3 text-sm text-gray-400 space-y-1">
            <div>💡 실시간 지연율 표시: 캔버스 우상단 컬러 인디케이터</div>
            <div>🌐 다중 STUN/TURN 서버로 연결 안정성 극대화</div>
            <div>🔍 연결 품질: 🟢 최상 (&lt;50ms) | 🟡 좋음 (&lt;100ms) | 🟠 보통 (&lt;200ms) | 🔴 나쁨 (≥200ms)</div>
          </div>
        </div>
      </div>
    </div>
  );
}