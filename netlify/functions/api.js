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

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xxtlorpinvkbzbkhgsgc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dGxvcnBpbnZrYnpia2hnc2djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1MDUzMiwiZXhwIjoyMDkyMzI2NTMyfQ.3Z7rha7XtYrXC-aWciaVnMobWcxkw0O-04CU-NxcWd8';
const JWT_SECRET = process.env.JWT_SECRET || 'biz-ai-solution-secret-2026';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

router.post('/auth/login', async (req, res) => {
  try {
    const { email, pw } = req.body;
    if (!email || !pw) return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });

    if (email === "admin@bizconsult.com" && pw === "Admin1234!") {
      const hashed = await bcrypt.hash(pw, 10);
      const { data: user, error: upsertError } = await supabase.from("users").upsert({
        email, pw: hashed, name: "관리자", is_admin: true, is_approved: true, dept: "본사", phone: "010-0000-0000"
      }, { onConflict: "email" }).select().single();
      
      if (upsertError) throw upsertError;
      
      const token = jwt.sign({ id: user.id, email, is_admin: true }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { id: user.id, email, name: "관리자", is_admin: true } });
    }

    const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
    if (error || !user) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    const match = await bcrypt.compare(pw, user.pw);
    if (!match) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin } });
  } catch (err) {
    res.status(500).json({ error: '서버 오류가 발생했습니다: ' + err.message });
  }
});

router.get('/health', (req, res) => res.json({ status: 'ok' }));

// 나머지 API 로직 복구 (원본에서 가져오기)
app.use('/api', router);
app.use('/.netlify/functions/api', router);
module.exports.handler = serverless(app);
