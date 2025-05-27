'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import MultiplayerGameCanvas from './MultiplayerGameCanvas';

interface GameRoom {
  id: string;
  room_code: string;
  room_name: string;
  status: 'waiting' | 'playing' | 'finished';
  host_username: string;
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

export default function MultiplayerGamePage() {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<GamePlayer | null>(null);
  const [user, setUser] = useState<any>(null);
  const [gameStatus, setGameStatus] = useState<'loading' | 'playing' | 'finished'>('loading');
  const [winner, setWinner] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;

  // 사용자 인증 확인
  useEffect(() => {
    const checkAuth = () => {
      const userData = sessionStorage.getItem('auth_user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser({
          id: parsedUser.id,
          username: parsedUser.username,
          display_name: parsedUser.displayName
        });
      } else {
        router.push('/auth?redirect=/zero-g-combat/rooms');
      }
    };
    
    checkAuth();
  }, [router]);

  // 게임 데이터 로드
  useEffect(() => {
    if (!user || !roomId) return;

    const loadGameData = async () => {
      try {
        // 룸 정보 확인
        const { data: roomData, error: roomError } = await supabase
          .from('game_rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (roomError || !roomData) {
          alert('게임 룸을 찾을 수 없습니다.');
          router.push('/zero-g-combat/rooms');
          return;
        }

        if (roomData.status !== 'playing') {
          alert('게임이 시작되지 않았습니다.');
          router.push(`/zero-g-combat/rooms/${roomId}`);
          return;
        }

        setRoom(roomData);

        // 플레이어 목록 로드
        const { data: playersData, error: playersError } = await supabase
          .from('game_players')
          .select('*')
          .eq('room_id', roomId);

        if (playersError) {
          console.error('Error loading players:', playersError);
        } else {
          setPlayers(playersData || []);
          
          // 현재 플레이어 찾기
          const currentPlayerData = playersData?.find(p => p.user_id === user.id);
          if (currentPlayerData) {
            setCurrentPlayer(currentPlayerData);
            setGameStatus('playing');
          } else {
            alert('게임에 참여하지 않은 사용자입니다.');
            router.push(`/zero-g-combat/rooms/${roomId}`);
          }
        }

      } catch (error) {
        console.error('Error loading game data:', error);
        router.push('/zero-g-combat/rooms');
      }
    };

    loadGameData();

    // 실시간 플레이어 업데이트 구독
    const subscription = supabase
      .channel(`game_${roomId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_players', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const updatedPlayer = payload.new as GamePlayer;
          
          setPlayers(prev => 
            prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p)
          );

          // 현재 플레이어 업데이트
          if (updatedPlayer.user_id === user.id) {
            setCurrentPlayer(updatedPlayer);
          }

          // 게임 종료 체크
          const alivePlayers = players.filter(p => p.is_alive);
          if (alivePlayers.length <= 1 && alivePlayers.length > 0) {
            setWinner(alivePlayers[0].display_name);
            setGameStatus('finished');
            
            // 3초 후 룸으로 돌아가기
            setTimeout(() => {
              router.push(`/zero-g-combat/rooms/${roomId}`);
            }, 3000);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, roomId, router, players]);

  // 플레이어 입력 처리
  const handlePlayerInput = async (inputType: 'rotate_left' | 'rotate_right' | 'thrust', inputValue?: string) => {
    if (!currentPlayer || !room) return;

    try {
      // 입력을 데이터베이스에 저장
      await supabase
        .from('game_inputs')
        .insert({
          room_id: roomId,
          player_id: currentPlayer.id,
          input_type: inputType,
          input_value: inputValue || null
        });

    } catch (error) {
      console.error('Error sending input:', error);
    }
  };

  // 로딩 상태
  if (gameStatus === 'loading' || !room || !currentPlayer) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-green-400 font-mono text-center">
          <h2 className="text-2xl mb-4">🎮 LOADING GAME...</h2>
          <div className="text-green-300">
            Connecting to multiplayer session...
          </div>
        </div>
      </div>
    );
  }

  // 게임 종료 상태
  if (gameStatus === 'finished') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-green-400 mb-4">
            🏆 GAME OVER
          </h1>
          {winner && (
            <p className="text-2xl text-green-300 mb-4">
              Winner: {winner}
            </p>
          )}
          <p className="text-green-400/70">
            Returning to room in a few seconds...
          </p>
        </div>
      </div>
    );
  }

  // 게임 진행 중
  return (
    <div className="min-h-screen bg-gray-900 text-green-400 font-mono">
      <div className="container mx-auto px-4 py-4">
        {/* Game Header */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold mb-1">
            ⚔️ {room.room_name} - BATTLE ROYALE
          </h1>
          <p className="text-green-300 text-sm">
            Playing as: {currentPlayer.display_name} | Alive: {players.filter(p => p.is_alive).length}/{players.length}
          </p>
        </div>

        {/* Game Canvas */}
        <div className="relative">
          <MultiplayerGameCanvas
            room={room}
            players={players}
            currentPlayer={currentPlayer}
            onPlayerInput={handlePlayerInput}
            onGameEnd={() => setGameStatus('finished')}
          />
        </div>

        {/* Game Controls Info */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-6 text-sm">
            <div>A/D: Rotate</div>
            <div>SPACE: Thrust</div>
            <div>Goal: Last ship standing!</div>
            <button
              onClick={() => router.push(`/zero-g-combat/rooms/${roomId}`)}
              className="px-4 py-2 border border-red-400 bg-transparent hover:bg-red-400/10 
                       text-red-400 transition-colors duration-200 rounded text-xs"
            >
              🚪 LEAVE GAME
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}