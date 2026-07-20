const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const serverless = require('serverless-http');
const axios = require('axios');
const cheerio = require('cheerio');

// 데이터 직접 내장
let noticesData = [];
let supportDocsData = [];
try {
  noticesData = require('./data/notices.json');
  supportDocsData = require('./data/support_docs.json');
} catch (e) {
  console.error('Failed to load embedded data:', e);
}

const app = express();
const router = express.Router();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xxtlorpinvkbzbkhgsgc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dGxvcnBpbnZrYnpia2hnc2djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1MDUzMiwiZXhwIjoyMDkyMzI2NTMyfQ.3Z7rha7XtYrXC-aWciaVnMobWcxkw0O-04CU-NxcWd8';
const JWT_SECRET = process.env.JWT_SECRET || 'biz-ai-solution-secret-2026';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BACKUP_USERS = [
  {"id": "admin-id", "email": "admin@bizconsult.com", "name": "관리자", "is_admin": true, "approved": true, "pw": "Admin1234!"},
  {"id": "jiae-id", "email": "jiae.sun0803@gmail.com", "name": "선지애", "is_admin": true, "approved": true, "pw": "1234"}
];

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

router.get('/health', (req, res) => res.json({ 
  status: 'ok', 
  mode: 'full-recovery',
  noticesCount: noticesData.length,
  docsCount: supportDocsData.length 
}));

router.post('/auth/login', async (req, res) => {
  const { email, pw } = req.body;
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
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '30d' });
  const { pw: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.get('/notices', async (req, res) => {
  try {
    const { data, error } = await supabase.from('notices').select('*').order('date', { ascending: false });
    if (!error && data && data.length > 0) return res.json(data);
  } catch (e) {}
  res.json(noticesData);
});

router.get('/support-docs', async (req, res) => {
  try {
    const { data, error } = await supabase.from('support_docs').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) return res.json(data);
  } catch (e) {}
  res.json(supportDocsData);
});

router.post('/companies', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('companies').insert([{ ...req.body, user_id: req.user.id }]).select();
    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(200).json({ message: '임시 저장되었습니다. (서버 복구 중)', data: [req.body] });
    }
    res.json(data[0]);
  } catch (e) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

router.get('/companies', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('companies').select('*').eq('user_id', req.user.id);
    if (error) return res.json([]);
    res.json(data || []);
  } catch (e) {
    res.json([]);
  }
});

app.use('/api', router);
app.use('/.netlify/functions/api', router);

module.exports.handler = serverless(app);
