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
    console.error('Supabase Call Error:', e.message, e.response?.data);
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
    
    // 1. 관리자 계정 강제 복구 및 데이터 연결
    if (email === "admin@bizconsult.com" && pw === "Admin1234!") {
      const hashed = await bcrypt.hash(pw, 10);
      const users = await supabaseCall('POST', 'users?on_conflict=email', {
        email, pw: hashed, name: "관리자", is_admin: true, is_approved: true, dept: "본사", phone: "010-0000-0000"
      });
      const adminUser = users[0];

      // 모든 기존 데이터 소유권 이전 (데이터 복구)
      const tables = ['reports', 'support_docs', 'notices', 'companies'];
      for (const table of tables) {
        try {
          await axios({
            method: 'PATCH',
            url: `${SUPABASE_URL}/rest/v1/${table}?or=(user_id.neq.${adminUser.id},user_id.is.null)`,
            headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` },
            data: { user_id: adminUser.id }
          });
        } catch (e) {
          console.warn(`데이터 복구 실패 (${table}):`, e.message);
        }
      }

      const token = jwt.sign({ id: adminUser.id, email, is_admin: true }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: adminUser });
    }

    // 2. 일반 사용자 로그인
    const users = await supabaseCall('GET', `users?email=eq.${email}`);
    const user = users[0];
    if (!user) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    
    const match = await bcrypt.compare(pw, user.pw);
    if (!match) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    
    if (!user.is_approved) return res.status(403).json({ error: '관리자 승인 대기 중입니다.' });
    
    const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin } });
  } catch (err) {
    console.error('로그인 오류:', err.message);
    res.status(500).json({ error: '서버 오류: ' + err.message });
  }
});

// ===== 공지사항 API =====
router.get('/notices', authenticate, async (req, res) => {
  try {
    const data = await supabaseCall('GET', `notices?user_id=eq.${req.user.id}&order=created_at.desc`);
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: '공지사항 조회 실패' });
  }
});

router.post('/notices', authenticate, async (req, res) => {
  try {
    const { title, content, category, date, is_pinned } = req.body;
    const data = await supabaseCall('POST', 'notices', {
      user_id: req.user.id,
      title,
      content,
      category: category || '공지',
      date: date || new Date().toISOString().split('T')[0],
      is_pinned: is_pinned || false
    });
    res.json(data[0]);
  } catch (e) {
    res.status(500).json({ error: '공지사항 등록 실패' });
  }
});

router.patch('/notices/:id', authenticate, async (req, res) => {
  try {
    const { title, content, category, date, is_pinned } = req.body;
    const data = await supabaseCall('PATCH', `notices?id=eq.${req.params.id}&user_id=eq.${req.user.id}`, {
      title, content, category, date, is_pinned
    });
    res.json(data[0]);
  } catch (e) {
    res.status(500).json({ error: '공지사항 수정 실패' });
  }
});

router.delete('/notices/:id', authenticate, async (req, res) => {
  try {
    await supabaseCall('DELETE', `notices?id=eq.${req.params.id}&user_id=eq.${req.user.id}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '공지사항 삭제 실패' });
  }
});

// ===== 지원사업공문 API =====
router.get('/support-docs', authenticate, async (req, res) => {
  try {
    const data = await supabaseCall('GET', `support_docs?user_id=eq.${req.user.id}&order=created_at.desc`);
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: '공문 조회 실패' });
  }
});

router.post('/support-docs', authenticate, async (req, res) => {
  try {
    const { title, agency, deadline, description, is_limitless, date, file_url, file_name } = req.body;
    const data = await supabaseCall('POST', 'support_docs', {
      user_id: req.user.id,
      title,
      agency: agency || '',
      deadline: deadline || '',
      description: description || '',
      is_limitless: is_limitless || false,
      date: date || new Date().toISOString().split('T')[0],
      file_url: file_url || '',
      file_name: file_name || ''
    });
    res.json(data[0]);
  } catch (e) {
    res.status(500).json({ error: '공문 등록 실패' });
  }
});

