#!/usr/bin/env python3
"""
BizConsult AI - 매일 자동 DB 백업 스크립트
실행: python3 scripts/daily_backup.py
백업 파일 위치: scripts/backups/YYYY-MM-DD/
"""
import requests, json, os, urllib3
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

def fetch_table(table):
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
            print(f'  ❌ {table} 응답 형식 오류')
            return None
        all_data.extend(batch)
        if len(batch) < 1000:
            break
        offset += 1000
    return all_data

def main():
    today = datetime.now().strftime('%Y-%m-%d')
    backup_dir = os.path.join(os.path.dirname(__file__), 'backups', today)
    os.makedirs(backup_dir, exist_ok=True)

    print(f'=== BizConsult AI DB 백업 시작 ({today}) ===\n')
    summary = {}

    for table in TABLES:
        print(f'[{table}] 백업 중...')
        data = fetch_table(table)
        if data is None:
            summary[table] = {'status': 'error', 'count': 0}
            continue
        
        filepath = os.path.join(backup_dir, f'{table}.json')
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f'  ✅ {len(data)}개 → {filepath}')
        summary[table] = {'status': 'ok', 'count': len(data)}

    # 백업 요약 파일 저장
    summary_path = os.path.join(backup_dir, '_summary.json')
    summary_data = {
        'date': today,
        'timestamp': datetime.now().isoformat(),
        'tables': summary,
        'total_records': sum(v['count'] for v in summary.values())
    }
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(summary_data, f, ensure_ascii=False, indent=2)

    print(f'\n=== 백업 완료 ===')
    print(f'백업 위치: {backup_dir}')
    print(f'전체 레코드 수: {summary_data["total_records"]}개')
    for t, v in summary.items():
        status = '✅' if v['status'] == 'ok' else '❌'
        print(f'  {status} {t}: {v["count"]}개')

if __name__ == '__main__':
    main()
