const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const serverless = require('serverless-http');
const axios = require('axios');
const app = express();
const router = express.Router();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

const SUPABASE_URL = 'https://xxtlorpinvkbzbkhgsgc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dGxvcnBpbnZrYnpia2hnc2djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1MDUzMiwiZXhwIjoyMDkyMzI2NTMyfQ.3Z7rha7XtYrXC-aWciaVnMobWcxkw0O-04CU-NxcWd8';
const JWT_SECRET = 'biz-ai-solution-secret-2026';

// ===== Supabase 호출 유틸리티 =====
const supabaseCall = async (method, path, data = null) => {
  try {
    const config = {
      method,
      url: `${SUPABASE_URL}/rest/v1/${path}`,
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      data
    };
    const res = await axios(config);
    return res.data;
  } catch (e) {
    console.error(`[Supabase] ❌ 오류: ${e.message}`, e.response?.data);
    throw e;
  }
};

// ===== 인증 미들웨어 =====
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '토큰이 없습니다.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: '토큰이 유효하지 않습니다.' });
  }
};

// ===== 로그인 =====
router.post('/auth/login', async (req, res) => {
  try {
    const { email, pw } = req.body;
    
    // 관리자 계정 강제 복구
    if (email === "admin@bizconsult.com" && pw === "Admin1234!") {
      const hashed = await bcrypt.hash(pw, 10);
      const users = await supabaseCall('POST', 'users?on_conflict=email', {
        email, pw: hashed, name: "관리자", is_admin: true, is_approved: true, role: "admin"
      });
      const adminUser = users[0];
      const token = jwt.sign({ id: adminUser.id, email, role: "admin", is_admin: true }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: adminUser });
    }

    const users = await supabaseCall('GET', `users?email=eq.${email}`);
    const user = users[0];
    if (!user) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    
    const match = await bcrypt.compare(pw, user.pw);
    if (!match) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    
    if (!user.is_approved) return res.status(403).json({ error: '관리자 승인 대기 중입니다.' });
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: '서버 오류: ' + err.message });
  }
});

// ===== 사용자 관리 API (관리자 전용) =====
router.get('/users', authenticate, async (req, res) => {
  try {
    // 관리자 권한 체크 (토큰의 role 또는 is_admin 확인)
    if (!req.user.is_admin && req.user.role !== 'admin') {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }
    const data = await supabaseCall('GET', 'users?order=created_at.desc');
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: '사용자 조회 실패' });
  }
});

router.patch('/users/:id/approve', authenticate, async (req, res) => {
  try {
    if (!req.user.is_admin && req.user.role !== 'admin') {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }
    const data = await supabaseCall('PATCH', `users?id=eq.${req.params.id}`, { is_approved: true });
    res.json(data[0]);
  } catch (e) {
    res.status(500).json({ error: '승인 처리 실패' });
  }
});

// ===== 공지사항 API =====
router.get('/notices', authenticate, async (req, res) => {
  try {
    const data = await supabaseCall('GET', `notices?order=created_at.desc`);
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: '공지사항 조회 실패' });
  }
});

router.post('/notices', authenticate, async (req, res) => {
  try {
    const data = await supabaseCall('POST', 'notices', { ...req.body, user_id: req.user.id });
    res.json(data[0]);
  } catch (e) {
    res.status(500).json({ error: '공지사항 등록 실패' });
  }
});

// ===== 지원사업공문 API =====
router.get('/support-docs', authenticate, async (req, res) => {
  try {
    const data = await supabaseCall('GET', `support_docs?order=created_at.desc`);
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: '공문 조회 실패' });
  }
});

router.post('/support-docs', authenticate, async (req, res) => {
  try {
    const data = await supabaseCall('POST', 'support_docs', { ...req.body, user_id: req.user.id });
    res.json(data[0]);
  } catch (e) {
    res.status(500).json({ error: '공문 등록 실패' });
  }
});

// ===== 보고서 API =====
router.get('/reports', authenticate, async (req, res) => {
  try {
    const data = await supabaseCall('GET', `reports?user_id=eq.${req.user.id}&order=created_at.desc`);
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: '보고서 조회 실패' });
  }
});

// ===== 업체 관리 API =====
router.get('/companies', authenticate, async (req, res) => {
  try {
    const data = await supabaseCall('GET', `companies?user_id=eq.${req.user.id}&order=created_at.desc`);
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: '업체 조회 실패' });
  }
});

// ===== 헬스 체크 =====
router.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/.netlify/functions/api', router);
module.exports.handler = serverless(app);
