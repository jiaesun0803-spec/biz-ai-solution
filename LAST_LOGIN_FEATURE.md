# 관리자 마지막 접속일 및 접속 상태 필터

## 포함 기능

- 로그인 성공 시 `users.last_login_at`에 현재 시각(KST가 아닌 UTC timestamptz) 저장
- 관리자 회원 목록에 마지막 접속일시 표시
- 접속 상태 필터: 전체, 최근 7일, 7~30일, 30일 이상, 미접속
- `last_login_at`이 없는 기존 회원은 `미접속`으로 표시

## 적용 전 필수 작업

Supabase SQL Editor에서 다음 마이그레이션을 실행해야 합니다.

```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
```

마이그레이션 파일: `supabase/migrations/20260928_add_last_login_at.sql`

기존 회원의 과거 접속일은 기존 데이터에 기록되어 있지 않으므로 소급할 수 없으며, 기능 적용 후 로그인 성공부터 기록됩니다.
