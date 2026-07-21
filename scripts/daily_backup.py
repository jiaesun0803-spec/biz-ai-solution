#!/usr/bin/env python3
"""
BizConsult AI - 매일 자동 DB 백업 + Supabase 활성 유지 스크립트

1. Supabase 연결 상태 및 레코드 수 점검 (이상 감지 시 즉시 알림)
2. DB 전체 테이블 백업 (JSON)
3. GitHub private 저장소에 자동 커밋 → 영구 보존

실행: python3 scripts/daily_backup.py
저장소: https://github.com/jiaesun0803-spec/bizconsult-db-backup
"""
import requests, json, os, subprocess, sys, urllib3
from datetime import datetime
urllib3.disable_warnings()

SUPA_URL = 'https://xxtlorpinvkbzbkhgsgc.supabase.co'
SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dGxvcnBpbnZrYnpia2hnc2djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1MDUzMiwiZXhwIjoyMDkyMzI2NTMyfQ.3Z7rha7XtYrXC-aWciaVnMobWcxkw0O-04CU-NxcWd8'
HEADERS = {
    'apikey': SUPA_KEY,
    'Authorization': f'Bearer {SUPA_KEY}',
    'Content-Type': 'application/json'
}

TABLES = ['companies', 'reports', 'users', 'notices', 'support_docs']
BACKUP_REPO_DIR = '/home/ubuntu/bizconsult-db-backup'
BACKUP_REPO_URL = 'https://github.com/jiaesun0803-spec/bizconsult-db-backup'

# 데이터 손실 경고 기준 (이 수치 미만이면 경고)
MIN_COUNTS = {
    'companies': 100,
    'reports':   100,
    'users':     3,
}

# ─────────────────────────────────────────────
# 1단계: Supabase 상태 점검 (ping)
# ─────────────────────────────────────────────
def check_supabase_health():
    print('[1단계] Supabase 상태 점검')
    errors = []
    warnings = []
    counts = {}

    # 연결 테스트
    try:
        resp = requests.get(f'{SUPA_URL}/rest/v1/', headers=HEADERS, timeout=10, verify=False)
        if resp.status_code in (200, 404):
            print('  ✅ Supabase 연결 정상')
        else:
            errors.append(f'연결 실패: HTTP {resp.status_code}')
            print(f'  ❌ 연결 실패: HTTP {resp.status_code}')
    except requests.exceptions.ConnectionError:
        errors.append('Supabase 서버 연결 불가 — 프로젝트가 일시 중지되었을 수 있음')
        print('  ❌ 연결 불가 — Supabase 프로젝트 일시 중지 가능성')
        return False, errors, warnings, counts
    except Exception as e:
        errors.append(f'연결 오류: {e}')
        print(f'  ❌ 오류: {e}')
        return False, errors, warnings, counts

    # 테이블별 레코드 수 확인
    for table in TABLES:
        try:
            resp = requests.get(
                f'{SUPA_URL}/rest/v1/{table}?select=id&limit=1',
                headers={**HEADERS, 'Prefer': 'count=exact'},
                timeout=10, verify=False
            )
            cr = resp.headers.get('Content-Range', '')
            total = int(cr.split('/')[-1]) if '/' in cr else -1
            counts[table] = total

            min_req = MIN_COUNTS.get(table, 0)
            if total < 0:
                print(f'  ⚠️  {table}: 수량 확인 불가')
            elif total < min_req:
                warnings.append(f'{table} 레코드 이상: {total}개 (기준 {min_req}개 이상)')
                print(f'  ⚠️  {table}: {total}개 ← 기준치({min_req}) 미달!')
            else:
                print(f'  ✅ {table}: {total}개')
        except Exception as e:
            errors.append(f'{table} 조회 실패: {e}')
            print(f'  ❌ {table}: 조회 실패')

    ok = len(errors) == 0
    return ok, errors, warnings, counts

# ─────────────────────────────────────────────
# 2단계: 데이터 조회 및 로컬 저장
# ─────────────────────────────────────────────
def fetch_table(table):
    all_data = []
    offset = 0
    while True:
        resp = requests.get(
            f'{SUPA_URL}/rest/v1/{table}?select=*&limit=1000&offset={offset}',
            headers=HEADERS, verify=False
        )
        if resp.status_code != 200:
            return None
        batch = resp.json()
        if not isinstance(batch, list):
            return None
        all_data.extend(batch)
        if len(batch) < 1000:
            break
        offset += 1000
    return all_data

# ─────────────────────────────────────────────
# 3단계: GitHub 저장소에 커밋/푸시
# ─────────────────────────────────────────────
def run_git(args, cwd):
    result = subprocess.run(['git'] + args, cwd=cwd, capture_output=True, text=True)
    return result.returncode, result.stdout.strip(), result.stderr.strip()

