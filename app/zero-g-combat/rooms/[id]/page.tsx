'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface GameRoom {
  id: string;
  room_code: string;
  room_name: string;
  max_players: number;
  current_players: number;
  status: 'waiting' | 'playing' | 'finished';
  host_user_id: string;
  host_username: string;
}

interface GamePlayer {
  id: string;
  username: string;
  display_name: string;
  color: string;
  is_alive: boolean;
  joined_at: string;
}

export default function GameRoomPage() {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;

  // 사용자 인증 확인
  useEffect(() => {
    const checkAuth = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      } else {
        router.push('/auth/login?redirect=/zero-g-combat/rooms');
      }
    };
    
    checkAuth();
  }, [router]);

  // 룸 정보 및 플레이어 목록 로드
  useEffect(() => {
    if (!user || !roomId) return;

    const loadRoomData = async () => {
      try {
        // 룸 정보 로드
        const { data: roomData, error: roomError } = await supabase
          .from('game_rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (roomError || !roomData) {
          alert('룸을 찾을 수 없습니다.');
          router.push('/zero-g-combat/rooms');
          return;
        }

        setRoom(roomData);
        setIsHost(roomData.host_user_id === user.id);

        // 플레이어 목록 로드
        const { data: playersData, error: playersError } = await supabase
          .from('game_players')
          .select('*')
          .eq('room_id', roomId)
          .order('joined_at', { ascending: true });

        if (playersError) {
          console.error('Error loading players:', playersError);
        } else {
          setPlayers(playersData || []);
        }

        // 현재 사용자가 룸에 있는지 확인, 없으면 추가
        const userInRoom = playersData?.find(p => p.user_id === user.id);
        if (!userInRoom) {
          await joinRoomAsPlayer(roomData);
        }

      } catch (error) {
        console.error('Error loading room data:', error);
      } finally {
        setLoading(false);
      }
    };

    const joinRoomAsPlayer = async (roomData: GameRoom) => {
      if (roomData.current_players >= roomData.max_players) {
        alert('룸이 가득 찼습니다.');
        router.push('/zero-g-combat/rooms');
        return;
      }

      // 플레이어 색상 할당
      const playerColors = ['#ff0000', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080'];
      const color = playerColors[roomData.current_players % playerColors.length];

      try {
        await supabase
          .from('game_players')
          .insert({
            room_id: roomId,
            user_id: user.id,
            username: user.username,
            display_name: user.display_name,
            color: color
          });

        // 룸 플레이어 수 업데이트
        await supabase
          .from('game_rooms')
          .update({ current_players: roomData.current_players + 1 })
          .eq('id', roomId);

      } catch (error) {
        console.error('Error joining room:', error);
        alert('룸 참여에 실패했습니다.');
        router.push('/zero-g-combat/rooms');
      }
    };

    loadRoomData();

    // 실시간 업데이트 구독
    const roomSubscription = supabase
      .channel(`room_${roomId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setRoom(payload.new as GameRoom);
          }
        }
      )
      .subscribe();

    const playersSubscription = supabase
      .channel(`players_${roomId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_players', filter: `room_id=eq.${roomId}` },
        () => {
          // 플레이어 목록 다시 로드
          loadRoomData();
        }
      )
      .subscribe();

    return () => {
      roomSubscription.unsubscribe();
      playersSubscription.unsubscribe();
    };
  }, [user, roomId, router]);

  // 게임 시작
  const startGame = async () => {
    if (!isHost || !room) return;

    if (players.length < 2) {
      alert('최소 2명의 플레이어가 필요합니다.');
      return;
    }

    try {
      await supabase
        .from('game_rooms')
        .update({ 
          status: 'playing',
          started_at: new Date().toISOString()
        })
        .eq('id', roomId);

      // 멀티플레이어 게임으로 이동
      router.push(`/zero-g-combat/rooms/${roomId}/game`);
      
    } catch (error) {
      console.error('Error starting game:', error);
      alert('게임 시작에 실패했습니다.');
    }
  };

  // 룸 나가기
  const leaveRoom = async () => {
    if (!user || !room) return;

    try {
      // 플레이어 제거
      await supabase
        .from('game_players')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user.id);

      // 룸 플레이어 수 업데이트
      await supabase
        .from('game_rooms')
        .update({ current_players: Math.max(0, room.current_players - 1) })
        .eq('id', roomId);

      // 호스트가 나가면 룸 삭제
      if (isHost) {
        await supabase
          .from('game_rooms')
          .delete()
          .eq('id', roomId);
      }

      router.push('/zero-g-combat/rooms');
      
    } catch (error) {
      console.error('Error leaving room:', error);
      alert('룸 나가기에 실패했습니다.');
    }
  };

  if (loading || !room) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-green-400 font-mono">Loading room...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-green-400 font-mono">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            ░▒▓ {room.room_name} ▓▒░
          </h1>
          <p className="text-green-300">
            Room Code: <span className="text-2xl font-bold">{room.room_code}</span>
          </p>
          <p className="text-green-400/70 text-sm">
            Host: {room.host_username} | Status: {room.status.toUpperCase()}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Players List */}
            <div className="border border-green-400 rounded-lg p-6 bg-black/50">
              <h2 className="text-2xl mb-4">
                👥 PLAYERS ({players.length}/{room.max_players})
              </h2>
              
              <div className="space-y-3">
                {players.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 border border-green-400/30 rounded bg-green-400/5"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full border border-white"
                        style={{ backgroundColor: player.color }}
                      ></div>
                      <div>
                        <div className="font-bold">
                          {player.display_name}
                          {player.username === room.host_username && ' 👑'}
                        </div>
                        <div className="text-xs text-green-300">
                          @{player.username}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div>#{index + 1}</div>
                      <div className="text-green-300">READY</div>
                    </div>
                  </div>
                ))}
                
                {/* Empty slots */}
                {Array.from({ length: room.max_players - players.length }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="p-3 border border-gray-600/30 rounded bg-gray-600/5 text-gray-500"
                  >
                    <div className="text-center">--- EMPTY SLOT ---</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Room Controls */}
            <div className="space-y-6">
              
              {/* Game Info */}
              <div className="border border-green-400 rounded-lg p-6 bg-black/50">
                <h2 className="text-2xl mb-4">🎮 GAME INFO</h2>
                <div className="space-y-2 text-sm">
                  <div>• Game Mode: Battle Royale</div>
                  <div>• Map: Rectangular Arena</div>
                  <div>• Physics: Zero Gravity</div>
                  <div>• Win Condition: Last Ship Standing</div>
                  <div>• Controls: A/D Rotate, SPACE Thrust</div>
                </div>
              </div>

              {/* Controls */}
              <div className="border border-green-400 rounded-lg p-6 bg-black/50">
                <h2 className="text-2xl mb-4">⚡ CONTROLS</h2>
                
                <div className="space-y-3">
                  {isHost && room.status === 'waiting' && (
                    <button
                      onClick={startGame}
                      disabled={players.length < 2}
                      className="w-full px-6 py-4 border border-green-400 bg-transparent hover:bg-green-400/10 
                               text-green-400 transition-colors duration-200 rounded disabled:opacity-50"
                    >
                      🚀 START GAME
                      {players.length < 2 && (
                        <div className="text-xs mt-1">Need at least 2 players</div>
                      )}
                    </button>
                  )}

                  {!isHost && room.status === 'waiting' && (
                    <div className="w-full px-6 py-4 border border-yellow-400 bg-yellow-400/10 
                                  text-yellow-400 rounded text-center">
                      ⏳ WAITING FOR HOST TO START GAME
                    </div>
                  )}

                  {room.status === 'playing' && (
                    <button
                      onClick={() => router.push(`/zero-g-combat/rooms/${roomId}/game`)}
                      className="w-full px-6 py-4 border border-green-400 bg-green-400/20 hover:bg-green-400/30 
                               text-green-400 transition-colors duration-200 rounded"
                    >
                      🎮 JOIN GAME IN PROGRESS
                    </button>
                  )}

                  <button
                    onClick={leaveRoom}
                    className="w-full px-6 py-4 border border-red-400 bg-transparent hover:bg-red-400/10 
                             text-red-400 transition-colors duration-200 rounded"
                  >
                    🚪 LEAVE ROOM
                  </button>
                </div>
              </div>

              {/* Share Room */}
              <div className="border border-green-400 rounded-lg p-6 bg-black/50">
                <h2 className="text-2xl mb-4">📤 SHARE</h2>
                <div className="text-sm space-y-2">
                  <div>Share this room code with friends:</div>
                  <div className="text-2xl font-bold text-center py-2 border border-green-400/50 rounded bg-green-400/10">
                    {room.room_code}
                  </div>
                  <div className="text-green-300 text-xs text-center">
                    They can join using "JOIN BY CODE" button
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}