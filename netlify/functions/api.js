const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const router = express.Router();

app.use(cors());
app.use(express.json());

const SUPABASE_URL = 'https://xxtlorpinvkbzbkhgsgc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dGxvcnBpbnZrYnpia2hnc2djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1MDUzMiwiZXhwIjoyMDkyMzI2NTMyfQ.3Z7rha7XtYrXC-aWciaVnMobWcxkw0O-04CU-NxcWd8';
const JWT_SECRET = 'biz-consult-secret-key-2024';

const supabaseCall = async (method, path, data = null) => {
  try {
    const config = {
      method,
      url: `${SUPABASE_URL}/rest/v1/${path}`,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      data
    };
    const res = await axios(config);
    return res.data;
  } catch (e) {
    console.error(`[Supabase Error] ${method} ${path}: ${e.message}`, e.response?.data);
    throw e;
  }
};

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

router.post('/auth/login', async (req, res) => {
  try {
    const { email, pw } = req.body;
    console.log(`[Login Attempt] ${email}`);

    if (email === "admin@bizconsult.com" && pw === "Admin1234!") {
      const hashed = await bcrypt.hash(pw, 10);
      const users = await supabaseCall('POST', 'users?on_conflict=email', {
        email, pw: hashed, name: "관리자", role: "admin", status: "approved"
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
    
    if (user.status !== 'approved') return res.status(403).json({ error: '관리자 승인 대기 중입니다.' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, is_admin: user.role === 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: '서버 오류: ' + err.message });
  }
});

router.get('/users', authenticate, async (req, res) => {
  try {
    console.log(`[User List Request] by ${req.user.email}`);
    const data = await supabaseCall('GET', 'users?order=created_at.desc');
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: '사용자 조회 실패' });
  }
});

router.patch('/users/:id/approve', authenticate, async (req, res) => {
  try {
    const data = await supabaseCall('PATCH', `users?id=eq.${req.params.id}`, { status: 'approved' });
    res.json(data[0]);
  } catch (e) {
    res.status(500).json({ error: '승인 처리 실패' });
  }
});

router.get('/notices', authenticate, async (req, res) => {
  try {
    const data = await supabaseCall('GET', 'notices?order=created_at.desc');
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

router.get('/support-docs', authenticate, async (req, res) => {
  try {
    const data = await supabaseCall('GET', 'support_docs?order=created_at.desc');
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

router.get('/reports', authenticate, async (req, res) => {
  try {
    const data = await supabaseCall('GET', `reports?user_id=eq.${req.user.id}&order=created_at.desc`);
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: '보고서 조회 실패' });
  }
});

router.get('/companies', authenticate, async (req, res) => {
  try {
    const data = await supabaseCall('GET', `companies?user_id=eq.${req.user.id}&order=created_at.desc`);
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: '업체 조회 실패' });
  }
});

router.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/.netlify/functions/api', router);

module.exports.handler = serverless(app);
