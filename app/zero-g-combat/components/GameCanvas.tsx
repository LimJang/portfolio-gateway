'use client';

import { useEffect, useRef, useState } from 'react';
import PhysicsEngine from '../lib/physics/PhysicsEngine';

interface GameCanvasProps {
  onGameEnd: () => void;
}

export default function GameCanvas({ onGameEnd }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PhysicsEngine | null>(null);
  const [gameStatus, setGameStatus] = useState<'loading' | 'playing' | 'dead'>('loading');
  const [stats, setStats] = useState({
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    direction: 0
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    const initializeGame = async () => {
      try {
        // Initialize physics engine
        const engine = new PhysicsEngine(canvasRef.current!);
        engineRef.current = engine;

        // Wait a bit for Matter.js to load, then create player
        setTimeout(async () => {
          if (engineRef.current) {
            await engineRef.current.createPlayer(400, 300);
            setGameStatus('playing');
          }
        }, 1000);

      } catch (error) {
        console.error('Failed to initialize game:', error);
        setGameStatus('dead');
      }
    };

    // Prevent default space bar behavior
    const preventSpaceScroll = (e: KeyboardEvent) => {
      if (e.key === ' ' && e.target === canvasRef.current) {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', preventSpaceScroll);
    
    initializeGame();

    // Game loop
    const gameLoop = () => {
      if (engineRef.current && gameStatus === 'playing') {
        engineRef.current.update();
        
        // Update stats
        const playerData = engineRef.current.getPlayerData();
        if (playerData) {
          setStats({
            position: playerData.position,
            velocity: playerData.velocity,
            direction: playerData.direction
          });

          // Check if player is dead (hit boundary)
          if (!playerData.isAlive) {
            setGameStatus('dead');
          }
        }
      }
    };

    const intervalId = setInterval(gameLoop, 1000 / 60); // 60 FPS

    // Cleanup
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('keydown', preventSpaceScroll);
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, [gameStatus]);

  // Handle restart after death
  useEffect(() => {
    if (gameStatus === 'dead') {
      setTimeout(() => {
        onGameEnd();
      }, 3000); // Show death screen for 3 seconds
    }
  }, [gameStatus, onGameEnd]);

  return (
    <div className="relative">
      {/* Game Canvas */}
      <div className="border-2 border-cyan-400 rounded-lg overflow-hidden shadow-lg shadow-cyan-400/20">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="block bg-black"
          tabIndex={0}
          style={{ outline: 'none' }}
        />
      </div>

      {/* Loading Screen */}
      {gameStatus === 'loading' && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-green-400 mb-4">
              INITIALIZING PHYSICS ENGINE...
            </h2>
            <div className="text-green-300">
              Loading Matter.js
            </div>
          </div>
        </div>
      )}

      {/* Game HUD */}
      {gameStatus === 'playing' && (
        <div className="absolute top-4 left-4 bg-black/80 border border-green-400 rounded p-3 text-xs">
          <div className="space-y-1">
            <div>POS: ({Math.round(stats.position.x)}, {Math.round(stats.position.y)})</div>
            <div>VEL: ({Math.round(stats.velocity.x * 10) / 10}, {Math.round(stats.velocity.y * 10) / 10})</div>
            <div>ROT: {Math.round(stats.direction)}°</div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {gameStatus === 'playing' && (
        <div className="absolute top-4 right-4 bg-black/80 border border-green-400 rounded p-3 text-xs">
          <div className="space-y-1">
            <div>A/D: Rotate</div>
            <div>SPACE: Thrust</div>
            <div>Stay inside boundaries!</div>
          </div>
        </div>
      )}

      {/* Death Screen */}
      {gameStatus === 'dead' && (
        <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-red-400 mb-4">
              SHIP DESTROYED
            </h2>
            <p className="text-red-300">
              You hit the boundary walls...
            </p>
            <p className="text-sm text-red-400 mt-2">
              Returning to mission control in 3 seconds...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}