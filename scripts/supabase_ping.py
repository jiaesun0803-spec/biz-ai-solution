#!/usr/bin/env python3
"""
BizConsult AI - Supabase 활성 유지 및 상태 점검 스크립트

Supabase 무료 플랜은 7일간 API 요청이 없으면 프로젝트를 자동 일시 중지합니다.
이 스크립트를 주 3회 이상 실행하면 중지를 방지할 수 있습니다.

실행: python3 scripts/supabase_ping.py
반환값:
  - 정상: 각 테이블 레코드 수 출력 후 종료 (exit 0)
  - 이상: 오류 메시지 출력 후 종료 (exit 1) → Manus가 사용자에게 알림
"""
import requests, json, sys, urllib3
from datetime import datetime
urllib3.disable_warnings()

SUPA_URL = 'https://xxtlorpinvkbzbkhgsgc.supabase.co'
SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dGxvcnBpbnZrYnpia2hnc2djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1MDUzMiwiZXhwIjoyMDkyMzI2NTMyfQ.3Z7rha7XtYrXC-aWciaVnMobWcxkw0O-04CU-NxcWd8'
HEADERS = {
    'apikey': SUPA_KEY,
    'Authorization': f'Bearer {SUPA_KEY}',
}

# 최소 레코드 수 기준 (이 수치 미만이면 데이터 손실 경고)
MIN_COUNTS = {
    'companies': 100,   # 정상 기준: 159개
    'reports':   100,   # 정상 기준: 171개
    'users':     3,     # 정상 기준: 5명
}

def check_supabase():
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f'=== Supabase 상태 점검 ({now}) ===\n')

    errors = []
    warnings = []

    # 1. 연결 테스트 (health check)
    try:
        resp = requests.get(
            f'{SUPA_URL}/rest/v1/',
            headers=HEADERS, timeout=10, verify=False
        )
        if resp.status_code in (200, 404):  # 404도 연결은 된 것
            print('  ✅ Supabase 연결 정상')
        else:
            errors.append(f'Supabase 연결 실패: HTTP {resp.status_code}')
            print(f'  ❌ Supabase 연결 실패: HTTP {resp.status_code}')
    except requests.exceptions.ConnectionError:
        errors.append('Supabase 서버에 연결할 수 없음 — 프로젝트가 일시 중지되었을 수 있음')
        print('  ❌ 연결 불가 — Supabase 프로젝트가 일시 중지되었을 가능성 있음')
    except Exception as e:
        errors.append(f'연결 오류: {str(e)}')
        print(f'  ❌ 오류: {e}')

    if errors:
        print(f'\n⚠️  Supabase 접속 불가 — 즉시 확인 필요!')
        print(f'   대시보드: https://supabase.com/dashboard/project/xxtlorpinvkbzbkhgsgc')
        print(f'   (무료 플랜 7일 비활성 중지 가능성)')
        sys.exit(1)

    # 2. 테이블별 레코드 수 확인
    print()
    table_counts = {}
    for table in ['companies', 'reports', 'users', 'notices', 'support_docs']:
        try:
            resp = requests.get(
                f'{SUPA_URL}/rest/v1/{table}?select=id&limit=1',
                headers={**HEADERS, 'Prefer': 'count=exact'},
                timeout=10, verify=False
            )
            count_header = resp.headers.get('Content-Range', '')
            # Content-Range: 0-0/159 형식에서 총 수 추출
            total = int(count_header.split('/')[-1]) if '/' in count_header else -1
            table_counts[table] = total

            min_ok = total >= MIN_COUNTS.get(table, 0)
            icon = '✅' if total >= 0 and min_ok else ('⚠️' if total >= 0 else '❌')
            print(f'  {icon} {table}: {total}개')

            if total >= 0 and not min_ok:
                warnings.append(f'{table} 레코드 수 이상: {total}개 (기준 {MIN_COUNTS[table]}개 이상)')
        except Exception as e:
            print(f'  ❌ {table}: 조회 실패 ({e})')
            errors.append(f'{table} 조회 실패: {e}')

    # 3. 결과 판정
    print()
    if errors:
        print('❌ 오류 발생:')
        for e in errors:
            print(f'   - {e}')
        sys.exit(1)
    elif warnings:
        print('⚠️  경고 (데이터 수 이상):')
        for w in warnings:
            print(f'   - {w}')
        print('\n즉시 확인: https://biz-ai-solution.netlify.app')
        sys.exit(1)
    else:
        print('✅ 모든 항목 정상 — Supabase 활성 상태 유지됨')
        sys.exit(0)

if __name__ == '__main__':
    check_supabase()
