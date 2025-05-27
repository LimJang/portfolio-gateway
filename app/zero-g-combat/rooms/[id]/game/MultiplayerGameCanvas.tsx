'use client';

import { useEffect, useRef, useState } from 'react';
import MultiplayerPhysicsEngine from './MultiplayerPhysicsEngine';

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
  const physicsEngineRef = useRef<MultiplayerPhysicsEngine | null>(null);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const [gameStats, setGameStats] = useState({
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    direction: 0,
    alive_players: 0
  });
  const [showSpawnPoints, setShowSpawnPoints] = useState(false); // 디버그용

  // Initialize physics engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const handlePlayerUpdate = (playerId: string, data: any) => {
      // This would normally send to server, but for now we'll handle locally
      // In production, this would update the database
    };

    const handlePlayerDeath = (playerId: string) => {
      if (playerId === currentPlayer.id) {
        // Current player died
        console.log('Current player died!');
      }
    };

    const initPhysics = async () => {
      try {
        const engine = new MultiplayerPhysicsEngine(
          canvasRef.current!,
          currentPlayer.id,
          handlePlayerUpdate,
          handlePlayerDeath
        );
        
        physicsEngineRef.current = engine;
        
        // Wait for physics engine to initialize
        setTimeout(() => {
          // Add all players to physics world
          players.forEach(player => {
            if (physicsEngineRef.current) {
              physicsEngineRef.current.addOrUpdatePlayer(player);
            }
          });
        }, 1000);
        
      } catch (error) {
        console.error('Physics engine initialization failed:', error);
      }
    };

    initPhysics();

    return () => {
      if (physicsEngineRef.current) {
        physicsEngineRef.current.destroy();
      }
    };
  }, [currentPlayer.id]);

  // Update players in physics engine when data changes
  useEffect(() => {
    if (physicsEngineRef.current) {
      players.forEach(player => {
        physicsEngineRef.current!.addOrUpdatePlayer(player);
      });
    }
  }, [players]);

  // Keyboard input handling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      keysRef.current[key] = true;
      
      // Prevent space bar from scrolling
      if (event.key === ' ') {
        event.preventDefault();
      }

      // Debug: Toggle spawn points with 'S' key
      if (key === 's' && event.ctrlKey) {
        setShowSpawnPoints(prev => !prev);
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

  // Input processing and physics update
  useEffect(() => {
    const gameLoop = setInterval(() => {
      if (!physicsEngineRef.current || !currentPlayer.is_alive) return;

      let inputProcessed = false;

      // Handle input
      if (keysRef.current['a']) {
        physicsEngineRef.current.handlePlayerInput('rotate_left');
        onPlayerInput('rotate_left');
        inputProcessed = true;
      }

      if (keysRef.current['d']) {
        physicsEngineRef.current.handlePlayerInput('rotate_right');
        onPlayerInput('rotate_right');
        inputProcessed = true;
      }

      if (keysRef.current[' ']) {
        physicsEngineRef.current.handlePlayerInput('thrust');
        onPlayerInput('thrust');
        inputProcessed = true;
      }

      // Update physics
      physicsEngineRef.current.update();

      // Update stats from physics engine
      const currentPlayerData = physicsEngineRef.current.getCurrentPlayerData();
      if (currentPlayerData) {
        setGameStats({
          position: { 
            x: currentPlayerData.position_x, 
            y: currentPlayerData.position_y 
          },
          velocity: { 
            x: currentPlayerData.velocity_x, 
            y: currentPlayerData.velocity_y 
          },
          direction: currentPlayerData.direction,
          alive_players: players.filter(p => p.is_alive).length
        });
      }
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(gameLoop);
  }, [currentPlayer.is_alive, onPlayerInput, players]);

  // Rendering
  useEffect(() => {
    if (!canvasRef.current || !physicsEngineRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 800, 600);

      // Draw boundaries
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, 800, 600);

      // Draw spawn points (debug mode)
      if (showSpawnPoints && physicsEngineRef.current) {
        const spawnPoints = physicsEngineRef.current.getSpawnPoints();
        spawnPoints.forEach((spawn, index) => {
          ctx.strokeStyle = '#ffff00';
          ctx.fillStyle = '#ffff00';
          ctx.lineWidth = 2;
          
          // Draw spawn circle
          ctx.beginPath();
          ctx.arc(spawn.x, spawn.y, 15, 0, 2 * Math.PI);
          ctx.stroke();
          
          // Draw direction arrow
          const arrowLength = 25;
          const radians = (spawn.direction * Math.PI) / 180;
          const endX = spawn.x + Math.cos(radians) * arrowLength;
          const endY = spawn.y + Math.sin(radians) * arrowLength;
          
          ctx.beginPath();
          ctx.moveTo(spawn.x, spawn.y);
          ctx.lineTo(endX, endY);
          ctx.stroke();
          
          // Draw spawn number
          ctx.font = '12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`S${index + 1}`, spawn.x, spawn.y - 20);
        });
      }

      // Draw obstacles
      const obstacles = physicsEngineRef.current!.getObstacles();
      obstacles.forEach(obstacle => {
        if (obstacle.body) {
          const pos = obstacle.body.position;
          const angle = obstacle.body.angle;
          
          ctx.save();
          ctx.translate(pos.x, pos.y);
          ctx.rotate(angle);
          
          if (obstacle.constructor.name === 'Satellite') {
            // Draw satellite as rectangle
            ctx.fillStyle = '#888888';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.fillRect(-20, -30, 40, 60);
            ctx.strokeRect(-20, -30, 40, 60);
          } else if (obstacle.constructor.name === 'Asteroid') {
            // Draw asteroid as polygon
            ctx.fillStyle = '#8B4513';
            ctx.strokeStyle = '#CD853F';
            ctx.lineWidth = 1;
            
            // Simple hexagon
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const angle = (i * Math.PI * 2) / 6;
              const x = Math.cos(angle) * 15;
              const y = Math.sin(angle) * 15;
              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
          
          ctx.restore();
        }
      });

      // Draw players using physics engine data
      const physicsPlayers = physicsEngineRef.current!.getAllPlayers();
      physicsPlayers.forEach(({ id, player, body }) => {
        if (!body || !player.isAlive) return;

        const playerData = players.find(p => p.id === id);
        if (!playerData) return;

        ctx.save();
        
        // Player position from physics engine
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);

        // Draw triangle spaceship
        ctx.fillStyle = player.isThrusting ? '#ffff00' : playerData.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(0, -15);  // Front point
        ctx.lineTo(-8, 10);  // Back left
        ctx.lineTo(8, 10);   // Back right
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();

        // Draw player name
        ctx.fillStyle = playerData.color;
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          playerData.display_name, 
          body.position.x, 
          body.position.y - 25
        );

        // Highlight current player
        if (id === currentPlayer.id) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(
            body.position.x - 20,
            body.position.y - 20,
            40,
            40
          );
        }
      });

      // Draw grid
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

    const renderInterval = setInterval(render, 1000 / 60);
    return () => clearInterval(renderInterval);
  }, [players, currentPlayer, showSpawnPoints]);

  // Game end check
  useEffect(() => {
    const alivePlayers = players.filter(p => p.is_alive).length;
    if (alivePlayers <= 1 && alivePlayers > 0) {
      setTimeout(() => {
        onGameEnd();
      }, 1000);
    }
  }, [players, onGameEnd]);

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
          <div className="text-yellow-400">⚡ PHYSICS: ON</div>
          <div className="text-cyan-400">🎯 SPAWN: DISTRIBUTED</div>
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
          <div className="text-cyan-400">⚡ Real Physics!</div>
          <div className="text-yellow-400">🎯 8-Point Spawn</div>
          {showSpawnPoints && <div className="text-yellow-400">👁️ Spawn Points: ON</div>}
        </div>
      </div>

      {/* Debug Info */}
      <div className="absolute bottom-4 right-4 bg-black/80 border border-gray-600 rounded p-2 text-xs text-gray-400">
        <div>Ctrl+S: Toggle Spawn Points</div>
      </div>

      {/* Death Overlay */}
      {!currentPlayer.is_alive && (
        <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-red-400 mb-4">
              💀 YOU DIED
            </h2>
            <p className="text-red-300">
              Hit the boundary wall!
            </p>
            <p className="text-red-400/70 text-sm mt-2">
              Watching remaining players...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}