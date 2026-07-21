# BizConsult AI - 유지보수 스크립트

## 파일 구조

```
scripts/
├── daily_backup.py     # 매일 DB 전체 백업
├── api_verify.py       # 배포 후 API 자동 검증
├── backups/            # 백업 파일 저장 위치
│   └── YYYY-MM-DD/
│       ├── companies.json
│       ├── reports.json
│       ├── users.json
│       ├── notices.json
│       ├── support_docs.json
│       └── _summary.json
└── README.md
```

## 사용 방법

### 1. DB 백업 (daily_backup.py)

```bash
cd /home/ubuntu/biz-ai-solution-full
python3 scripts/daily_backup.py
```

- Supabase의 모든 테이블(companies, reports, users, notices, support_docs)을 JSON으로 백업
- `scripts/backups/YYYY-MM-DD/` 폴더에 날짜별로 저장
- 백업 요약은 `_summary.json`에 저장

### 2. API 검증 (api_verify.py)

```bash
cd /home/ubuntu/biz-ai-solution-full
python3 scripts/api_verify.py
```

- 배포된 Netlify 앱의 모든 주요 API 엔드포인트 검증
- 검증 항목: 서버 상태, 로그인, 업체/보고서/공지사항/지원사업공고 조회, 관리자 기능
- 모두 통과 시 exit code 0, 실패 시 exit code 1

## 자동화 설정

### Manus 스케줄 (매일 오전 9시 백업)

Manus 프로젝트에서 스케줄 작업으로 등록하여 매일 자동 실행 가능합니다.

### 배포 후 수동 검증

Netlify 배포 완료 후 `api_verify.py`를 실행하여 모든 기능이 정상인지 확인하세요.

## 데이터 복원 방법

백업 파일에서 특정 테이블 데이터를 복원하려면:

```python
import requests, json

SUPA_URL = 'https://xxtlorpinvkbzbkhgsgc.supabase.co'
SUPA_KEY = '...'  # service role key
headers = {'apikey': SUPA_KEY, 'Authorization': f'Bearer {SUPA_KEY}', 'Content-Type': 'application/json'}

# 백업 파일 로드
with open('scripts/backups/2026-07-21/companies.json') as f:
    data = json.load(f)

# 특정 업체 복원 (예시)
company = next((c for c in data if c['name'] == '업체명'), None)
if company:
    requests.post(f'{SUPA_URL}/rest/v1/companies', headers=headers, json=company)
```