router.patch('/support-docs/:id', authenticate, async (req, res) => {
  try {
    const { title, agency, deadline, description, is_limitless, date, file_url, file_name } = req.body;
    const data = await supabaseCall('PATCH', `support_docs?id=eq.${req.params.id}&user_id=eq.${req.user.id}`, {
      title, agency, deadline, description, is_limitless, date, file_url, file_name
    });
    res.json(data[0]);
  } catch (e) {
    res.status(500).json({ error: '공문 수정 실패' });
  }
});

router.delete('/support-docs/:id', authenticate, async (req, res) => {
  try {
    await supabaseCall('DELETE', `support_docs?id=eq.${req.params.id}&user_id=eq.${req.user.id}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '공문 삭제 실패' });
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

router.post('/reports', authenticate, async (req, res) => {
  try {
    const { title, company, type, content, date, reportType, version } = req.body;
    const data = await supabaseCall('POST', 'reports', {
      user_id: req.user.id,
      title,
      company,
      type,
      content: typeof content === 'string' ? content : JSON.stringify(content),
      date: date || new Date().toISOString().split('T')[0],
      reportType: reportType || 'management',
      version: version || 'client'
    });
    res.json(data[0]);
  } catch (e) {
    res.status(500).json({ error: '보고서 등록 실패' });
  }
});

router.patch('/reports/:id', authenticate, async (req, res) => {
  try {
    const { title, company, type, content, date } = req.body;
    const data = await supabaseCall('PATCH', `reports?id=eq.${req.params.id}&user_id=eq.${req.user.id}`, {
      title, company, type, content: typeof content === 'string' ? content : JSON.stringify(content), date
    });
    res.json(data[0]);
  } catch (e) {
    res.status(500).json({ error: '보고서 수정 실패' });
  }
});

router.delete('/reports/:id', authenticate, async (req, res) => {
  try {
    await supabaseCall('DELETE', `reports?id=eq.${req.params.id}&user_id=eq.${req.user.id}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '보고서 삭제 실패' });
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

router.post('/companies', authenticate, async (req, res) => {
  try {
    const { name, rep, bizNum, industry, coreItem, bizDate, empCount, date, revenueData } = req.body;
    const data = await supabaseCall('POST', 'companies', {
      user_id: req.user.id,
      name,
      rep: rep || '',
      bizNum: bizNum || '',
      industry: industry || '',
      coreItem: coreItem || '',
      bizDate: bizDate || '',
      empCount: empCount || '',
      date: date || new Date().toISOString().split('T')[0],
      revenueData: typeof revenueData === 'string' ? revenueData : JSON.stringify(revenueData || {})
    });
    res.json(data[0]);
  } catch (e) {
    res.status(500).json({ error: '업체 등록 실패' });
  }
});

router.patch('/companies/:id', authenticate, async (req, res) => {
  try {
    const { name, rep, bizNum, industry, coreItem, bizDate, empCount, date, revenueData } = req.body;
    const data = await supabaseCall('PATCH', `companies?id=eq.${req.params.id}&user_id=eq.${req.user.id}`, {
      name, rep, bizNum, industry, coreItem, bizDate, empCount, date,
      revenueData: typeof revenueData === 'string' ? revenueData : JSON.stringify(revenueData || {})
    });
    res.json(data[0]);
  } catch (e) {
    res.status(500).json({ error: '업체 수정 실패' });
  }
});

router.delete('/companies/:id', authenticate, async (req, res) => {
  try {
    await supabaseCall('DELETE', `companies?id=eq.${req.params.id}&user_id=eq.${req.user.id}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '업체 삭제 실패' });
  }
});

// ===== 헬스 체크 =====
router.get('/health', (req, res) => res.json({ status: 'ok' }));

// ===== 라우터 마운트 =====
app.use('/api', router);
app.use('/.netlify/functions/api', router);

module.exports.handler = serverless(app);
