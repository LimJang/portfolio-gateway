'use client';

import { useState, useEffect, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';

// 🔴 기본 물리 객체
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
  type: 'physics_update' | 'user_input' | 'connection_test';
  data: any;
  timestamp: number;
}

export default function BasicP2PPhysics() {
  // 네트워킹
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');
  const [joinCode, setJoinCode] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  // 물리 상태
  const [physicsState, setPhysicsState] = useState<PhysicsState>({
    ball: {
      x: 200,
      y: 100,
      vx: 1,      // 초기 속도 설정
      vy: 0,
      radius: 20,
      color: '#ff4444'
    },
    timestamp: Date.now()
  });
  
  // 로그
  const [logs, setLogs] = useState<string[]>([]);
  
  // 게임 로직
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const lastSyncRef = useRef<number>(0);
  
  // 물리 상수
  const GRAVITY = 0.5;
  const BOUNCE_DAMPING = 0.8;
  const GROUND_Y = 350;
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 400;

  // 로그 추가
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-8), `[${timestamp}] ${message}`]);
    console.log(`[P2P PHYSICS] ${message}`);
  };

  // 🌐 Peer 생성 (모바일 핫스팟 최적화)
  const createPeer = async () => {
    const peerId = 'PHYS_' + Math.random().toString(36).substr(2, 4).toUpperCase();
    
    try {
      addLog('🌐 Peer 생성 중...');
      
      const newPeer = new Peer(peerId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            {
              urls: 'turn:openrelay.metered.ca:80',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            }
          ],
          sdpSemantics: 'unified-plan'
        },
        debug: 2
      });

      newPeer.on('open', (id) => {
        setMyPeerId(id);
        setPeer(newPeer);
        addLog(`✅ Peer ID: ${id}`);
      });

      newPeer.on('connection', (conn) => {
        addLog(`📞 클라이언트 연결: ${conn.peer}`);
        setupHostConnection(conn);
      });

      newPeer.on('error', (error) => {
        addLog(`❌ Peer 오류: ${error.type}`);
        console.error('Peer error:', error);
      });

    } catch (error) {
      addLog(`❌ Peer 생성 실패: ${error}`);
    }
  };

  // 🏠 호스트 방 생성
  const createRoom = () => {
    if (!peer) return;
    
    setIsHost(true);
    setRoomCode(myPeerId);
    addLog(`🏠 호스트 방 생성: ${myPeerId}`);
    
    // 호스트는 즉시 물리 시뮬레이션 시작
    startPhysicsLoop();
  };

  // 🚪 클라이언트 방 참가
  const joinRoom = async () => {
    if (!peer || !joinCode.trim()) return;
    
    try {
      addLog(`🔗 ${joinCode}에 연결 시도...`);
      
      const conn = peer.connect(joinCode.trim(), {
        reliable: true
      });
      
      conn.on('open', () => {
        addLog('✅ 호스트 연결 성공!');
        setIsConnected(true);
        setupClientConnection(conn);
        
        // 연결 테스트 메시지 전송
        sendMessage(conn, {
          type: 'connection_test',
          data: { message: 'Client connected' },
          timestamp: Date.now()
        });
      });

      conn.on('error', (error) => {
        addLog(`❌ 연결 실패: ${error}`);
      });

    } catch (error) {
      addLog(`❌ 방 참가 실패: ${error}`);
    }
  };

  // 🔌 호스트 연결 설정
  const setupHostConnection = (conn: DataConnection) => {
    setConnection(conn);
    setIsConnected(true);
    
    conn.on('data', (data) => {
      const message = data as NetworkMessage;
      addLog(`📨 호스트: ${message.type} 받음`);
      
      if (message.type === 'user_input') {
        handleUserInput(message.data);
      }
    });

    conn.on('close', () => {
      addLog(`🔴 클라이언트 연결 끊김`);
      setIsConnected(false);
      setConnection(null);
    });
  };

  // 🔌 클라이언트 연결 설정
  const setupClientConnection = (conn: DataConnection) => {
    setConnection(conn);
    
    conn.on('data', (data) => {
      const message = data as NetworkMessage;
      
      if (message.type === 'physics_update') {
        // 호스트로부터 물리 상태 받아서 동기화
        setPhysicsState(message.data);
        // 로그는 가끔만 표시 (매번 뜨면 너무 많음)
        if (Math.random() < 0.1) { // 10% 확률로만 로그 표시
          addLog(`📊 물리 동기화 X:${Math.round(message.data.ball.x)} Y:${Math.round(message.data.ball.y)}`);
        }
      }
    });

    conn.on('close', () => {
      addLog(`🔴 호스트 연결 끊김`);
      setIsConnected(false);
      setConnection(null);
    });
  };

  // 📤 메시지 전송
  const sendMessage = (conn: DataConnection, message: NetworkMessage) => {
    try {
      if (conn && conn.open) {
        conn.send(message);
      }
    } catch (error) {
      addLog(`❌ 메시지 전송 실패: ${error}`);
    }
  };

  // 🎮 사용자 입력 처리
  const handleUserInput = (inputData: { action: string }) => {
    if (!isHost) return;
    
    setPhysicsState(prev => {
      const newState = { ...prev };
      
      switch (inputData.action) {
        case 'kick_left':
          newState.ball.vx = -5;
          newState.ball.vy = -3;
          addLog('⚽ 공 왼쪽으로 킥!');
          break;
        case 'kick_right':
          newState.ball.vx = 5;
          newState.ball.vy = -3;
          addLog('⚽ 공 오른쪽으로 킥!');
          break;
        case 'reset':
          newState.ball = {
            x: 200,
            y: 100,
            vx: 1,      // 초기 속도 설정
            vy: 0,
            radius: 20,
            color: '#ff4444'
          };
          addLog('🔄 공 위치 리셋');
          break;
      }
      
      newState.timestamp = Date.now();
      return newState;
    });
  };

  // 🔄 물리 시뮬레이션 (호스트만)
  const updatePhysics = () => {
    if (!isHost) return;
    
    setPhysicsState(prev => {
      const newState = { ...prev };
      const ball = newState.ball;
      
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
        if (Math.abs(ball.vy) < 1) {
          ball.vy = 0;
        }
      }
      
      // 천장 충돌
      if (ball.y <= ball.radius) {
        ball.y = ball.radius;
        ball.vy *= -BOUNCE_DAMPING;
      }
      
      newState.timestamp = Date.now();
      return newState;
    });
  };

  // 🔄 물리 루프 시작 (호스트만)
  const startPhysicsLoop = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    addLog('🔄 물리 시뮬레이션 시작');
    
    const physicsLoop = () => {
      if (isHost) {
        updatePhysics();
        
        // 클라이언트에게 물리 상태 전송 (30fps)
        if (connection && connection.open && Date.now() - lastSyncRef.current > 33) {
          sendMessage(connection, {
            type: 'physics_update',
            data: physicsState,
            timestamp: Date.now()
          });
          lastSyncRef.current = Date.now();
        }
      }
      
      animationRef.current = requestAnimationFrame(physicsLoop);
    };
    
    physicsLoop();
  };

  // 🎨 렌더링
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d')!;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    // 배경
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // 바닥
    ctx.fillStyle = '#333';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
    
    // 공
    const ball = physicsState.ball;
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // 상태 정보
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Role: ${isHost ? 'HOST' : 'CLIENT'}`, 10, 20);
    ctx.fillText(`Connected: ${isConnected ? 'YES' : 'NO'}`, 10, 35);
    ctx.fillText(`X: ${Math.round(ball.x)}, Y: ${Math.round(ball.y)}`, 10, 50);
    ctx.fillText(`VX: ${ball.vx.toFixed(1)}, VY: ${ball.vy.toFixed(1)}`, 10, 65);
  };

  // 🎨 렌더링 루프
  useEffect(() => {
    const renderLoop = () => {
      renderCanvas();
      requestAnimationFrame(renderLoop);
    };
    renderLoop();
  }, [physicsState, isHost, isConnected]);

  // 🚀 초기화
  useEffect(() => {
    createPeer();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (peer) {
        peer.destroy();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6 text-green-400">
          🔴 P2P 기초 물리 시스템 - 공 튕기기 테스트
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 연결 패널 */}
          <div className="bg-gray-900 border-2 border-green-500 rounded-lg p-4">
            <h2 className="text-lg font-bold mb-4">🌐 P2P 연결</h2>
            
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-2">내 Peer ID:</div>
              <div className="text-yellow-400 font-bold">{myPeerId || '생성 중...'}</div>
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
                    className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white mb-2"
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
                <div className="text-sm">호스트 코드:</div>
                <div className="text-yellow-400 font-bold text-lg">{roomCode}</div>
                <div className="text-xs text-gray-400 mt-1">클라이언트가 이 코드로 접속</div>
              </div>
            )}
            
            {isConnected && (
              <div className="p-3 bg-green-900 border border-green-500 rounded">
                <div className="text-green-400">✅ P2P 연결 성공!</div>
                <div className="text-sm text-gray-300">
                  {isHost ? '클라이언트 연결됨' : '호스트에 연결됨'}
                </div>
              </div>
            )}
          </div>
          
          {/* 로그 패널 */}
          <div className="bg-gray-900 border-2 border-yellow-500 rounded-lg p-4">
            <h2 className="text-lg font-bold mb-4">📊 연결 로그</h2>
            <div className="bg-black border border-gray-600 rounded p-3 h-48 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="text-xs text-gray-300 mb-1">{log}</div>
              ))}
            </div>
          </div>
        </div>
        
        {/* 게임 영역 */}
        <div className="mt-6 text-center">
          <canvas
            ref={canvasRef}
            className="border-2 border-green-500 rounded mx-auto"
            style={{ maxWidth: '100%' }}
          />
          
          {/* 컨트롤 */}
          <div className="mt-4 space-x-2">
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
              ⬅️ 왼쪽 킥
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
              ➡️ 오른쪽 킥
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
          
          <div className="mt-2 text-sm text-gray-400">
            💡 호스트: 물리 계산 담당 | 클라이언트: 결과 동기화 확인
          </div>
        </div>
      </div>
    </div>
  );
}