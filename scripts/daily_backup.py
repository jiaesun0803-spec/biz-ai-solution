#!/usr/bin/env python3
"""
BizConsult AI - 매일 자동 DB 백업 스크립트
실행: python3 scripts/daily_backup.py

1. Supabase DB 전체 테이블 백업 (JSON)
2. GitHub private 저장소(bizconsult-db-backup)에 자동 커밋 → 영구 보존
"""
import requests, json, os, subprocess, urllib3
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

def fetch_table(table):
    """Supabase 테이블 전체 데이터 조회"""
    all_data = []
    offset = 0
    while True:
        resp = requests.get(
            f'{SUPA_URL}/rest/v1/{table}?select=*&limit=1000&offset={offset}',
            headers=HEADERS, verify=False
        )
        if resp.status_code != 200:
            print(f'  ❌ {table} 조회 실패: HTTP {resp.status_code}')
            return None
        batch = resp.json()
        if not isinstance(batch, list):
            return None
        all_data.extend(batch)
        if len(batch) < 1000:
            break
        offset += 1000
    return all_data

def run_git(args, cwd):
    """git 명령 실행"""
    result = subprocess.run(
        ['git'] + args, cwd=cwd,
        capture_output=True, text=True
    )
    return result.returncode, result.stdout.strip(), result.stderr.strip()

def ensure_repo():
    """백업 저장소가 없으면 클론"""
    if not os.path.isdir(BACKUP_REPO_DIR):
        print(f'백업 저장소 클론 중...')
        code, out, err = run_git(
            ['clone', BACKUP_REPO_URL, BACKUP_REPO_DIR], cwd='/home/ubuntu'
        )
        if code != 0:
            print(f'  ❌ 클론 실패: {err}')
            return False
        print(f'  ✅ 클론 완료')
    return True

def push_to_github(today, summary):
    """백업 파일을 GitHub에 커밋 및 푸시"""
    if not ensure_repo():
        return False

    # 최신 상태 pull
    run_git(['pull', 'origin', 'main', '--rebase'], cwd=BACKUP_REPO_DIR)

    # 날짜 폴더 생성
    date_dir = os.path.join(BACKUP_REPO_DIR, today)
    os.makedirs(date_dir, exist_ok=True)

    # 백업 파일 복사
    src_dir = os.path.join(os.path.dirname(__file__), 'backups', today)
    copied = []
    for fname in os.listdir(src_dir):
        src = os.path.join(src_dir, fname)
        dst = os.path.join(date_dir, fname)
        with open(src, 'r', encoding='utf-8') as f:
            content = f.read()
        with open(dst, 'w', encoding='utf-8') as f:
            f.write(content)
        copied.append(fname)

    # git add
    run_git(['add', today], cwd=BACKUP_REPO_DIR)

    # 변경 사항 확인
    code, out, _ = run_git(['status', '--porcelain'], cwd=BACKUP_REPO_DIR)
    if not out:
        print('  ℹ️  변경 사항 없음 (이미 최신 상태)')
        return True

    # git commit
    total = summary.get('total_records', 0)
    msg = f'backup({today}): {total}개 레코드 — ' + ', '.join(
        f'{t}:{v["count"]}' for t, v in summary.get('tables', {}).items()
    )
    code, out, err = run_git(['commit', '-m', msg], cwd=BACKUP_REPO_DIR)
    if code != 0:
        print(f'  ❌ 커밋 실패: {err}')
        return False

    # git push
    code, out, err = run_git(['push', 'origin', 'main'], cwd=BACKUP_REPO_DIR)
    if code != 0:
        print(f'  ❌ 푸시 실패: {err}')
        return False

    print(f'  ✅ GitHub 푸시 완료 ({len(copied)}개 파일)')
    return True

def main():
    today = datetime.now().strftime('%Y-%m-%d')
    backup_dir = os.path.join(os.path.dirname(__file__), 'backups', today)
    os.makedirs(backup_dir, exist_ok=True)

    print(f'=== BizConsult AI DB 백업 시작 ({today}) ===\n')
    summary = {'date': today, 'timestamp': datetime.now().isoformat(), 'tables': {}, 'total_records': 0}

    # 1단계: Supabase에서 데이터 조회 및 로컬 저장
    print('[1단계] Supabase DB 조회 및 로컬 저장')
    for table in TABLES:
        print(f'  [{table}] 백업 중...')
        data = fetch_table(table)
        if data is None:
            summary['tables'][table] = {'status': 'error', 'count': 0}
            continue
        filepath = os.path.join(backup_dir, f'{table}.json')
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f'    ✅ {len(data)}개 저장')
        summary['tables'][table] = {'status': 'ok', 'count': len(data)}

    summary['total_records'] = sum(v['count'] for v in summary['tables'].values())

    # 요약 파일 저장
    with open(os.path.join(backup_dir, '_summary.json'), 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    # 2단계: GitHub private 저장소에 커밋/푸시
    print(f'\n[2단계] GitHub 저장소에 백업 파일 커밋')
    github_ok = push_to_github(today, summary)

    # 최종 결과 출력
    print(f'\n=== 백업 완료 ===')
    print(f'날짜: {today}')
    print(f'전체 레코드: {summary["total_records"]}개')
    for t, v in summary['tables'].items():
        icon = '✅' if v['status'] == 'ok' else '❌'
        print(f'  {icon} {t}: {v["count"]}개')
    print(f'GitHub 저장: {"✅ 완료" if github_ok else "❌ 실패 (로컬 백업은 유지됨)"}')
    print(f'저장소: {BACKUP_REPO_URL}')

if __name__ == '__main__':
    main()
