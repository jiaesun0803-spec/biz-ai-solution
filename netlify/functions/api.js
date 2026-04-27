const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const serverless = require('serverless-http');
const axios = require('axios');
const cheerio = require('cheerio');

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
    JWT_SECRET, { expiresIn: '30d' }
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

// 비밀번호 초기화 (관리자만)
app.post('/api/admin/users/:id/reset-password', authMiddleware, adminMiddleware, async (req, res) => {
  const bcrypt = require('bcryptjs');
  const defaultPw = req.body.new_password || 'User1234!';
  const hash = await bcrypt.hash(defaultPw, 10);
  const { data, error } = await supabase
    .from('users')
    .update({ pw: hash })
    .eq('id', req.params.id)
    .select('id,email,name')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, message: `${data.name}(${data.email}) 비밀번호가 초기화되었습니다.`, email: data.email, name: data.name });
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
  const c = req.body;
  const name = c.name;
  if (!name) return res.status(400).json({ error: '업체명이 필요합니다.' });
  // name 중복 체크 (같은 사용자 내)
  const { data: existing } = await supabase
    .from('companies')
    .select('id')
    .eq('user_id', req.user.id)
    .eq('name', name)
    .single();
  if (existing) return res.status(409).json({ error: '이미 등록된 업체명입니다.' });
  const payload = {
    name,
    user_id: req.user.id,
    reg_no: c.bizNum || '',
    corp_no: c.corpNum || '',
    address: c.address || '',
    industry: c.industry || '',
    rep_name: c.rep || '',
    export: c.exportStatus || '',
    certs: c.certs || '',
    revenue_prev: parseInt((c.revenueData?.[0]?.revenue || '0').replace(/[^0-9]/g,'')) || 0,
    revenue_cur: parseInt((c.revenueData?.[1]?.revenue || c.revenueData?.[0]?.revenue || '0').replace(/[^0-9]/g,'')) || 0,
    employees: parseInt(c.empCount) || 0,
    founded: c.bizDate || '',
    date: c.date || new Date().toISOString().split('T')[0],
    extra: c,
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabase.from('companies').insert(payload).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// 업체 수정 (name 기준 upsert)
app.put('/api/companies/:id', authMiddleware, async (req, res) => {
  const c = req.body;
  const name = c.name;
  const payload = {
    name,
    reg_no: c.bizNum || '',
    corp_no: c.corpNum || '',
    address: c.address || '',
    industry: c.industry || '',
    rep_name: c.rep || '',
    export: c.exportStatus || '',
    certs: c.certs || '',
    revenue_prev: parseInt((c.revenueData?.[0]?.revenue || '0').replace(/[^0-9]/g,'')) || 0,
    revenue_cur: parseInt((c.revenueData?.[1]?.revenue || c.revenueData?.[0]?.revenue || '0').replace(/[^0-9]/g,'')) || 0,
    employees: parseInt(c.empCount) || 0,
    founded: c.bizDate || '',
    date: c.date || new Date().toISOString().split('T')[0],
    extra: c,
    updated_at: new Date().toISOString()
  };
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
    const name = c.name;
    if (!name) continue;
    const payload = {
      name,
      user_id: req.user.id,
      reg_no: c.bizNum || '',
      corp_no: c.corpNum || '',
      address: c.address || '',
      industry: c.industry || '',
      rep_name: c.rep || '',
      export: c.exportStatus || '',
      certs: c.certs || '',
      revenue_prev: parseInt((c.revenueData?.[0]?.revenue || '0').replace(/[^0-9]/g,'')) || 0,
      revenue_cur: parseInt((c.revenueData?.[1]?.revenue || c.revenueData?.[0]?.revenue || '0').replace(/[^0-9]/g,'')) || 0,
      employees: parseInt(c.empCount) || 0,
      founded: c.bizDate || '',
      date: c.date || new Date().toISOString().split('T')[0],
      extra: c,
      updated_at: new Date().toISOString()
    };
    // name 기준 upsert
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('name', name)
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

// ===== 보고서 API =====
// 테이블 콜럼: id(uuid), user_id(uuid), company_id(nullable), type(text), title(text), html(text), data(jsonb), created_at

// 보고서 목록 조회
app.get('/api/reports', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  // data.jsonb에서 프론트엔드 형식으로 변환
  const result = (data || []).map(function(row) {
    const d = row.data || {};
    return {
      id: d.id || row.id,
      _dbId: row.id,
      type: d.type || row.type || '',
      company: d.company || '',
      title: d.title || row.title || '',
      date: d.date || row.created_at ? (row.created_at||'').split('T')[0] : '',
      content: d.content || '',
      version: d.version || 'client',
      reportType: d.reportType || '',
      revenueData: d.revenueData || {}
    };
  });
  res.json(result);
});

// 보고서 저장
app.post('/api/reports', authMiddleware, async (req, res) => {
  const r = req.body;
  if (!r.type || !r.company) return res.status(400).json({ error: '필수 항목 누락' });
  const payload = {
    user_id: req.user.id,
    type: r.type || '',
    title: r.title || '',
    html: '',  // html은 프론트엔드에서 렌더링하므로 비움
    data: r    // 보고서 전체 데이터를 data jsonb에 저장
  };
  const { data, error } = await supabase.from('reports').insert(payload).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ success: true, _dbId: data.id });
});

