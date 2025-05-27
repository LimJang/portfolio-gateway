'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface GameRoom {
  id: string;
  room_code: string;
  room_name: string;
  max_players: number;
  current_players: number;
  status: 'waiting' | 'playing' | 'finished';
  host_username: string;
  created_at: string;
}

export default function GameRoomsPage() {
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [supabaseReady, setSupabaseReady] = useState(false);
  const router = useRouter();

  // Supabase 연결 체크
  useEffect(() => {
    const checkSupabase = () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase configuration missing');
        setSupabaseReady(false);
        return;
      }
      
      setSupabaseReady(true);
    };
    
    checkSupabase();
  }, []);

  // 사용자 인증 확인 (실제 인증 시스템과 일치)
  useEffect(() => {
    if (!supabaseReady) return;
    
    const checkAuth = () => {
      // sessionStorage에서 auth_user 키로 사용자 정보 확인
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
  }, [router, supabaseReady]);

  // 게임 룸 목록 로드
  useEffect(() => {
    if (!user || !supabaseReady) return;
    
    const loadRooms = async () => {
      try {
        const { data, error } = await supabase
          .from('game_rooms')
          .select('*')
          .eq('status', 'waiting')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading rooms:', error);
        } else {
          setRooms(data || []);
        }
      } catch (error) {
        console.error('Supabase connection error:', error);
      }
    };

    loadRooms();

    // 실시간 룸 업데이트 구독
    const subscription = supabase
      .channel('game_rooms_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'game_rooms' },
        () => loadRooms()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, supabaseReady]);

  // 6자리 룸 코드 생성
  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // 게임 룸 생성
  const createRoom = async () => {
    if (!user || !newRoomName.trim() || !supabaseReady) return;
    
    setLoading(true);
    const roomCode = generateRoomCode();
    
    try {
      const { data, error } = await supabase
        .from('game_rooms')
        .insert({
          room_code: roomCode,
          room_name: newRoomName.trim(),
          max_players: 8,
          current_players: 1,
          status: 'waiting',
          host_user_id: user.id,
          host_username: user.username
        })
        .select()
        .single();

      if (error) throw error;

      // 호스트를 플레이어로 추가
      await supabase
        .from('game_players')
        .insert({
          room_id: data.id,
          user_id: user.id,
          username: user.username,
          display_name: user.display_name,
          color: '#00ff00' // 호스트는 초록색
        });

      // 룸으로 이동
      router.push(`/zero-g-combat/rooms/${data.id}`);
      
    } catch (error) {
      console.error('Error creating room:', error);
      alert('룸 생성에 실패했습니다.');
    } finally {
      setLoading(false);
      setShowCreateModal(false);
      setNewRoomName('');
    }
  };

  // 룸 코드로 참여
  const joinRoomByCode = async () => {
    if (!user || !joinCode.trim() || !supabaseReady) return;
    
    setLoading(true);
    
    try {
      // 룸 찾기
      const { data: room, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', joinCode.toUpperCase())
        .eq('status', 'waiting')
        .single();

      if (roomError || !room) {
        alert('룸을 찾을 수 없습니다.');
        return;
      }

      if (room.current_players >= room.max_players) {
        alert('룸이 가득 찼습니다.');
        return;
      }

      // 플레이어 추가
      const playerColors = ['#ff0000', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080'];
      const color = playerColors[room.current_players % playerColors.length];

      await supabase
        .from('game_players')
        .insert({
          room_id: room.id,
          user_id: user.id,
          username: user.username,
          display_name: user.display_name,
          color: color
        });

      // 룸 플레이어 수 업데이트
      await supabase
        .from('game_rooms')
        .update({ current_players: room.current_players + 1 })
        .eq('id', room.id);

      // 룸으로 이동
      router.push(`/zero-g-combat/rooms/${room.id}`);
      
    } catch (error) {
      console.error('Error joining room:', error);
      alert('룸 참여에 실패했습니다.');
    } finally {
      setLoading(false);
      setJoinCode('');
    }
  };

  // 룸 직접 참여 (목록에서)
  const joinRoom = async (room: GameRoom) => {
    if (!user) return;
    
    if (room.current_players >= room.max_players) {
      alert('룸이 가득 찼습니다.');
      return;
    }

    router.push(`/zero-g-combat/rooms/${room.id}`);
  };

  // Supabase 연결 체크
  if (!supabaseReady) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400 font-mono text-center">
          <h2 className="text-2xl mb-4">⚠️ Configuration Error</h2>
          <p>Supabase connection is not properly configured.</p>
          <p className="text-sm mt-2">Please check environment variables.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-green-400 font-mono">로그인 확인 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-green-400 font-mono">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            ░▒▓ GAME ROOMS ▓▒░
          </h1>
          <p className="text-green-300">
            Join or create a multiplayer battle room
          </p>
          <p className="text-green-400/70 text-sm mt-2">
            Welcome, {user.display_name} (@{user.username})
          </p>
        </div>

        {/* Action Buttons */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-4 border border-green-400 bg-transparent hover:bg-green-400/10 
                       text-green-400 transition-colors duration-200 rounded"
            >
              📡 CREATE ROOM
            </button>
            
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="ROOM CODE"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-4 bg-black border border-green-400 text-green-400 
                         placeholder-green-400/50 focus:outline-none focus:border-green-300 rounded"
                maxLength={6}
              />
              <button
                onClick={joinRoomByCode}
                disabled={loading || !joinCode.trim()}
                className="px-6 py-4 border border-green-400 bg-transparent hover:bg-green-400/10 
                         text-green-400 transition-colors duration-200 rounded disabled:opacity-50"
              >
                🚀 JOIN
              </button>
            </div>

            <button
              onClick={() => router.push('/zero-g-combat')}
              className="px-6 py-4 border border-gray-600 bg-transparent hover:bg-gray-600/10 
                       text-gray-400 transition-colors duration-200 rounded"
            >
              ← BACK TO DEMO
            </button>
          </div>
        </div>

        {/* Room List */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl mb-4">🌌 AVAILABLE ROOMS</h2>
          
          {rooms.length === 0 ? (
            <div className="border border-green-400/30 rounded p-8 text-center bg-green-400/5">
              <p className="text-green-400/70">No rooms available. Create one to start!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="border border-green-400 rounded p-4 bg-black/50 hover:bg-green-400/5 
                           transition-colors duration-200 cursor-pointer"
                  onClick={() => joinRoom(room)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-green-400">
                        {room.room_name}
                      </h3>
                      <p className="text-green-300 text-sm">
                        Host: {room.host_username} | Code: {room.room_code}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-green-400">
                        👥 {room.current_players}/{room.max_players}
                      </div>
                      <div className="text-xs text-green-300">
                        {room.status === 'waiting' ? '🟢 WAITING' : '🔴 PLAYING'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Room Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-green-400 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4 text-green-400">CREATE NEW ROOM</h3>
              
              <div className="mb-4">
                <label className="block text-green-300 text-sm mb-2">Room Name:</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Enter room name..."
                  className="w-full px-4 py-3 bg-black border border-green-400 text-green-400 
                           placeholder-green-400/50 focus:outline-none focus:border-green-300 rounded"
                  maxLength={30}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={createRoom}
                  disabled={loading || !newRoomName.trim()}
                  className="flex-1 px-4 py-3 border border-green-400 bg-transparent hover:bg-green-400/10 
                           text-green-400 transition-colors duration-200 rounded disabled:opacity-50"
                >
                  {loading ? 'CREATING...' : 'CREATE'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewRoomName('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-600 bg-transparent hover:bg-gray-600/10 
                           text-gray-400 transition-colors duration-200 rounded"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}