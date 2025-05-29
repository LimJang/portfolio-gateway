'use client';

import { useState, useEffect, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';

// 🎮 게임 타입 정의
interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isHost: boolean;
  alive: boolean;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GameState {
  players: Player[];
  platforms: Platform[];
  gameStarted: boolean;
  gameTime: number;
  winner: string | null;
}

interface NetworkMessage {
  type: 'game_state' | 'player_input' | 'player_join' | 'player_leave' | 'game_start';
  data: any;
  timestamp: number;
}

// 🎨 플레이어 색상
const PLAYER_COLORS = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'];

export default function BounceBattlePage() {
  // 네트워킹
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [roomCode, setRoomCode] = useState<string>('');
  const [joinCode, setJoinCode] = useState<string>('');
  
  // 게임 상태
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    platforms: [
      { x: 100, y: 500, width: 200, height: 20 },
      { x: 400, y: 450, width: 200, height: 20 },
      { x: 650, y: 400, width: 150, height: 20 },
      { x: 50, y: 350, width: 150, height: 20 },
      { x: 300, y: 300, width: 200, height: 20 },
      { x: 600, y: 250, width: 150, height: 20 },
      { x: 200, y: 150, width: 400, height: 20 },
    ],
    gameStarted: false,
    gameTime: 0,
    winner: null
  });
  
  const [gamePhase, setGamePhase] = useState<'menu' | 'lobby' | 'playing'>('menu');
  const [playerName, setPlayerName] = useState<string>('Player');
  const [logs, setLogs] = useState<string[]>([]);
  
  // 게임 로직
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const lastSyncRef = useRef<number>(0);

  // 로그 추가
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-10), `[${timestamp}] ${message}`]);
  };

  // 🌐 Peer 생성
  const createPeer = async () => {
    const peerId = 'BOUNCE_' + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    try {
      addLog('🌐 Peer 생성 중...');
      
      const newPeer = new Peer(peerId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            {
              urls: 'turn:openrelay.metered.ca:80',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            }
          ]
        }
      });

      newPeer.on('open', (id) => {
        setMyPeerId(id);
        setPeer(newPeer);
        addLog(`✅ Peer 생성 성공: ${id}`);
      });

      newPeer.on('connection', (conn) => {
        if (isHost) {
          addLog(`📞 새 플레이어 연결: ${conn.peer}`);
          setupConnection(conn);
        }
      });

      newPeer.on('error', (error) => {
        addLog(`❌ Peer 오류: ${error.message}`);
      });

    } catch (error) {
      addLog(`❌ Peer 생성 실패: ${error}`);
    }
  };

  // 🏠 방 생성 (Host)
  const createRoom = () => {
    if (!peer) return;
    
    setIsHost(true);
    setRoomCode(myPeerId);
    setGamePhase('lobby');
    
    // 호스트 플레이어 추가
    const hostPlayer: Player = {
      id: myPeerId,
      name: playerName,
      x: 400,
      y: 100,
      vx: 0,
      vy: 0,
      radius: 20,
      color: PLAYER_COLORS[0],
      isHost: true,
      alive: true
    };
    
    setGameState(prev => ({
      ...prev,
      players: [hostPlayer]
    }));
    
    addLog(`🏠 방 생성 완료: ${myPeerId}`);
  };

  // 🚪 방 참가 (Client)
  const joinRoom = async () => {
    if (!peer || !joinCode.trim()) return;
    
    try {
      addLog(`🔗 ${joinCode}에 연결 시도...`);
      
      const conn = peer.connect(joinCode.trim());
      
      conn.on('open', () => {
        addLog('✅ 방 연결 성공!');
        setGamePhase('lobby');
        setupConnection(conn);
        
        // 참가 메시지 전송
        sendMessage(conn, {
          type: 'player_join',
          data: {
            id: myPeerId,
            name: playerName
          },
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

  // 🔌 연결 설정
  const setupConnection = (conn: DataConnection) => {
    setConnections(prev => [...prev, conn]);
    
    conn.on('data', (data: NetworkMessage) => {
      handleNetworkMessage(data, conn);
    });

    conn.on('close', () => {
      setConnections(prev => prev.filter(c => c !== conn));
      addLog(`🔴 플레이어 연결 끊김: ${conn.peer}`);
    });
  };

  // 📨 네트워크 메시지 처리
  const handleNetworkMessage = (message: NetworkMessage, conn: DataConnection) => {
    switch (message.type) {
      case 'player_join':
        if (isHost) {
          handlePlayerJoin(message.data, conn);
        }
        break;
        
      case 'game_state':
        if (!isHost) {
          setGameState(message.data);
        }
        break;
        
      case 'player_input':
        if (isHost) {
          handlePlayerInput(message.data);
        }
        break;
        
      case 'game_start':
        setGameState(prev => ({ ...prev, gameStarted: true }));
        startGameLoop();
        break;
    }
  };

  // 👤 플레이어 참가 처리 (Host만)
  const handlePlayerJoin = (playerData: any, conn: DataConnection) => {
    const newPlayer: Player = {
      id: playerData.id,
      name: playerData.name,
      x: 100 + Math.random() * 600,
      y: 100,
      vx: 0,
      vy: 0,
      radius: 20,
      color: PLAYER_COLORS[gameState.players.length % PLAYER_COLORS.length],
      isHost: false,
      alive: true
    };
    
    setGameState(prev => ({
      ...prev,
      players: [...prev.players, newPlayer]
    }));
    
    addLog(`👤 플레이어 참가: ${playerData.name}`);
    
    // 현재 게임 상태를 새 플레이어에게 전송
    sendMessage(conn, {
      type: 'game_state',
      data: gameState,
      timestamp: Date.now()
    });
  };

  // 🎮 플레이어 입력 처리 (Host만)
  const handlePlayerInput = (inputData: any) => {
    setGameState(prev => {
      const newState = { ...prev };
      const player = newState.players.find(p => p.id === inputData.playerId);
      
      if (player) {
        // 입력에 따른 플레이어 움직임
        if (inputData.left) player.vx -= 0.5;
        if (inputData.right) player.vx += 0.5;
        if (inputData.up && Math.abs(player.vy) < 1) player.vy = -15;
      }
      
      return newState;
    });
  };

  // 📤 메시지 전송
  const sendMessage = (conn: DataConnection, message: NetworkMessage) => {
    try {
      conn.send(message);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
    }
  };

  // 📡 게임 상태 브로드캐스트 (Host만)
  const broadcastGameState = () => {
    if (!isHost) return;
    
    const message: NetworkMessage = {
      type: 'game_state',
      data: gameState,
      timestamp: Date.now()
    };
    
    connections.forEach(conn => {
      if (conn.open) {
        sendMessage(conn, message);
      }
    });
  };

  // 🎮 게임 시작
  const startGame = () => {
    if (!isHost) return;
    
    setGameState(prev => ({ ...prev, gameStarted: true }));
    
    // 게임 시작 메시지 브로드캐스트
    const message: NetworkMessage = {
      type: 'game_start',
      data: {},
      timestamp: Date.now()
    };
    
    connections.forEach(conn => {
      if (conn.open) {
        sendMessage(conn, message);
      }
    });
    
    startGameLoop();
    addLog('🎮 게임 시작!');
  };

  // 🔄 게임 루프
  const startGameLoop = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    const gameLoop = () => {
      updateGame();
      renderGame();
      
      // Host만 게임 상태 동기화 (10fps로 전송)
      if (isHost && Date.now() - lastSyncRef.current > 100) {
        broadcastGameState();
        lastSyncRef.current = Date.now();
      }
      
      animationRef.current = requestAnimationFrame(gameLoop);
    };
    
    gameLoop();
  };

  // 🔄 게임 업데이트 (Host만 실행)
  const updateGame = () => {
    if (!isHost || !gameState.gameStarted) return;
    
    setGameState(prev => {
      const newState = { ...prev };
      
      // 호스트 플레이어 입력 처리
      const hostPlayer = newState.players.find(p => p.isHost);
      if (hostPlayer) {
        if (keysRef.current['ArrowLeft'] || keysRef.current['KeyA']) hostPlayer.vx -= 0.5;
        if (keysRef.current['ArrowRight'] || keysRef.current['KeyD']) hostPlayer.vx += 0.5;
        if ((keysRef.current['ArrowUp'] || keysRef.current['KeyW']) && Math.abs(hostPlayer.vy) < 1) {
          hostPlayer.vy = -15;
        }
      }
      
      // 물리 시뮬레이션
      newState.players.forEach(player => {
        if (!player.alive) return;
        
        // 중력
        player.vy += 0.8;
        
        // 속도 제한
        player.vx = Math.max(-10, Math.min(10, player.vx));
        player.vy = Math.max(-25, Math.min(25, player.vy));
        
        // 위치 업데이트
        player.x += player.vx;
        player.y += player.vy;
        
        // 마찰
        player.vx *= 0.95;
        
        // 플랫폼 충돌
        newState.platforms.forEach(platform => {
          if (player.x + player.radius > platform.x && 
              player.x - player.radius < platform.x + platform.width &&
              player.y + player.radius > platform.y &&
              player.y - player.radius < platform.y + platform.height) {
            
            if (player.vy > 0 && player.y < platform.y + 10) {
              player.y = platform.y - player.radius;
              player.vy *= -0.3;
              if (Math.abs(player.vy) < 2) player.vy = 0;
            }
          }
        });
        
        // 경계 처리
        if (player.x < player.radius) {
          player.x = player.radius;
          player.vx *= -0.5;
        }
        if (player.x > 800 - player.radius) {
          player.x = 800 - player.radius;
          player.vx *= -0.5;
        }
        
        // 바닥 떨어지면 죽음
        if (player.y > 650) {
          player.alive = false;
          addLog(`💀 ${player.name} 탈락!`);
        }
      });
      
      // 승자 확인
      const alivePlayers = newState.players.filter(p => p.alive);
      if (alivePlayers.length === 1 && newState.players.length > 1) {
        newState.winner = alivePlayers[0].name;
        addLog(`🏆 ${alivePlayers[0].name} 승리!`);
      }
      
      return newState;
    });
  };

  // 🎨 게임 렌더링
  const renderGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d')!;
    canvas.width = 800;
    canvas.height = 600;
    
    // 배경
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 플랫폼
    ctx.fillStyle = '#666';
    gameState.platforms.forEach(platform => {
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.strokeStyle = '#888';
      ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    });
    
    // 플레이어
    gameState.players.forEach(player => {
      if (!player.alive) return;
      
      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // 호스트 표시
      if (player.isHost) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      
      // 이름 표시
      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(player.name, player.x, player.y - 30);
    });
    
    // UI
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Players: ${gameState.players.filter(p => p.alive).length}/${gameState.players.length}`, 10, 30);
    
    if (gameState.winner) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#fff';
      ctx.font = '48px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`🏆 ${gameState.winner} WINS!`, canvas.width / 2, canvas.height / 2);
    }
  };

  // ⌨️ 키보드 이벤트
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      
      // 클라이언트인 경우 입력을 호스트에게 전송
      if (!isHost && connections.length > 0) {
        const inputData = {
          playerId: myPeerId,
          left: keysRef.current['ArrowLeft'] || keysRef.current['KeyA'],
          right: keysRef.current['ArrowRight'] || keysRef.current['KeyD'],
          up: keysRef.current['ArrowUp'] || keysRef.current['KeyW']
        };
        
        connections.forEach(conn => {
          if (conn.open) {
            sendMessage(conn, {
              type: 'player_input',
              data: inputData,
              timestamp: Date.now()
            });
          }
        });
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isHost, connections, myPeerId]);

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
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-green-400">
          🏆 BOUNCE BATTLE - 실시간 P2P 배틀
        </h1>
        
        {gamePhase === 'menu' && (
          <div className="max-w-md mx-auto bg-gray-900 border-2 border-green-500 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-center">🎮 게임 메뉴</h2>
            
            <div className="mb-4">
              <label className="block text-sm mb-2">플레이어 이름:</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                placeholder="Your Name"
              />
            </div>
            
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-1">내 Peer ID: {myPeerId || '생성 중...'}</div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={createRoom}
                disabled={!peer}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-white font-bold"
              >
                🏠 방 만들기 (호스트)
              </button>
              
              <div>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white mb-2"
                  placeholder="방 코드 입력"
                />
                <button
                  onClick={joinRoom}
                  disabled={!peer || !joinCode.trim()}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded text-white font-bold"
                >
                  🚪 방 참가
                </button>
              </div>
            </div>
          </div>
        )}
        
        {gamePhase === 'lobby' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-900 border-2 border-blue-500 rounded-lg p-4">
              <h2 className="text-xl font-bold mb-4">🏠 게임 로비</h2>
              
              {isHost && (
                <div className="mb-4 p-2 bg-green-900 border border-green-500 rounded">
                  <div className="text-sm">방 코드: <span className="text-yellow-400 font-bold">{roomCode}</span></div>
                  <div className="text-xs text-gray-400">다른 플레이어들에게 이 코드를 알려주세요</div>
                </div>
              )}
              
              <div className="mb-4">
                <h3 className="font-bold mb-2">👥 플레이어 목록:</h3>
                {gameState.players.map(player => (
                  <div key={player.id} className="flex items-center gap-2 mb-1">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: player.color }}
                    ></div>
                    <span>{player.name}</span>
                    {player.isHost && <span className="text-yellow-400">👑</span>}
                  </div>
                ))}
              </div>
              
              {isHost && (
                <button
                  onClick={startGame}
                  disabled={gameState.players.length < 2}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded text-white font-bold"
                >
                  🚀 게임 시작 ({gameState.players.length}/4)
                </button>
              )}
              
              {!isHost && (
                <div className="text-center text-gray-400">
                  호스트가 게임을 시작하기를 기다리는 중...
                </div>
              )}
            </div>
            
            <div className="bg-gray-900 border-2 border-yellow-500 rounded-lg p-4">
              <h2 className="text-xl font-bold mb-4">📊 연결 로그</h2>
              <div className="bg-black border border-gray-600 rounded p-2 h-64 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i} className="text-xs text-gray-300 mb-1">{log}</div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {gamePhase === 'lobby' && gameState.gameStarted && (
          <div className="mt-6">
            <canvas
              ref={canvasRef}
              className="block border-2 border-green-500 rounded mx-auto"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
            
            <div className="mt-4 text-center text-gray-400 text-sm">
              🎮 조작: ←→ 이동, ↑ 점프 | 살아남기 게임!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}