// 보고서 삭제 (data.id 기준으로 조회 후 삭제)
app.delete('/api/reports/:reportId', authMiddleware, async (req, res) => {
  // data jsonb 내 id 필드로 검색
  const { data: rows, error: findErr } = await supabase
    .from('reports')
    .select('id')
    .eq('user_id', req.user.id)
    .filter('data->>id', 'eq', req.params.reportId);
  if (findErr) return res.status(500).json({ error: findErr.message });
  if (!rows || rows.length === 0) return res.status(404).json({ error: '보고서를 찾을 수 없음' });
  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', rows[0].id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// 헬스체크

// ===== 공지사항 API (모든 인증된 사용자 조회, 관리자만 등록/삭제) =====

// 공지사항 초기화 (테이블 없을 경우 자동 생성)
async function ensureNoticesTable() {
  // Supabase REST API로는 DDL 불가 - 테이블 존재 확인만
  try {
    const { data, error } = await supabase.from('notices').select('id').limit(1);
    return !error;
  } catch(e) { return false; }
}

// 공지사항 목록 조회 (로그인 사용자 모두 가능)
app.get('/api/notices', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// 공지사항 등록 (관리자만)
app.post('/api/notices', authMiddleware, adminMiddleware, async (req, res) => {
  const { title, category, date, description } = req.body;
  if (!title) return res.status(400).json({ error: '제목을 입력해주세요.' });
  const { data, error } = await supabase
    .from('notices')
    .insert({ title, category: category || '공지', date: date || new Date().toISOString().slice(0,10), description: description || '' })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 공지사항 삭제 (관리자만)
app.delete('/api/notices/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { error } = await supabase
    .from('notices')
    .delete()
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// 공지사항 수정 (관리자만)
app.patch('/api/notices/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { title, category, date, description, is_pinned } = req.body;
  const updates = {};
  if (title !== undefined) updates.title = title;
  if (category !== undefined) updates.category = category;
  if (date !== undefined) updates.date = date;
  if (description !== undefined) updates.description = description;
  if (is_pinned !== undefined) updates.is_pinned = is_pinned;
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: '수정할 내용이 없습니다.' });
  const { data, error } = await supabase
    .from('notices')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ===== 지원사업공문 API (모든 인증된 사용자 조회, 관리자만 등록/삭제) =====

// 지원사업공문 목록 조회
app.get('/api/support-docs', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('support_docs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// 지원사업공문 등록 (관리자만)
app.post('/api/support-docs', authMiddleware, adminMiddleware, async (req, res) => {
  const { title, category, date, deadline, description, file_name, file_url } = req.body;
  if (!title) return res.status(400).json({ error: '제목을 입력해주세요.' });
  const { data, error } = await supabase
    .from('support_docs')
    .insert({
      title,
      category: category || '공문',
      date: date || new Date().toISOString().slice(0,10),
      deadline: deadline || null,
      description: description || '',
      file_name: file_name || null,
      file_url: file_url || null
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 지원사업공문 삭제 (관리자만)
app.delete('/api/support-docs/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const { error } = await supabase
    .from('support_docs')
    .delete()
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ── URL 크롤링 API ──
app.post('/api/crawl-url', authMiddleware, adminMiddleware, async (req, res) => {
  const { url } = req.body;
  if (!url || !url.startsWith('http')) return res.status(400).json({ error: '올바른 URL을 입력해주세요.' });
  try {
    const response = await axios.get(url, {
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
      },
      maxRedirects: 5
    });
    const $ = cheerio.load(response.data);
    $('script, style, nav, header, footer, iframe, .gnb, .lnb, .snb, #header, #footer, #nav, .navigation, .sidebar, .ad, .banner').remove();

    // 제목 추출
    let title = '';
    const titleSelectors = ['.view-title','.board-title','.post-title','.detail-title','.bbs-title','h1.title','h2.title','h3.title','.subject','.tit','.board_view_title','.view_title','.content-title','h1','h2'];
    for (const sel of titleSelectors) {
      const t = $(sel).first().text().trim();
      if (t && t.length > 3 && t.length < 200) { title = t; break; }
    }
    if (!title) title = $('title').text().replace(/[|\-–—].*$/, '').trim();
    if (!title) title = $('meta[property="og:title"]').attr('content') || '';

    // 기관명 추출
    let agency = '';
    const agencySelectors = ['.organization','.agency','.dept','.writer','.author','.board-writer','.view-writer'];
    for (const sel of agencySelectors) {
      const el = $(sel).first();
      const t = el.attr('content') || el.text().trim();
      if (t && t.length > 1 && t.length < 50) { agency = t; break; }
    }
    if (!agency) {
      const u = url.toLowerCase();
      if (u.includes('mss.go.kr')) agency = '중소벤처기업부';
      else if (u.includes('sbiz.or.kr') || u.includes('sbc.or.kr')) agency = '소상공인시장진흥공단';
      else if (u.includes('kosmes.or.kr') || u.includes('smes.go.kr')) agency = '중소벤처기업진흥공단';
      else if (u.includes('kibo.or.kr')) agency = '기술보증기금';
      else if (u.includes('kodit.or.kr')) agency = '신용보증기금';
      else if (u.includes('bizinfo.go.kr')) agency = '기업마당';
      else if (u.includes('gov.kr')) agency = '정부기관';
    }

    // 마감일 추출
    let deadline = '';
    const bodyText = $('body').text();
    const deadlinePatterns = [
      /접수\s*마감\s*[:\s]*([\d]{4}[.\-/년]\s*[\d]{1,2}[.\-/월]\s*[\d]{1,2})/,
      /신청\s*마감\s*[:\s]*([\d]{4}[.\-/년]\s*[\d]{1,2}[.\-/월]\s*[\d]{1,2})/,
      /마감일\s*[:\s]*([\d]{4}[.\-/년]\s*[\d]{1,2}[.\-/월]\s*[\d]{1,2})/,
      /접수기간.*?~\s*([\d]{4}[.\-/년]\s*[\d]{1,2}[.\-/월]\s*[\d]{1,2})/,
      /모집기간.*?~\s*([\d]{4}[.\-/년]\s*[\d]{1,2}[.\-/월]\s*[\d]{1,2})/
    ];
    for (const pattern of deadlinePatterns) {
      const m = bodyText.match(pattern);
      if (m) {
        let raw = m[1].replace(/[년월일\s]/g, '-').replace(/-+/g, '-').replace(/-$/, '');
        const parts = raw.split('-').filter(Boolean);
        if (parts.length >= 3) deadline = parts[0] + '-' + parts[1].padStart(2,'0') + '-' + parts[2].padStart(2,'0');
        break;
      }
    }

    // 본문 내용 추출
    let description = '';
    const contentSelectors = ['.view-content','.board-content','.post-content','.detail-content','.bbs-content','.board_view_content','.view_content','.content-body','.article-body','.entry-content','#content','.contents','.cont'];
    for (const sel of contentSelectors) {
      const el = $(sel).first();
      if (el.length) { description = el.text().replace(/\s+/g, ' ').trim().slice(0, 1500); break; }
    }
    if (!description) description = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 1500);

    res.json({ success: true, title: title.slice(0,200), agency: agency.slice(0,100), deadline, description: description.slice(0,1500), source_url: url });
  } catch (err) {
    const status = err.response ? err.response.status : 0;
    const msg = (status === 403 || status === 401)
      ? '해당 페이지는 접근이 제한되어 있습니다. 수동으로 내용을 입력해주세요.'
      : '페이지를 불러올 수 없습니다: ' + err.message;
    res.json({ success: false, error: msg, title: '', agency: '', deadline: '', description: '', source_url: url });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

module.exports.handler = serverless(app);
