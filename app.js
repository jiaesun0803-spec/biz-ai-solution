// ===== 상수 정의 =====
const DB_USERS       = 'biz_users';
const DB_SESSION     = 'biz_session';
// ===== API 서버 URL (Netlify Functions 사용) =====
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001'
  : '/.netlify/functions/api';  // Netlify: 절대경로 사용

async function apiCall(path, options={}) {
  const token = localStorage.getItem('biz_jwt_token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers||{}) };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  
  // API 경로 정규화
  let fullPath = path;
  if (!path.startsWith('/')) fullPath = '/' + path;
  if (!fullPath.startsWith('/.netlify') && !fullPath.startsWith('/api')) {
    fullPath = '/api' + fullPath;
  }
  
  const res = await fetch(API_BASE + fullPath, { ...options, headers });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) {
    // 401: 토큰 만료 또는 인증 실패 → 로컬 데이터 보존 후 재로그인 안내
    if (res.status === 401) {
      const err = new Error(data.error || '인증이 만료되었습니다.');
      err.isAuthError = true;
      throw err;
    }
    throw new Error(data.error || '서버 오류가 발생했습니다.');
  }
  return data;
}
