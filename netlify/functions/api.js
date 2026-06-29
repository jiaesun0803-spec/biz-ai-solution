const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const router = express.Router();

app.use(cors({ origin: '*' }));
app.use(express.json());

const JWT_SECRET = 'biz-consult-secret-key-2024';

// ─── 인메모리 데이터 저장소 (Supabase 없이 작동) ───────────────────────────
// 관리자 계정 (고정)
const ADMIN_USER = {
  id: 'admin-001',
  email: 'admin@bizconsult.com',
  name: '관리자',
  role: 'admin',
  status: 'approved',
  department: '시스템 관리자',
  created_at: '2024-01-01T00:00:00.000Z'
};

// 회원 목록 (메모리 저장 - Netlify 함수는 상태 비저장이므로 재시작 시 초기화됨)
// 실제 운영을 위해서는 외부 DB가 필요하지만, 현재는 로그인 기능 복구에 집중
let users = [ADMIN_USER];
let notices = [];
let supportDocs = [];
let reports = [];
let companies = [];

// ─── 인증 미들웨어 ────────────────────────────────────────────────────────
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

// ─── 로그인 ───────────────────────────────────────────────────────────────
router.post('/auth/login', async (req, res) => {
  try {
    const { email, pw } = req.body;
    console.log(`[Login Attempt] email: ${email}`);

    if (!email || !pw) {
      return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
    }

    // 관리자 계정 직접 인증 (DB 없이)
    if (email === 'admin@bizconsult.com' && pw === 'Admin1234!') {
      const token = jwt.sign(
        { id: ADMIN_USER.id, email: ADMIN_USER.email, role: 'admin', is_admin: true, name: ADMIN_USER.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      console.log(`[Login Success] Admin login: ${email}`);
      return res.json({ token, user: ADMIN_USER });
    }

    // 일반 회원 인증
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 비밀번호 확인 (bcrypt 해시 또는 평문)
    let passwordMatch = false;
    if (user.pw) {
      try {
        passwordMatch = await bcrypt.compare(pw, user.pw);
      } catch (e) {
        passwordMatch = (pw === user.pw);
      }
    }

    if (!passwordMatch) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    if (user.status !== 'approved') {
      return res.status(403).json({ error: '관리자 승인 대기 중입니다. 관리자에게 문의해주세요.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, is_admin: user.role === 'admin', name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`[Login Success] User login: ${email}`);
    res.json({ token, user: { ...user, pw: undefined } });

  } catch (err) {
    console.error('[Login Error]', err.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다: ' + err.message });
  }
});

// ─── 회원가입 ─────────────────────────────────────────────────────────────
router.post('/auth/register', async (req, res) => {
  try {
    const { email, pw, name, department } = req.body;

    if (!email || !pw || !name) {
      return res.status(400).json({ error: '필수 정보를 입력해주세요.' });
    }

    const existing = users.find(u => u.email === email);
    if (existing) {
      return res.status(409).json({ error: '이미 등록된 이메일입니다.' });
    }

    const hashedPw = await bcrypt.hash(pw, 10);
    const newUser = {
      id: `user-${Date.now()}`,
      email,
      pw: hashedPw,
      name,
      department: department || '',
      role: 'user',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    console.log(`[Register] New user: ${email}`);
    res.json({ message: '회원가입이 완료되었습니다. 관리자 승인 후 로그인 가능합니다.', user: { ...newUser, pw: undefined } });

  } catch (err) {
    console.error('[Register Error]', err.message);
    res.status(500).json({ error: '서버 오류: ' + err.message });
  }
});

// ─── 회원 관리 (관리자 전용) ──────────────────────────────────────────────
router.get('/users', authenticate, (req, res) => {
  try {
    const userList = users.map(u => ({ ...u, pw: undefined }));
    console.log(`[Users] Returning ${userList.length} users`);
    res.json(userList);
  } catch (e) {
    res.status(500).json({ error: '사용자 조회 실패' });
  }
});

router.patch('/users/:id/approve', authenticate, (req, res) => {
  try {
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    user.status = 'approved';
    res.json({ ...user, pw: undefined });
  } catch (e) {
    res.status(500).json({ error: '승인 처리 실패' });
  }
});

router.patch('/users/:id/reject', authenticate, (req, res) => {
  try {
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    user.status = 'rejected';
    res.json({ ...user, pw: undefined });
  } catch (e) {
    res.status(500).json({ error: '거절 처리 실패' });
  }
});

router.delete('/users/:id', authenticate, (req, res) => {
  try {
    const idx = users.findIndex(u => u.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    users.splice(idx, 1);
    res.json({ message: '삭제 완료' });
  } catch (e) {
    res.status(500).json({ error: '삭제 실패' });
  }
});

// ─── 공지사항 ─────────────────────────────────────────────────────────────
router.get('/notices', authenticate, (req, res) => {
  res.json([...notices].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

router.post('/notices', authenticate, (req, res) => {
  try {
    const notice = {
      id: `notice-${Date.now()}`,
      ...req.body,
      user_id: req.user.id,
      author: req.user.name || req.user.email,
      created_at: new Date().toISOString()
    };
    notices.push(notice);
    res.json(notice);
  } catch (e) {
    res.status(500).json({ error: '공지사항 등록 실패' });
  }
});

router.patch('/notices/:id', authenticate, (req, res) => {
  try {
    const notice = notices.find(n => n.id === req.params.id);
    if (!notice) return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' });
    Object.assign(notice, req.body, { updated_at: new Date().toISOString() });
    res.json(notice);
  } catch (e) {
    res.status(500).json({ error: '공지사항 수정 실패' });
  }
});

router.delete('/notices/:id', authenticate, (req, res) => {
  try {
    const idx = notices.findIndex(n => n.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' });
    notices.splice(idx, 1);
    res.json({ message: '삭제 완료' });
  } catch (e) {
    res.status(500).json({ error: '공지사항 삭제 실패' });
  }
});

// ─── 지원사업 공문 ────────────────────────────────────────────────────────
router.get('/support-docs', authenticate, (req, res) => {
  res.json([...supportDocs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

router.post('/support-docs', authenticate, (req, res) => {
  try {
    const doc = {
      id: `doc-${Date.now()}`,
      ...req.body,
      user_id: req.user.id,
      author: req.user.name || req.user.email,
      created_at: new Date().toISOString()
    };
    supportDocs.push(doc);
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: '공문 등록 실패' });
  }
});

router.patch('/support-docs/:id', authenticate, (req, res) => {
  try {
    const doc = supportDocs.find(d => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: '공문을 찾을 수 없습니다.' });
    Object.assign(doc, req.body, { updated_at: new Date().toISOString() });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: '공문 수정 실패' });
  }
});

router.delete('/support-docs/:id', authenticate, (req, res) => {
  try {
    const idx = supportDocs.findIndex(d => d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: '공문을 찾을 수 없습니다.' });
    supportDocs.splice(idx, 1);
    res.json({ message: '삭제 완료' });
  } catch (e) {
    res.status(500).json({ error: '공문 삭제 실패' });
  }
});

// ─── 보고서 ───────────────────────────────────────────────────────────────
router.get('/reports', authenticate, (req, res) => {
  const userReports = req.user.role === 'admin'
    ? reports
    : reports.filter(r => r.user_id === req.user.id);
  res.json([...userReports].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

router.post('/reports', authenticate, (req, res) => {
  try {
    const report = {
      id: `report-${Date.now()}`,
      ...req.body,
      user_id: req.user.id,
      author: req.user.name || req.user.email,
      created_at: new Date().toISOString()
    };
    reports.push(report);
    res.json(report);
  } catch (e) {
    res.status(500).json({ error: '보고서 등록 실패' });
  }
});

router.delete('/reports/:id', authenticate, (req, res) => {
  try {
    const idx = reports.findIndex(r => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: '보고서를 찾을 수 없습니다.' });
    reports.splice(idx, 1);
    res.json({ message: '삭제 완료' });
  } catch (e) {
    res.status(500).json({ error: '보고서 삭제 실패' });
  }
});

// ─── 업체 관리 ────────────────────────────────────────────────────────────
router.get('/companies', authenticate, (req, res) => {
  const userCompanies = req.user.role === 'admin'
    ? companies
    : companies.filter(c => c.user_id === req.user.id);
  res.json([...userCompanies].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
});

router.post('/companies', authenticate, (req, res) => {
  try {
    const company = {
      id: `company-${Date.now()}`,
      ...req.body,
      user_id: req.user.id,
      created_at: new Date().toISOString()
    };
    companies.push(company);
    res.json(company);
  } catch (e) {
    res.status(500).json({ error: '업체 등록 실패' });
  }
});

router.patch('/companies/:id', authenticate, (req, res) => {
  try {
    const company = companies.find(c => c.id === req.params.id);
    if (!company) return res.status(404).json({ error: '업체를 찾을 수 없습니다.' });
    Object.assign(company, req.body, { updated_at: new Date().toISOString() });
    res.json(company);
  } catch (e) {
    res.status(500).json({ error: '업체 수정 실패' });
  }
});

router.delete('/companies/:id', authenticate, (req, res) => {
  try {
    const idx = companies.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: '업체를 찾을 수 없습니다.' });
    companies.splice(idx, 1);
    res.json({ message: '삭제 완료' });
  } catch (e) {
    res.status(500).json({ error: '업체 삭제 실패' });
  }
});

// ─── 헬스체크 ─────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), users: users.length });
});

app.use('/.netlify/functions/api', router);

module.exports.handler = serverless(app);
