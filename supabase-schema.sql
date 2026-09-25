-- Quiz Proctor - Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'admin')) DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- =============================================
-- QUIZZES TABLE
-- =============================================
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  questions JSONB NOT NULL DEFAULT '[]',
  time_limit INTEGER DEFAULT 30,
  assigned_date DATE NOT NULL,
  start_time TIME DEFAULT '00:00',
  end_time TIME DEFAULT '23:59',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster date queries
CREATE INDEX idx_quizzes_assigned_date ON quizzes(assigned_date);
CREATE INDEX idx_quizzes_is_active ON quizzes(is_active);

-- =============================================
-- ATTEMPTS TABLE
-- =============================================
CREATE TABLE attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  answers JSONB DEFAULT '[]',
  violations JSONB DEFAULT '[]',
  violation_count INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('completed', 'terminated')) DEFAULT 'completed',
  time_taken INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_attempts_student_id ON attempts(student_id);
CREATE INDEX idx_attempts_quiz_id ON attempts(quiz_id);
CREATE INDEX idx_attempts_completed_at ON attempts(completed_at);

-- Unique constraint: one attempt per student per quiz
CREATE UNIQUE INDEX idx_unique_student_quiz ON attempts(student_id, quiz_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert themselves" ON users
  FOR INSERT WITH CHECK (true);

-- Quizzes table policies
CREATE POLICY "Anyone can view active quizzes" ON quizzes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Only service role can modify quizzes" ON quizzes
  FOR ALL USING (true);

-- Attempts table policies
CREATE POLICY "Students can view their own attempts" ON attempts
  FOR SELECT USING (true);

CREATE POLICY "Students can insert their own attempts" ON attempts
  FOR INSERT WITH CHECK (true);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get local date string (YYYY-MM-DD)
CREATE OR REPLACE FUNCTION get_local_date_string()
RETURNS TEXT AS $$
BEGIN
  RETURN TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD');
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Insert a sample admin user (password: admin123 - hashed with bcrypt)
-- You'll need to hash this properly in your app
-- INSERT INTO users (username, email, password, role)
-- VALUES ('admin', 'admin@test.com', '$2a$10$hashedpasswordhere', 'admin');

-- Comments for reference
COMMENT ON TABLE users IS 'Stores user accounts (students and admins)';
COMMENT ON TABLE quizzes IS 'Stores quiz templates with questions and schedules';
COMMENT ON TABLE attempts IS 'Stores student quiz attempts with scores and violations';
