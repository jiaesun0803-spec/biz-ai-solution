const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const serverless = require('serverless-http');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const router = express.Router();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xxtlorpinvkbzbkhgsgc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dGxvcnBpbnZrYnpia2hnc2djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1MDUzMiwiZXhwIjoyMDkyMzI2NTMyfQ.3Z7rha7XtYrXC-aWciaVnMobWcxkw0O-04CU-NxcWd8';
const JWT_SECRET = process.env.JWT_SECRET || 'biz-ai-solution-secret-2026';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 로컬 백업 데이터 (Supabase 장애 시 사용)
const BACKUP_USERS = [
  {"id": 1, "email": "jiae.sun0803@gmail.com", "name": "선지애", "is_admin": true, "approved": true, "pw": "1234"},
  {"id": 2, "email": "user1@example.com", "name": "사용자1", "is_admin": false, "approved": true, "pw": "1234"},
  {"id": 3, "email": "user2@example.com", "name": "사용자2", "is_admin": false, "approved": true, "pw": "1234"},
  {"id": 4, "email": "user3@example.com", "name": "사용자3", "is_admin": false, "approved": true, "pw": "1234"},
  {"id": 5, "email": "user4@example.com", "name": "사용자4", "is_admin": false, "approved": true, "pw": "1234"}
];

// JWT 인증 미들웨어
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '인증 토큰이 없습니다.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
}

// 관리자 미들웨어
function adminMiddleware(req, res, next) {
  if (!req.user.is_admin) return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  next();
}

// 헬스체크
router.get('/health', (req, res) => res.json({ status: 'ok', mode: 'hybrid' }));

// 로그인
router.post('/auth/login', async (req, res) => {
  const { email, pw } = req.body;
  if (!email || !pw) return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });

  let user = null;
  try {
    // 1. Supabase 시도
    const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
    if (!error && data) {
      user = data;
    }
  } catch (e) {
    console.error('Supabase error, falling back to backup');
  }

  // 2. Supabase 실패 시 백업 데이터 확인
  if (!user) {
    user = BACKUP_USERS.find(u => u.email === email);
  }

  if (!user) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });

  let valid = false;
  if (user.pw && user.pw.startsWith('$2')) {
    valid = await bcrypt.compare(pw, user.pw);
  } else {
    valid = (pw === user.pw);
  }

  if (!valid) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  if (!user.approved) return res.status(403).json({ error: '관리자 승인 대기 중입니다.' });

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin },
    JWT_SECRET, { expiresIn: '30d' }
  );

  const { pw: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// 전체 사용자 목록 (관리자)
router.get('/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (!error && data) return res.json(data);
  } catch (e) {}
  res.json(BACKUP_USERS.map(({ pw, ...u }) => u));
});

app.use('/api', router);
app.use('/.netlify/functions/api', router);

module.exports.handler = serverless(app);
