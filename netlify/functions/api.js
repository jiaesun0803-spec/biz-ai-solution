const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const serverless = require('serverless-http');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const app = express();
const router = express.Router();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xxtlorpinvkbzbkhgsgc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dGxvcnBpbnZrYnpia2hnc2djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1MDUzMiwiZXhwIjoyMDkyMzI2NTMyfQ.3Z7rha7XtYrXC-aWciaVnMobWcxkw0O-04CU-NxcWd8';
const JWT_SECRET = process.env.JWT_SECRET || 'biz-ai-solution-secret-2026';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 로컬 데이터 경로
const DATA_DIR = path.join(__dirname, '../../data');
const NOTICES_FILE = path.join(DATA_DIR, 'notices.json');
const DOCS_FILE = path.join(DATA_DIR, 'support_docs.json');

// 로컬 백업 사용자
const BACKUP_USERS = [
  {"id": "admin-id", "email": "admin@bizconsult.com", "name": "관리자", "is_admin": true, "approved": true, "pw": "Admin1234!"},
  {"id": "jiae-id", "email": "jiae.sun0803@gmail.com", "name": "선지애", "is_admin": true, "approved": true, "pw": "1234"}
];

// 데이터 로드 함수
function loadLocalData(file) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading local data:', e);
  }
  return [];
}

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
router.get('/health', (req, res) => res.json({ status: 'ok', mode: 'permanent-local' }));

// 로그인
router.post('/auth/login', async (req, res) => {
  const { email, pw } = req.body;
  if (!email || !pw) return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });

  let user = BACKUP_USERS.find(u => u.email === email);
  
  if (!user) {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
      if (!error && data) user = data;
    } catch (e) {}
  }

  if (!user) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });

  let valid = (user.pw && user.pw.startsWith('$2')) ? await bcrypt.compare(pw, user.pw) : (pw === user.pw);
  if (!valid) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  if (!user.approved) return res.status(403).json({ error: '관리자 승인 대기 중입니다.' });

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '30d' });
  const { pw: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// 공지사항 조회
router.get('/notices', async (req, res) => {
  let data = loadLocalData(NOTICES_FILE);
  try {
    const { data: sbData, error } = await supabase.from('notices').select('*').order('date', { ascending: false });
    if (!error && sbData && sbData.length > 0) data = sbData;
  } catch (e) {}
  res.json(data);
});

// 지원사업공문 조회
router.get('/support-docs', async (req, res) => {
  let data = loadLocalData(DOCS_FILE);
  try {
    const { data: sbData, error } = await supabase.from('support_docs').select('*').order('created_at', { ascending: false });
    if (!error && sbData && sbData.length > 0) data = sbData;
  } catch (e) {}
  res.json(data);
});

app.use('/api', router);
app.use('/.netlify/functions/api', router);

module.exports.handler = serverless(app);
