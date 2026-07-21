#!/usr/bin/env python3
"""
BizConsult AI - 배포 후 API 자동 검증 스크립트
실행: python3 scripts/api_verify.py
모든 주요 API 엔드포인트가 정상 동작하는지 확인합니다.
"""
import requests, json, sys, urllib3
urllib3.disable_warnings()

BASE_URL = 'https://biz-ai-solution.netlify.app'
ADMIN_EMAIL = 'admin@bizconsult.com'
ADMIN_PW = 'Admin1234!'

PASS = '✅'
FAIL = '❌'
results = []

def check(name, ok, detail=''):
    status = PASS if ok else FAIL
    results.append({'name': name, 'ok': ok, 'detail': detail})
    print(f'  {status} {name}' + (f' ({detail})' if detail else ''))
    return ok

def run_checks():
    print(f'=== BizConsult AI API 검증 ({BASE_URL}) ===\n')

    # 1. Health check
    print('[1] 서버 상태 확인')
    try:
        r = requests.get(f'{BASE_URL}/.netlify/functions/api/health', timeout=10, verify=False)
        data = r.json()
        check('서버 응답', r.status_code == 200, f'HTTP {r.status_code}')
        check('모드 확인', data.get('mode', '').startswith('stable'), data.get('mode', ''))
    except Exception as e:
        check('서버 응답', False, str(e))
        print('\n⚠️ 서버에 연결할 수 없습니다. 배포 상태를 확인하세요.')
        return False

    # 2. 로그인
    print('\n[2] 인증 확인')
    token = None
    try:
        r = requests.post(
            f'{BASE_URL}/.netlify/functions/api/auth/login',
            json={'email': ADMIN_EMAIL, 'pw': ADMIN_PW},
            timeout=10, verify=False
        )
        data = r.json()
        token = data.get('token')
        check('관리자 로그인', r.status_code == 200 and bool(token), f'HTTP {r.status_code}')
    except Exception as e:
        check('관리자 로그인', False, str(e))

    if not token:
        print('\n⚠️ 로그인 실패로 인증 필요 API 검증 불가')
        return False

    auth_headers = {'Authorization': f'Bearer {token}'}

    # 3. 업체 목록
    print('\n[3] 업체 데이터 확인')
    try:
        r = requests.get(f'{BASE_URL}/.netlify/functions/api/companies', headers=auth_headers, timeout=10, verify=False)
        data = r.json()
        count = len(data) if isinstance(data, list) else 0
        check('업체 목록 조회', r.status_code == 200 and count > 0, f'{count}개')
        if count > 0:
            # 첫 번째 업체의 extra 필드 확인
            first = data[0]
            extra = first.get('extra') or {}
            has_core = bool(extra.get('coreItem', ''))
            check('업체 extra 데이터', has_core, '핵심아이템 필드 존재' if has_core else '핵심아이템 필드 없음')
    except Exception as e:
        check('업체 목록 조회', False, str(e))

    # 4. 보고서 목록
    print('\n[4] 보고서 데이터 확인')
    try:
        r = requests.get(f'{BASE_URL}/.netlify/functions/api/reports', headers=auth_headers, timeout=10, verify=False)
        data = r.json()
        count = len(data) if isinstance(data, list) else 0
        check('보고서 목록 조회', r.status_code == 200, f'HTTP {r.status_code}, {count}개')
    except Exception as e:
        check('보고서 목록 조회', False, str(e))

    # 5. 공지사항
    print('\n[5] 공지사항/지원사업 확인')
    try:
        r = requests.get(f'{BASE_URL}/.netlify/functions/api/notices', timeout=10, verify=False)
        data = r.json()
        count = len(data) if isinstance(data, list) else 0
        check('공지사항 조회', r.status_code == 200 and count > 0, f'{count}개')
    except Exception as e:
        check('공지사항 조회', False, str(e))

    try:
        r = requests.get(f'{BASE_URL}/.netlify/functions/api/support-docs', timeout=10, verify=False)
        data = r.json()
        count = len(data) if isinstance(data, list) else 0
        check('지원사업공고 조회', r.status_code == 200, f'{count}개')
    except Exception as e:
        check('지원사업공고 조회', False, str(e))

    # 6. 관리자 API
    print('\n[6] 관리자 기능 확인')
    try:
        r = requests.get(f'{BASE_URL}/.netlify/functions/api/admin/users', headers=auth_headers, timeout=10, verify=False)
        data = r.json()
        count = len(data) if isinstance(data, list) else 0
        check('관리자 사용자 목록', r.status_code == 200 and count > 0, f'{count}명')
    except Exception as e:
        check('관리자 사용자 목록', False, str(e))

    try:
        r = requests.get(f'{BASE_URL}/.netlify/functions/api/admin/stats', headers=auth_headers, timeout=10, verify=False)
        data = r.json()
        check('관리자 통계', r.status_code == 200 and 'total' in data, str(data))
    except Exception as e:
        check('관리자 통계', False, str(e))

    # 최종 결과
    total = len(results)
    passed = sum(1 for r in results if r['ok'])
    failed = total - passed

    print(f'\n=== 검증 결과 ===')
    print(f'통과: {passed}/{total}개')
    if failed > 0:
        print(f'실패 항목:')
        for r in results:
            if not r['ok']:
                print(f'  ❌ {r["name"]}: {r["detail"]}')
        return False
    else:
        print('모든 API 정상 동작 확인 ✅')
        return True

if __name__ == '__main__':
    ok = run_checks()
    sys.exit(0 if ok else 1)
