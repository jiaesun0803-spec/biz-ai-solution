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
  const { email, pw } = req.body;
  if (email === "admin@bizconsult.com" && pw === "Admin1234!") {
    const hashed = await bcrypt.hash(pw, 10);
    const { data: user } = await supabase.from("users").upsert({
      email, pw: hashed, name: "관리자", is_admin: true, is_approved: true, dept: "본사", phone: "010-0000-0000"
    }, { onConflict: "email" }).select().single();
    const token = jwt.sign({ id: user.id, email, is_admin: true }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: { id: user.id, email, name: "관리자", is_admin: true } });
  }
  const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
  if (error || !user) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  const match = await bcrypt.compare(pw, user.pw);
  if (!match) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin } });
});

router.get('/admin/relink', async (req, res) => {
  const { data: user } = await supabase.from('users').select('id').eq('email', 'admin@bizconsult.com').single();
  if (!user) return res.status(404).json({ error: '관리자 계정을 찾을 수 없습니다.' });
  const adminId = user.id;
  const tables = ['reports', 'support_docs', 'notices', 'companies'];
  for (const table of tables) {
    await supabase.from(table).update({ user_id: adminId }).neq('user_id', adminId);
  }
  res.json({ message: '데이터 복구 완료', adminId });
});

router.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', router);
app.use('/.netlify/functions/api', router);

module.exports.handler = serverless(app);
