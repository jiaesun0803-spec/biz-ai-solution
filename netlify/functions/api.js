const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const serverless = require('serverless-http');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xxtlorpinvkbzbkhgsgc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dGxvcnBpbnZrYnpia2hnc2djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1MDUzMiwiZXhwIjoyMDkyMzI2NTMyfQ.3Z7rha7XtYrXC-aWciaVnMobWcxkw0O-04CU-NxcWd8';
const JWT_SECRET = process.env.JWT_SECRET || 'biz-ai-solution-secret-2026';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
  if (!req.user?.is_admin) return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  next();
}

// ===== 인증 API =====

// 회원가입
app.post('/api/auth/signup', async (req, res) => {
  const { email, pw, name, dept, phone } = req.body;
  if (!email || !pw || !name) return res.status(400).json({ error: '필수 항목을 입력해주세요.' });

  const { data: existing } = await supabase.from('users').select('id').eq('email', email).single();
  if (existing) return res.status(409).json({ error: '이미 사용 중인 이메일입니다.' });

  const hashed = await bcrypt.hash(pw, 10);
  const { data, error } = await supabase.from('users').insert({
    email, pw: hashed, name, dept: dept || '', phone: phone || '',
    is_admin: false, approved: false
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: '가입 신청이 완료되었습니다. 관리자 승인 후 로그인 가능합니다.' });
});

// 로그인
app.post('/api/auth/login', async (req, res) => {
  const { email, pw } = req.body;
  if (!email || !pw) return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });

  const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
  if (error || !user) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });

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
    JWT_SECRET, { expiresIn: '7d' }
  );
  const { pw: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// 내 정보 조회
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const { data, error } = await supabase.from('users').select('id,email,name,dept,phone,api_key,is_admin,approved,created_at').eq('id', req.user.id).single();
  if (error) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  res.json(data);
});

// 내 정보 수정
app.put('/api/auth/me', authMiddleware, async (req, res) => {
  const { name, dept, phone, api_key } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (dept !== undefined) updates.dept = dept;
  if (phone !== undefined) updates.phone = phone;
  if (api_key !== undefined) updates.api_key = api_key;

  const { data, error } = await supabase.from('users').update(updates).eq('id', req.user.id).select('id,email,name,dept,phone,api_key,is_admin,approved').single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 비밀번호 변경
app.put('/api/auth/change-password', authMiddleware, async (req, res) => {
  const { current_pw, new_pw } = req.body;
  if (!current_pw || !new_pw) return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' });
  if (new_pw.length < 4) return res.status(400).json({ error: '새 비밀번호는 4자 이상이어야 합니다.' });

  const { data: user, error } = await supabase.from('users').select('id,pw').eq('id', req.user.id).single();
  if (error || !user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });

  let valid = false;
  if (user.pw && user.pw.startsWith('$2')) {
    valid = await bcrypt.compare(current_pw, user.pw);
  } else {
    valid = (current_pw === user.pw);
  }
  if (!valid) return res.status(401).json({ error: '현재 비밀번호가 일치하지 않습니다.' });

  const hashed = await bcrypt.hash(new_pw, 10);
  const { error: updateError } = await supabase.from('users').update({ pw: hashed }).eq('id', req.user.id);
  if (updateError) return res.status(500).json({ error: updateError.message });

  res.json({ message: '비밀번호가 변경되었습니다.' });
});

// ===== 관리자 API =====

// 전체 사용자 목록
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  const { data, error } = await supabase.from('users').select('id,email,name,dept,phone,is_admin,approved,created_at,approved_at').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 가입 승인
app.put('/api/admin/users/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
  const { data, error } = await supabase.from('users').update({ approved: true, approved_at: new Date().toISOString() }).eq('id', req.params.id).select('id,email,name,approved').single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 가입 거절
app.put('/api/admin/users/:id/reject', authMiddleware, adminMiddleware, async (req, res) => {
  const { data, error } = await supabase.from('users').update({ approved: false, approved_at: null }).eq('id', req.params.id).select('id,email,name,approved').single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 사용자 삭제
app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { error } = await supabase.from('users').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: '삭제되었습니다.' });
});

// 통계
app.get('/api/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
  const [users, pending, approved, reports] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('approved', false).eq('is_admin', false),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('approved', true).eq('is_admin', false),
    supabase.from('reports').select('id', { count: 'exact', head: true })
  ]);
  res.json({
    total: users.count || 0,
    pending: pending.count || 0,
    approved: approved.count || 0,
    reports: reports.count || 0
  });
});


// ===== 업체 데이터 API (사용자별 서버 저장) =====
// 업체 목록 조회
app.get('/api/companies', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', req.user.id)
    .order('updated_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// 업체 단건 조회
app.get('/api/companies/:id', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();
  if (error) return res.status(404).json({ error: '업체를 찾을 수 없습니다.' });
  res.json(data);
});

// 업체 등록
app.post('/api/companies', authMiddleware, async (req, res) => {
  const payload = { ...req.body, user_id: req.user.id, updated_at: new Date().toISOString() };
  // name 중복 체크 (같은 사용자 내)
  const { data: existing } = await supabase
    .from('companies')
    .select('id')
    .eq('user_id', req.user.id)
    .eq('name', payload.name)
    .single();
  if (existing) return res.status(409).json({ error: '이미 등록된 업체명입니다.' });
  const { data, error } = await supabase.from('companies').insert(payload).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// 업체 수정 (name 기준 upsert)
app.put('/api/companies/:id', authMiddleware, async (req, res) => {
  const payload = { ...req.body, updated_at: new Date().toISOString() };
  delete payload.id;
  delete payload.user_id;
  const { data, error } = await supabase
    .from('companies')
    .update(payload)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 업체 삭제
app.delete('/api/companies/:id', authMiddleware, async (req, res) => {
  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: '삭제되었습니다.' });
});

// 업체 전체 동기화 (로컬 → 서버 일괄 업로드용)
app.post('/api/companies/sync', authMiddleware, async (req, res) => {
  const { companies } = req.body;
  if (!Array.isArray(companies)) return res.status(400).json({ error: 'companies 배열이 필요합니다.' });
  const results = [];
  for (const c of companies) {
    const payload = { ...c, user_id: req.user.id, updated_at: new Date().toISOString() };
    delete payload.id;
    // name 기준 upsert
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('name', c.name)
      .single();
    if (existing) {
      const { data } = await supabase.from('companies').update(payload).eq('id', existing.id).select().single();
      results.push(data);
    } else {
      const { data } = await supabase.from('companies').insert(payload).select().single();
      results.push(data);
    }
  }
  res.json(results);
});

// 헬스체크
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

module.exports.handler = serverless(app);