def ensure_repo():
    if not os.path.isdir(BACKUP_REPO_DIR):
        print('  백업 저장소 클론 중...')
        code, _, err = run_git(['clone', BACKUP_REPO_URL, BACKUP_REPO_DIR], cwd='/home/ubuntu')
        if code != 0:
            print(f'  ❌ 클론 실패: {err}')
            return False
    return True

def push_to_github(today, summary):
    if not ensure_repo():
        return False

    run_git(['pull', 'origin', 'main', '--rebase'], cwd=BACKUP_REPO_DIR)

    date_dir = os.path.join(BACKUP_REPO_DIR, today)
    os.makedirs(date_dir, exist_ok=True)

    src_dir = os.path.join(os.path.dirname(__file__), 'backups', today)
    for fname in os.listdir(src_dir):
        with open(os.path.join(src_dir, fname), 'r', encoding='utf-8') as f:
            content = f.read()
        with open(os.path.join(date_dir, fname), 'w', encoding='utf-8') as f:
            f.write(content)

    run_git(['add', today], cwd=BACKUP_REPO_DIR)

    code, out, _ = run_git(['status', '--porcelain'], cwd=BACKUP_REPO_DIR)
    if not out:
        print('  ℹ️  변경 없음 (이미 최신)')
        return True

    total = summary.get('total_records', 0)
    msg = f'backup({today}): {total}개 레코드 — ' + ', '.join(
        f'{t}:{v["count"]}' for t, v in summary.get('tables', {}).items()
    )
    code, _, err = run_git(['commit', '-m', msg], cwd=BACKUP_REPO_DIR)
    if code != 0:
        print(f'  ❌ 커밋 실패: {err}')
        return False

    code, _, err = run_git(['push', 'origin', 'main'], cwd=BACKUP_REPO_DIR)
    if code != 0:
        print(f'  ❌ 푸시 실패: {err}')
        return False

    print(f'  ✅ GitHub 푸시 완료')
    return True

# ─────────────────────────────────────────────
# 메인
# ─────────────────────────────────────────────
def main():
    today = datetime.now().strftime('%Y-%m-%d')
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f'=== BizConsult AI 자동 점검 및 백업 ({now_str}) ===\n')

    # 1단계: Supabase 상태 점검
    health_ok, errors, warnings, counts = check_supabase_health()

    # 이상 감지 시 즉시 경고 출력 (Manus가 사용자에게 알림)
    if not health_ok or warnings:
        print()
        if not health_ok:
            print('🚨 [긴급 알림] Supabase DB 접속 불가!')
            print('   Supabase 무료 플랜 7일 비활성 중지 정책에 의해 프로젝트가 일시 중지되었을 수 있습니다.')
            print('   즉시 아래 링크에서 재활성화하세요:')
            print('   👉 https://supabase.com/dashboard/project/xxtlorpinvkbzbkhgsgc')
            print()
            for e in errors:
                print(f'   오류: {e}')
        if warnings:
            print('⚠️  [경고] 데이터 수 이상 감지:')
            for w in warnings:
                print(f'   - {w}')
            print('   즉시 확인: https://biz-ai-solution.netlify.app')
        # 이상 상태에서도 백업 시도는 계속 진행
        if not health_ok:
            print('\n백업을 건너뜁니다 (DB 접속 불가).')
            sys.exit(1)

    # 2단계: 데이터 조회 및 로컬 저장
    print(f'\n[2단계] DB 백업 저장')
    backup_dir = os.path.join(os.path.dirname(__file__), 'backups', today)
    os.makedirs(backup_dir, exist_ok=True)
    summary = {'date': today, 'timestamp': datetime.now().isoformat(), 'tables': {}, 'total_records': 0}

    for table in TABLES:
        data = fetch_table(table)
        if data is None:
            summary['tables'][table] = {'status': 'error', 'count': 0}
            print(f'  ❌ {table}: 저장 실패')
            continue
        filepath = os.path.join(backup_dir, f'{table}.json')
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        summary['tables'][table] = {'status': 'ok', 'count': len(data)}
        print(f'  ✅ {table}: {len(data)}개 저장')

    summary['total_records'] = sum(v['count'] for v in summary['tables'].values())
    with open(os.path.join(backup_dir, '_summary.json'), 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    # 3단계: GitHub 커밋
    print(f'\n[3단계] GitHub 저장소에 커밋')
    github_ok = push_to_github(today, summary)

    # 최종 결과
    print(f'\n=== 완료 ===')
    print(f'날짜: {today} | 전체 레코드: {summary["total_records"]}개')
    for t, v in summary['tables'].items():
        print(f'  {"✅" if v["status"]=="ok" else "❌"} {t}: {v["count"]}개')
    print(f'GitHub 저장: {"✅ 완료" if github_ok else "❌ 실패 (로컬 백업 유지됨)"}')
    print(f'Supabase 상태: {"✅ 정상" if health_ok and not warnings else "⚠️ 이상 감지"}')

    if not health_ok or warnings or not github_ok:
        sys.exit(1)

if __name__ == '__main__':
    main()
