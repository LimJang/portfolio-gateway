'use client';

import { useEffect, useRef, useState } from 'react';

interface GameRoom {
  id: string;
  room_name: string;
  status: string;
}

interface GamePlayer {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  position_x: number;
  position_y: number;
  velocity_x: number;
  velocity_y: number;
  direction: number;
  is_alive: boolean;
  is_thrusting: boolean;
  color: string;
}

interface MultiplayerGameCanvasProps {
  room: GameRoom;
  players: GamePlayer[];
  currentPlayer: GamePlayer;
  onPlayerInput: (inputType: 'rotate_left' | 'rotate_right' | 'thrust', inputValue?: string) => void;
  onGameEnd: () => void;
}

export default function MultiplayerGameCanvas({
  room,
  players,
  currentPlayer,
  onPlayerInput,
  onGameEnd
}: MultiplayerGameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const [gameStats, setGameStats] = useState({
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    direction: 0,
    alive_players: 0
  });

  // 키보드 입력 처리
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      keysRef.current[key] = true;
      
      // 스페이스바 스크롤 방지
      if (event.key === ' ') {
        event.preventDefault();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      keysRef.current[key] = false;
      
      if (event.key === ' ') {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 입력 처리 및 서버 전송
  useEffect(() => {
    const inputInterval = setInterval(() => {
      if (!currentPlayer.is_alive) return;

      let inputSent = false;

      // A키: 좌회전
      if (keysRef.current['a']) {
        onPlayerInput('rotate_left');
        inputSent = true;
      }

      // D키: 우회전
      if (keysRef.current['d']) {
        onPlayerInput('rotate_right');
        inputSent = true;
      }

      // SPACE: 추진
      if (keysRef.current[' ']) {
        onPlayerInput('thrust');
        inputSent = true;
      }
    }, 50); // 20fps로 입력 전송

    return () => clearInterval(inputInterval);
  }, [currentPlayer.is_alive, onPlayerInput]);

  // 게임 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // 캔버스 클리어
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 800, 600);

      // 경계선 그리기
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, 800, 600);

      // 장애물 그리기 (간단한 사각형)
      ctx.fillStyle = '#888888';
      ctx.fillRect(350, 250, 100, 100); // 중앙 장애물

      // 플레이어들 그리기
      players.forEach(player => {
        if (!player.is_alive) return;

        ctx.save();
        
        // 플레이어 위치로 이동
        ctx.translate(player.position_x, player.position_y);
        ctx.rotate((player.direction * Math.PI) / 180);

        // 삼각형 우주선 그리기
        ctx.fillStyle = player.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(0, -15);  // 앞쪽 끝
        ctx.lineTo(-8, 10);  // 뒤쪽 왼쪽
        ctx.lineTo(8, 10);   // 뒤쪽 오른쪽
        ctx.closePath();
        
        // 추진 시 색상 변경
        if (player.is_thrusting) {
          ctx.fillStyle = '#ffff00';
        }
        
        ctx.fill();
        ctx.stroke();

        // 플레이어 이름 표시
        ctx.restore();
        ctx.fillStyle = player.color;
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          player.display_name, 
          player.position_x, 
          player.position_y - 25
        );

        // 현재 플레이어 표시
        if (player.user_id === currentPlayer.user_id) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(
            player.position_x - 20,
            player.position_y - 20,
            40,
            40
          );
        }
      });

      // 격자 효과 (선택사항)
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      for (let i = 0; i < 800; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 600);
        ctx.stroke();
      }
      for (let i = 0; i < 600; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(800, i);
        ctx.stroke();
      }
    };

    // 60fps 렌더링
    const renderInterval = setInterval(render, 1000 / 60);

    return () => clearInterval(renderInterval);
  }, [players, currentPlayer]);

  // 통계 업데이트
  useEffect(() => {
    const alivePlayers = players.filter(p => p.is_alive).length;
    
    setGameStats({
      position: { 
        x: currentPlayer.position_x, 
        y: currentPlayer.position_y 
      },
      velocity: { 
        x: currentPlayer.velocity_x, 
        y: currentPlayer.velocity_y 
      },
      direction: currentPlayer.direction,
      alive_players: alivePlayers
    });

    // 게임 종료 체크
    if (alivePlayers <= 1 && alivePlayers > 0) {
      setTimeout(() => {
        onGameEnd();
      }, 1000);
    }
  }, [players, currentPlayer, onGameEnd]);

  return (
    <div className="relative">
      {/* Game Canvas */}
      <div className="border-2 border-cyan-400 rounded-lg overflow-hidden shadow-lg shadow-cyan-400/20">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="block bg-black cursor-crosshair"
          tabIndex={0}
          style={{ outline: 'none' }}
        />
      </div>

      {/* Game HUD */}
      <div className="absolute top-4 left-4 bg-black/80 border border-green-400 rounded p-3 text-xs">
        <div className="space-y-1">
          <div>POS: ({Math.round(gameStats.position.x)}, {Math.round(gameStats.position.y)})</div>
          <div>VEL: ({Math.round(gameStats.velocity.x * 10) / 10}, {Math.round(gameStats.velocity.y * 10) / 10})</div>
          <div>DIR: {Math.round(gameStats.direction)}°</div>
          <div>ALIVE: {gameStats.alive_players}</div>
        </div>
      </div>

      {/* Player List */}
      <div className="absolute top-4 right-4 bg-black/80 border border-green-400 rounded p-3 text-xs">
        <div className="font-bold mb-2">PLAYERS:</div>
        <div className="space-y-1">
          {players.map(player => (
            <div 
              key={player.id}
              className={`flex items-center gap-2 ${!player.is_alive ? 'opacity-50' : ''}`}
            >
              <div 
                className="w-3 h-3 rounded-full border border-white"
                style={{ backgroundColor: player.color }}
              ></div>
              <span className={player.user_id === currentPlayer.user_id ? 'font-bold' : ''}>
                {player.display_name}
              </span>
              {!player.is_alive && <span className="text-red-400">💀</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-4 bg-black/80 border border-green-400 rounded p-3 text-xs">
        <div className="space-y-1">
          <div>A/D: Rotate</div>
          <div>SPACE: Thrust</div>
          <div>Stay alive!</div>
        </div>
      </div>

      {/* Death Overlay */}
      {!currentPlayer.is_alive && (
        <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-red-400 mb-4">
              💀 YOU DIED
            </h2>
            <p className="text-red-300">
              Watching remaining players...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}