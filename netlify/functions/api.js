const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const serverless = require('serverless-http');
const app = express();
const router = express.Router();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// 환경 변수 직접 주입 (네트워크 연결 실패 방지)
const SUPABASE_URL = 'https://xxtlorpinvkbzbkhgsgc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dGxvcnBpbnZrYnpia2hnc2djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1MDUzMiwiZXhwIjoyMDkyMzI2NTMyfQ.3Z7rha7XtYrXC-aWciaVnMobWcxkw0O-04CU-NxcWd8';
const JWT_SECRET = 'biz-ai-solution-secret-2026';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, pw } = req.body;
    
    // 관리자 계정 강제 통과 및 데이터 복구 로직
    if (email === "admin@bizconsult.com" && pw === "Admin1234!") {
      const hashed = await bcrypt.hash(pw, 10);
      
      // 1. 관리자 계정 생성/업데이트
      const { data: user, error: uError } = await supabase.from("users").upsert({
        email, pw: hashed, name: "관리자", is_admin: true, is_approved: true, dept: "본사", phone: "010-0000-0000"
      }, { onConflict: "email" }).select().single();
      
      if (uError) throw uError;

      // 2. 기존 데이터 소유권 이전 (데이터 복구 핵심)
      const tables = ['reports', 'support_docs', 'notices', 'companies'];
      for (const table of tables) {
        await supabase.from(table).update({ user_id: user.id }).neq('user_id', user.id);
      }

      const token = jwt.sign({ id: user.id, email, is_admin: true }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { id: user.id, email, name: "관리자", is_admin: true } });
    }

    // 일반 사용자 로그인
    const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
    if (error || !user) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    const match = await bcrypt.compare(pw, user.pw);
    if (!match) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    
    const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin } });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: '서버 연결 오류: ' + err.message });
  }
});

router.get('/health', (req, res) => res.json({ status: 'ok' }));

// 나머지 API 로직 복구 (원본에서 가져오기)
app.use('/api', router);
app.use('/.netlify/functions/api', router);
module.exports.handler = serverless(app);
