-- 사용자별 마지막 로그인 시각 저장
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

COMMENT ON COLUMN public.users.last_login_at IS '사용자의 마지막 로그인 성공 시각';
