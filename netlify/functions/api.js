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
    console.log(`[Supabase] ${method} ${path}`, data ? JSON.stringify(data).substring(0, 100) : '');
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
    console.log(`[Supabase] ✅ 성공 (${res.status}):`, Array.isArray(res.data) ? `${res.data.length}개 항목` : '응답 수신');
    return res.data;
  } catch (e) {
    console.error(`[Supabase] ❌ 오류: ${e.message}`, e.response?.data);
    throw e;
  }
};

// ===== 인증 미들웨어 =====
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  console.log(`[Auth] 토큰 확인: ${token ? '있음' : '없음'}`);
  if (!token) return res.status(401).json({ error: '토큰이 없습니다.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log(`[Auth] ✅ 토큰 검증 성공: user_id=${decoded.id}`);
    req.user = decoded;
    next();
  } catch (e) {
    console.error(`[Auth] ❌ 토큰 검증 실패: ${e.message}`);
    res.status(401).json({ error: '토큰이 유효하지 않습니다.' });
  }
};

// ===== 로그인 =====
router.post('/auth/login', async (req, res) => {
  try {
    const { email, pw } = req.body;
    console.log(`[Login] 시도: ${email}`);
    
    // 1. 관리자 계정 강제 복구 및 데이터 연결
    if (email === "admin@bizconsult.com" && pw === "Admin1234!") {
      console.log('[Login] 관리자 계정 감지');
      const hashed = await bcrypt.hash(pw, 10);
      const users = await supabaseCall('POST', 'users?on_conflict=email', {
        email, pw: hashed, name: "관리자", is_admin: true, is_approved: true, dept: "본사", phone: "010-0000-0000"
      });
      const adminUser = users[0];
      console.log(`[Login] 관리자 사용자 ID: ${adminUser.id}`);

      // 모든 기존 데이터 소유권 이전 (데이터 복구)
      const tables = ['reports', 'support_docs', 'notices', 'companies'];
      for (const table of tables) {
        try {
          console.log(`[DataRecovery] ${table} 소유권 이전 중...`);
          await axios({
            method: 'PATCH',
            url: `${SUPABASE_URL}/rest/v1/${table}?or=(user_id.neq.${adminUser.id},user_id.is.null)`,
            headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` },
            data: { user_id: adminUser.id }
          });
          console.log(`[DataRecovery] ✅ ${table} 완료`);
        } catch (e) {
          console.warn(`[DataRecovery] ⚠️ ${table} 실패:`, e.message);
        }
      }

      const token = jwt.sign({ id: adminUser.id, email, is_admin: true }, JWT_SECRET, { expiresIn: '7d' });
      console.log(`[Login] ✅ 관리자 로그인 성공`);
      return res.json({ token, user: adminUser });
    }

    // 2. 일반 사용자 로그인
    console.log('[Login] 일반 사용자 로그인 시도');
    const users = await supabaseCall('GET', `users?email=eq.${email}`);
    const user = users[0];
    if (!user) {
      console.log('[Login] ❌ 사용자를 찾을 수 없음');
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }
    
    const match = await bcrypt.compare(pw, user.pw);
    if (!match) {
      console.log('[Login] ❌ 비밀번호 불일치');
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }
    
    if (!user.is_approved) {
      console.log('[Login] ❌ 승인 대기 중');
      return res.status(403).json({ error: '관리자 승인 대기 중입니다.' });
    }
    
    const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });
    console.log(`[Login] ✅ 사용자 로그인 성공: ${user.id}`);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin } });
  } catch (err) {
    console.error('[Login] ❌ 오류:', err.message);
    res.status(500).json({ error: '서버 오류: ' + err.message });
  }
});

// ===== 공지사항 API =====
router.get('/notices', authenticate, async (req, res) => {
  try {
    console.log(`[Notices GET] user_id=${req.user.id}`);
    const data = await supabaseCall('GET', `notices?user_id=eq.${req.user.id}&order=created_at.desc`);
    console.log(`[Notices GET] ✅ ${data.length}개 반환`);
    res.json(data || []);
  } catch (e) {
    console.error('[Notices GET] ❌ 오류:', e.message);
    res.status(500).json({ error: '공지사항 조회 실패' });
  }
});

router.post('/notices', authenticate, async (req, res) => {
  try {
    const { title, content, category, date, is_pinned } = req.body;
    console.log(`[Notices POST] user_id=${req.user.id}, title=${title}`);
    const data = await supabaseCall('POST', 'notices', {
      user_id: req.user.id,
      title,
      content,
      category: category || '공지',
      date: date || new Date().toISOString().split('T')[0],
      is_pinned: is_pinned || false
    });
    console.log(`[Notices POST] ✅ 생성됨: id=${data[0].id}`);
    res.json(data[0]);
  } catch (e) {
    console.error('[Notices POST] ❌ 오류:', e.message);
    res.status(500).json({ error: '공지사항 등록 실패' });
  }
});

router.patch('/notices/:id', authenticate, async (req, res) => {
  try {
    const { title, content, category, date, is_pinned } = req.body;
    console.log(`[Notices PATCH] id=${req.params.id}, user_id=${req.user.id}`);
    const data = await supabaseCall('PATCH', `notices?id=eq.${req.params.id}&user_id=eq.${req.user.id}`, {
      title, content, category, date, is_pinned
    });
    console.log(`[Notices PATCH] ✅ 수정됨`);
    res.json(data[0]);
  } catch (e) {
    console.error('[Notices PATCH] ❌ 오류:', e.message);
    res.status(500).json({ error: '공지사항 수정 실패' });
  }
});

router.delete('/notices/:id', authenticate, async (req, res) => {
  try {
    console.log(`[Notices DELETE] id=${req.params.id}, user_id=${req.user.id}`);
    await supabaseCall('DELETE', `notices?id=eq.${req.params.id}&user_id=eq.${req.user.id}`);
    console.log(`[Notices DELETE] ✅ 삭제됨`);
    res.json({ success: true });
  } catch (e) {
    console.error('[Notices DELETE] ❌ 오류:', e.message);
    res.status(500).json({ error: '공지사항 삭제 실패' });
  }
});

// ===== 지원사업공문 API =====
router.get('/support-docs', authenticate, async (req, res) => {
  try {
    console.log(`[SupportDocs GET] user_id=${req.user.id}`);
    const data = await supabaseCall('GET', `support_docs?user_id=eq.${req.user.id}&order=created_at.desc`);
    console.log(`[SupportDocs GET] ✅ ${data.length}개 반환`);
    res.json(data || []);
  } catch (e) {
    console.error('[SupportDocs GET] ❌ 오류:', e.message);
    res.status(500).json({ error: '공문 조회 실패' });
  }
});

router.post('/support-docs', authenticate, async (req, res) => {
  try {
    const { title, agency, deadline, description, is_limitless, date, file_url, file_name } = req.body;
    console.log(`[SupportDocs POST] user_id=${req.user.id}, title=${title}`);
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
    console.log(`[SupportDocs POST] ✅ 생성됨: id=${data[0].id}`);
    res.json(data[0]);
  } catch (e) {
    console.error('[SupportDocs POST] ❌ 오류:', e.message);
    res.status(500).json({ error: '공문 등록 실패' });
  }
});

router.patch('/support-docs/:id', authenticate, async (req, res) => {
  try {
    const { title, agency, deadline, description, is_limitless, date, file_url, file_name } = req.body;
    console.log(`[SupportDocs PATCH] id=${req.params.id}, user_id=${req.user.id}`);
    const data = await supabaseCall('PATCH', `support_docs?id=eq.${req.params.id}&user_id=eq.${req.user.id}`, {
      title, agency, deadline, description, is_limitless, date, file_url, file_name
    });
    console.log(`[SupportDocs PATCH] ✅ 수정됨`);
    res.json(data[0]);
  } catch (e) {
    console.error('[SupportDocs PATCH] ❌ 오류:', e.message);
    res.status(500).json({ error: '공문 수정 실패' });
  }
});

router.delete('/support-docs/:id', authenticate, async (req, res) => {
  try {
    console.log(`[SupportDocs DELETE] id=${req.params.id}, user_id=${req.user.id}`);
    await supabaseCall('DELETE', `support_docs?id=eq.${req.params.id}&user_id=eq.${req.user.id}`);
    console.log(`[SupportDocs DELETE] ✅ 삭제됨`);
    res.json({ success: true });
  } catch (e) {
    console.error('[SupportDocs DELETE] ❌ 오류:', e.message);
    res.status(500).json({ error: '공문 삭제 실패' });
  }
});

// ===== 보고서 API =====
router.get('/reports', authenticate, async (req, res) => {
  try {
    console.log(`[Reports GET] user_id=${req.user.id}`);
    const data = await supabaseCall('GET', `reports?user_id=eq.${req.user.id}&order=created_at.desc`);
    console.log(`[Reports GET] ✅ ${data.length}개 반환`);
    res.json(data || []);
  } catch (e) {
    console.error('[Reports GET] ❌ 오류:', e.message);
    res.status(500).json({ error: '보고서 조회 실패' });
  }
});

router.post('/reports', authenticate, async (req, res) => {
  try {
    const { title, company, type, content, date, reportType, version } = req.body;
    console.log(`[Reports POST] user_id=${req.user.id}, title=${title}`);
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
    console.log(`[Reports POST] ✅ 생성됨: id=${data[0].id}`);
    res.json(data[0]);
  } catch (e) {
    console.error('[Reports POST] ❌ 오류:', e.message);
    res.status(500).json({ error: '보고서 등록 실패' });
  }
});

router.patch('/reports/:id', authenticate, async (req, res) => {
  try {
    const { title, company, type, content, date } = req.body;
    console.log(`[Reports PATCH] id=${req.params.id}, user_id=${req.user.id}`);
    const data = await supabaseCall('PATCH', `reports?id=eq.${req.params.id}&user_id=eq.${req.user.id}`, {
      title, company, type, content: typeof content === 'string' ? content : JSON.stringify(content), date
    });
    console.log(`[Reports PATCH] ✅ 수정됨`);
    res.json(data[0]);
  } catch (e) {
    console.error('[Reports PATCH] ❌ 오류:', e.message);
    res.status(500).json({ error: '보고서 수정 실패' });
  }
});

router.delete('/reports/:id', authenticate, async (req, res) => {
  try {
    console.log(`[Reports DELETE] id=${req.params.id}, user_id=${req.user.id}`);
    await supabaseCall('DELETE', `reports?id=eq.${req.params.id}&user_id=eq.${req.user.id}`);
    console.log(`[Reports DELETE] ✅ 삭제됨`);
    res.json({ success: true });
  } catch (e) {
    console.error('[Reports DELETE] ❌ 오류:', e.message);
    res.status(500).json({ error: '보고서 삭제 실패' });
  }
});

// ===== 업체 관리 API =====
router.get('/companies', authenticate, async (req, res) => {
  try {
    console.log(`[Companies GET] user_id=${req.user.id}`);
    const data = await supabaseCall('GET', `companies?user_id=eq.${req.user.id}&order=created_at.desc`);
    console.log(`[Companies GET] ✅ ${data.length}개 반환`);
    res.json(data || []);
  } catch (e) {
    console.error('[Companies GET] ❌ 오류:', e.message);
    res.status(500).json({ error: '업체 조회 실패' });
  }
});

router.post('/companies', authenticate, async (req, res) => {
  try {
    const { name, rep, bizNum, industry, coreItem, bizDate, empCount, date, revenueData } = req.body;
    console.log(`[Companies POST] user_id=${req.user.id}, name=${name}`);
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
    console.log(`[Companies POST] ✅ 생성됨: id=${data[0].id}`);
    res.json(data[0]);
  } catch (e) {
    console.error('[Companies POST] ❌ 오류:', e.message);
    res.status(500).json({ error: '업체 등록 실패' });
  }
});

router.patch('/companies/:id', authenticate, async (req, res) => {
  try {
    const { name, rep, bizNum, industry, coreItem, bizDate, empCount, date, revenueData } = req.body;
    console.log(`[Companies PATCH] id=${req.params.id}, user_id=${req.user.id}`);
    const data = await supabaseCall('PATCH', `companies?id=eq.${req.params.id}&user_id=eq.${req.user.id}`, {
      name, rep, bizNum, industry, coreItem, bizDate, empCount, date,
      revenueData: typeof revenueData === 'string' ? revenueData : JSON.stringify(revenueData || {})
    });
    console.log(`[Companies PATCH] ✅ 수정됨`);
    res.json(data[0]);
  } catch (e) {
    console.error('[Companies PATCH] ❌ 오류:', e.message);
    res.status(500).json({ error: '업체 수정 실패' });
  }
});

router.delete('/companies/:id', authenticate, async (req, res) => {
  try {
    console.log(`[Companies DELETE] id=${req.params.id}, user_id=${req.user.id}`);
    await supabaseCall('DELETE', `companies?id=eq.${req.params.id}&user_id=eq.${req.user.id}`);
    console.log(`[Companies DELETE] ✅ 삭제됨`);
    res.json({ success: true });
  } catch (e) {
    console.error('[Companies DELETE] ❌ 오류:', e.message);
    res.status(500).json({ error: '업체 삭제 실패' });
  }
});

// ===== 헬스 체크 =====
router.get('/health', (req, res) => {
  console.log('[Health] 체크 요청');
  res.json({ status: 'ok' });
});

// ===== 라우터 마운트 =====
app.use('/api', router);
app.use('/.netlify/functions/api', router);

console.log('[Server] API 서버 초기화 완료');

module.exports.handler = serverless(app);
