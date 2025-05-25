-- Supabase SQL Schema for Chat System
-- 이 스키마를 Supabase SQL Editor에서 실행하세요

-- Users 테이블
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
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

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_username ON messages(username);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- RLS (Row Level Security) 설정 - 모든 사용자가 읽기/쓰기 가능
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 정책 생성 - 누구나 읽기/쓰기 가능 (공개 채팅방)
CREATE POLICY "Anyone can read users" ON users FOR SELECT USING (true);
CREATE POLICY "Anyone can insert users" ON users FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert messages" ON messages FOR INSERT WITH CHECK (true);

-- 실시간 구독 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
