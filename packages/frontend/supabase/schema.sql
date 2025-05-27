-- Supabase SQL Schema for Portfolio Gateway
-- 이 스키마를 Supabase SQL Editor에서 실행하세요

-- Users 테이블
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages 테이블
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  username TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patch Notes 테이블
CREATE TABLE IF NOT EXISTS patch_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'feature', -- 'feature', 'bugfix', 'security', 'improvement'
  is_major BOOLEAN DEFAULT false,
  author_id UUID REFERENCES users(id),
  author_name TEXT NOT NULL DEFAULT 'System',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published BOOLEAN DEFAULT true
);

-- ==============================================
-- Zero-G Combat 멀티플레이어 테이블들
-- ==============================================

-- Game Rooms 테이블 (게임 룸 관리)
CREATE TABLE IF NOT EXISTS game_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT UNIQUE NOT NULL, -- 6자리 방 코드 (예: "ABC123")
  room_name TEXT NOT NULL,
  max_players INTEGER DEFAULT 8,
  current_players INTEGER DEFAULT 0,
  status TEXT DEFAULT 'waiting', -- 'waiting', 'playing', 'finished'
  host_user_id UUID REFERENCES users(id),
  host_username TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE
);

-- Game Players 테이블 (룸별 플레이어 관리)
CREATE TABLE IF NOT EXISTS game_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  position_x REAL DEFAULT 400,
  position_y REAL DEFAULT 300,
  velocity_x REAL DEFAULT 0,
  velocity_y REAL DEFAULT 0,
  direction REAL DEFAULT 0, -- 0-360 degrees
  is_alive BOOLEAN DEFAULT true,
  is_thrusting BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#00ff00', -- 플레이어별 고유 색상
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game Inputs 테이블 (실시간 입력 처리)
CREATE TABLE IF NOT EXISTS game_inputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_id UUID REFERENCES game_players(id) ON DELETE CASCADE,
  input_type TEXT NOT NULL, -- 'rotate_left', 'rotate_right', 'thrust'
  input_value TEXT, -- 추가 데이터 (예: 방향 각도)
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game States 테이블 (게임 상태 스냅샷)
CREATE TABLE IF NOT EXISTS game_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
  game_tick INTEGER NOT NULL, -- 게임 틱 번호
  players_data JSONB NOT NULL, -- 모든 플레이어 상태 JSON
  obstacles_data JSONB, -- 장애물 상태 JSON
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_username ON messages(username);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_patch_notes_created_at ON patch_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patch_notes_version ON patch_notes(version);
CREATE INDEX IF NOT EXISTS idx_patch_notes_category ON patch_notes(category);

-- Zero-G Combat 인덱스
CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON game_rooms(status);
CREATE INDEX IF NOT EXISTS idx_game_rooms_room_code ON game_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_game_players_room_id ON game_players(room_id);
CREATE INDEX IF NOT EXISTS idx_game_players_user_id ON game_players(user_id);
CREATE INDEX IF NOT EXISTS idx_game_inputs_room_id ON game_inputs(room_id);
CREATE INDEX IF NOT EXISTS idx_game_inputs_timestamp ON game_inputs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_game_states_room_id ON game_states(room_id);
CREATE INDEX IF NOT EXISTS idx_game_states_game_tick ON game_states(game_tick);

-- RLS (Row Level Security) 설정
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE patch_notes ENABLE ROW LEVEL SECURITY;

-- Zero-G Combat 테이블 RLS 설정
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;

-- 정책 생성 - 누구나 읽기 가능, 인증된 사용자만 쓰기
CREATE POLICY "Anyone can read users" ON users FOR SELECT USING (true);
CREATE POLICY "Anyone can insert users" ON users FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert messages" ON messages FOR INSERT WITH CHECK (true);

-- 패치노트는 누구나 읽기 가능, 관리자만 쓰기 (일단 누구나 쓰기 가능으로 설정)
CREATE POLICY "Anyone can read patch notes" ON patch_notes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert patch notes" ON patch_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update patch notes" ON patch_notes FOR UPDATE USING (true);

-- Zero-G Combat 정책 (게임 참여자만 읽기/쓰기 가능)
CREATE POLICY "Anyone can read game rooms" ON game_rooms FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create game rooms" ON game_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Room hosts can update game rooms" ON game_rooms FOR UPDATE USING (true);

CREATE POLICY "Anyone can read game players" ON game_players FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join games" ON game_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Players can update their own data" ON game_players FOR UPDATE USING (true);

CREATE POLICY "Room players can read inputs" ON game_inputs FOR SELECT USING (true);
CREATE POLICY "Players can insert their inputs" ON game_inputs FOR INSERT WITH CHECK (true);

CREATE POLICY "Room players can read game states" ON game_states FOR SELECT USING (true);
CREATE POLICY "System can insert game states" ON game_states FOR INSERT WITH CHECK (true);

-- 실시간 구독 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE patch_notes;

-- Zero-G Combat 실시간 구독 (핵심!)
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE game_players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_inputs;
ALTER PUBLICATION supabase_realtime ADD TABLE game_states;

-- 초기 패치노트 데이터 삽입
INSERT INTO patch_notes (version, title, description, category, is_major, author_name) VALUES
('v1.0.0', 'Portfolio Gateway 최초 릴리즈', '• Next.js 14 기반 포트폴리오 게이트웨이 구축\n• 레트로 터미널 테마 적용\n• Vercel 자동 배포 파이프라인 구축', 'feature', true, 'LimJang'),
('v1.1.0', '실시간 채팅 시스템 구현', '• Socket.io 기반 실시간 채팅 구현\n• SQLite + Prisma 데이터베이스 연동\n• 온라인 사용자 수 표시\n• 모바일 반응형 최적화', 'feature', true, 'LimJang'),
('v1.2.0', 'Supabase 마이그레이션', '• Socket.io + SQLite에서 Supabase로 완전 마이그레이션\n• PostgreSQL 클라우드 DB 적용\n• Realtime WebSocket 구독 구현\n• Vercel 서버리스 환경 100% 호환', 'improvement', true, 'LimJang'),
('v1.3.0', '사용자 인증 시스템 추가', '• SHA-256 해시 기반 회원가입/로그인 구현\n• 세션 기반 인증 시스템\n• 사용자 프로필 (표시명, 사용자명) 지원\n• 보안 강화된 채팅 시스템\n• 자동 인증 체크 및 리다이렉트', 'security', true, 'LimJang'),
('v1.4.0', '패치노트 시스템 구현', '• 동적 패치노트 관리 시스템\n• Supabase 기반 업데이트 로그\n• 버전별, 카테고리별 분류\n• 실시간 업데이트 알림', 'feature', false, 'LimJang'),
('v2.0.0', 'Zero-G Combat 멀티플레이어 시스템', '• 실시간 8인 우주선 배틀로얄 게임\n• Supabase Realtime 기반 동기화\n• 게임 룸 생성/참여 시스템\n• 서버 권한 기반 안정적인 멀티플레이어', 'feature', true, 'LimJang');