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
  {"id":"6b360e07-9e52-4038-95f6-8be3cc2dba95","email":"qwpp123@naver.com","pw":"$2a$10$glw3kcYdwYYfvv.UBLjale0ZBaRlJzI1gN/aJvMzpQ1UuG4TgBBOC","name":"지애","dept":"솔리드빌더스","phone":"01038471210","is_admin":false,"approved":true},
  {"id":"88632e9a-a31c-4be9-b0f8-eb316146762a","email":"admin@bizconsult.com","pw":"$2a$10$bXtOZ1R2uj6w8toHiO3mXe.ktA4xvq6Ztr1GGW3rEe7h.emHFHjia","name":"관리자","dept":"AI BizConsult","phone":"","is_admin":true,"approved":true},
  {"id":"cc42663b-a9e8-41fe-8391-ce3b66470e7f","email":"lik5496@naver.com","pw":"$2a$10$X6jYISCm3grK.Wzhe3KXmeDVJdHxg756pR5iIXjZ909MaavpAeoYi","name":"이인국","dept":"씨이오솔루션","phone":"01026535496","is_admin":false,"approved":true},
  {"id":"5b2ad056-1928-49fa-acc1-bef8cf29dda9","email":"dpgy2024@naver.com","pw":"$2a$10$5CgD3endCRDH6KGloozbMexeofVNE.lQdvUyaOdV5z0gJJ4dYoZ5O","name":"컨설턴트","dept":"DPPT","phone":"01092558402","is_admin":false,"approved":true}
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
  mode: 'stable-v3',
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

router.put('/auth/me', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').update(req.body).eq('id', req.user.id).select();
    if (error) throw error;
    res.json({ message: '저장되었습니다.', user: data[0] });
  } catch (e) {
    console.error('Auth update error:', e);
    res.status(503).json({ error: '데이터베이스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.' });
  }
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
    if (error) throw error;
    res.json(data[0]);
  } catch (e) {
    console.error('Company insert error:', e);
    res.status(503).json({ error: '데이터베이스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.' });
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

// 관리자용: 전체 사용자 목록 조회
router.get('/admin/users', authMiddleware, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: '관리자 권한이 없습니다.' });
  
  try {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return res.json(data.map(u => {
        const { pw, ...safe } = u;
        return safe;
      }));
    }
  } catch (e) {
    console.error('Admin users fetch error:', e);
  }
  
  res.json(BACKUP_USERS.map(u => {
    const { pw, ...safe } = u;
    return safe;
  }));
});

// 관리자용: 통계 조회
router.get('/admin/stats', authMiddleware, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: '관리자 권한이 없습니다.' });
  
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (!error && data) {
      const stats = {
        total: data.length,
        pending: data.filter(u => !u.is_admin && !u.approved).length,
        approved: data.filter(u => !u.is_admin && u.approved).length,
        reports: 0
      };
      return res.json(stats);
    }
  } catch (e) {
    console.error('Admin stats fetch error:', e);
  }
  
  const stats = {
    total: BACKUP_USERS.length,
    pending: BACKUP_USERS.filter(u => !u.is_admin && !u.approved).length,
    approved: BACKUP_USERS.filter(u => !u.is_admin && u.approved).length,
    reports: 0
  };
  res.json(stats);
});

// 관리자용: 사용자 승인
router.put('/admin/users/:userId/approve', authMiddleware, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: '관리자 권한이 없습니다.' });
  
  try {
    const { data, error } = await supabase.from('users')
      .update({ approved: true, approved_at: new Date().toISOString() })
      .eq('id', req.params.userId)
      .select();
    if (error) throw error;
    res.json({ message: '사용자가 승인되었습니다.', user: data[0] });
  } catch (e) {
    console.error('User approve error:', e);
    res.status(503).json({ error: '데이터베이스 연결이 불안정합니다.' });
  }
});

// 관리자용: 사용자 삭제
router.delete('/admin/users/:userId', authMiddleware, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: '관리자 권한이 없습니다.' });
  
  try {
    const { error } = await supabase.from('users').delete().eq('id', req.params.userId);
    if (error) throw error;
    res.json({ message: '사용자가 삭제되었습니다.' });
  } catch (e) {
    console.error('User delete error:', e);
    res.status(503).json({ error: '데이터베이스 연결이 불안정합니다.' });
  }
});

app.use('/api', router);
app.use('/.netlify/functions/api', router);

module.exports.handler = serverless(app);
