'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import GameCanvas from './components/GameCanvas';

export default function ZeroGCombatPage() {
  const [gameStarted, setGameStarted] = useState(false);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-900 text-green-400 font-mono">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            ░▒▓ ZERO-G COMBAT ▓▒░
          </h1>
          <p className="text-green-300">
            Physics-based space combat in zero gravity
          </p>
        </div>

        {!gameStarted ? (
          /* Main Menu */
          <div className="max-w-2xl mx-auto">
            <div className="border border-green-400 rounded-lg p-8 bg-black/50">
              <h2 className="text-2xl mb-6 text-center">MISSION CONTROL</h2>
              
              <div className="space-y-4">
                <button 
                  onClick={() => setGameStarted(true)}
                  className="w-full px-6 py-4 border border-green-400 bg-transparent hover:bg-green-400/10 
                           text-green-400 transition-colors duration-200 rounded"
                >
                  [DEMO] Start Single Player
                </button>
                
                <button 
                  onClick={() => router.push('/zero-g-combat/rooms')}
                  className="w-full px-6 py-4 border border-cyan-400 bg-transparent hover:bg-cyan-400/10 
                           text-cyan-400 transition-colors duration-200 rounded"
                >
                  🚀 [MULTIPLAYER] Join Battle Rooms
                </button>
                
                <button 
                  disabled
                  className="w-full px-6 py-4 border border-gray-600 bg-transparent 
                           text-gray-600 rounded cursor-not-allowed"
                >
                  [SOON] Quick Match
                </button>
              </div>

              <div className="mt-8 p-4 border border-green-400/30 rounded bg-green-400/5">
                <h3 className="text-lg mb-2">CONTROLS:</h3>
                <div className="text-sm space-y-1">
                  <p>• A/D: Rotate ship left/right</p>
                  <p>• SPACE: Thrust forward</p>
                  <p>• Goal: Push enemies into boundary walls</p>
                </div>
              </div>

              <div className="mt-4 p-4 border border-cyan-400/30 rounded bg-cyan-400/5">
                <h3 className="text-lg mb-2 text-cyan-400">MULTIPLAYER:</h3>
                <div className="text-sm space-y-1 text-cyan-300">
                  <p>• Create or join rooms with up to 8 players</p>
                  <p>• Real-time battles with friends</p>
                  <p>• Last ship standing wins!</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Game Screen */
          <div className="relative">
            <GameCanvas onGameEnd={() => setGameStarted(false)} />
          </div>
        )}
      </div>
    </div>
  );
}