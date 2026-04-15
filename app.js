// 데이터베이스 키 (localStorage)
const DB_USERS = 'biz_users'; // 가입된 사용자 목록
const DB_SESSION = 'biz_session'; // 현재 로그인된 사용자 정보
const STORAGE_KEY = 'biz_consult_companies';

document.addEventListener("DOMContentLoaded", function() {
    checkAuth(); // 접속 시 로그인 상태 체크

    // URL 파라미터 체크
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab') || 'dashboard';
    showTab(tabParam, false);
});

/* =========================================
   1. 인증 시스템 (Auth)
========================================= */

function checkAuth() {
    const session = JSON.parse(localStorage.getItem(DB_SESSION));
    const authOverlay = document.getElementById('auth-container');
    const mainApp = document.getElementById('main-app');

    if (session) {
        authOverlay.style.display = 'none';
        mainApp.style.display = 'flex';
        loadUserProfile();
    } else {
        authOverlay.style.display = 'flex';
        mainApp.style.display = 'none';
    }
}

function toggleAuthMode(mode) {
    document.getElementById('login-form-area').style.display = mode === 'login' ? 'block' : 'none';
    document.getElementById('signup-form-area').style.display = mode === 'signup' ? 'block' : 'none';
}

function handleSignup() {
    const email = document.getElementById('signup-email').value;
    const pw = document.getElementById('signup-pw').value;
    const name = document.getElementById('signup-name').value;

    if (!email || !pw || !name) { alert('모든 정보를 입력해주세요.'); return; }

    let users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
    if (users.find(u => u.email === email)) { alert('이미 가입된 이메일입니다.'); return; }

    const newUser = { email, pw, name, dept: '솔루션빌더스', apiKey: '' };
    users.push(newUser);
    localStorage.setItem(DB_USERS, JSON.stringify(users));

    alert('회원가입이 완료되었습니다! 로그인해주세요.');
    toggleAuthMode('login');
}

function handleLogin() {
    const email = document.getElementById('login-email').value;
    const pw = document.getElementById('login-pw').value;

    let users = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
    const user = users.find(u => u.email === email && u.pw === pw);

    if (user) {
        localStorage.setItem(DB_SESSION, JSON.stringify(user));
        checkAuth();
    } else {
        alert('이메일 또는 비밀번호가 일치하지 않습니다.');
    }
}

function handleLogout() {
    localStorage.removeItem(DB_SESSION);
    location.reload();
}

/* =========================================
   2. 설정 (Settings) 기능
========================================= */

function loadUserProfile() {
    const user = JSON.parse(localStorage.getItem(DB_SESSION));
    if (!user) return;

    // 사이드바 표시
    document.getElementById('display-user-name').innerText = user.name;
    document.getElementById('display-user-dept').innerText = user.dept || '솔루션빌더스';

    // 설정 탭 입력란 채우기
    if(document.getElementById('set-user-name')) {
        document.getElementById('set-user-name').value = user.name;
        document.getElementById('set-user-email').value = user.email;
        document.getElementById('set-user-dept').value = user.dept || '';
        document.getElementById('set-api-key').value = user.apiKey || '';
    }
}

function saveUserSettings() {
    const name = document.getElementById('set-user-name').value;
    const dept = document.getElementById('set-user-dept').value;
    const apiKey = document.getElementById('set-api-key').value;
    const curPw = document.getElementById('set-cur-pw').value;
    const newPw = document.getElementById('set-new-pw').value;

    let session = JSON.parse(localStorage.getItem(DB_SESSION));
    let users = JSON.parse(localStorage.getItem(DB_USERS));
    const userIdx = users.findIndex(u => u.email === session.email);

    // 1. 기본 정보 업데이트
    users[userIdx].name = name;
    users[userIdx].dept = dept;
    users[userIdx].apiKey = apiKey;

    // 2. 비밀번호 변경 로직
    if (curPw && newPw) {
        if (users[userIdx].pw !== curPw) {
            alert('현재 비밀번호가 틀립니다.');
            return;
        }
        users[userIdx].pw = newPw;
        alert('비밀번호가 변경되었습니다.');
    }

    // 저장
    localStorage.setItem(DB_USERS, JSON.stringify(users));
    localStorage.setItem(DB_SESSION, JSON.stringify(users[userIdx]));
    
    alert('설정이 저장되었습니다.');
    loadUserProfile();
}

/* =========================================
   3. 기존 앱 기능 (Tab, Table 연동 등)
========================================= */

function showTab(tabId, updateUrl = true) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.menu li, .bottom-menu li').forEach(item => item.classList.remove('active'));

    const target = document.getElementById(tabId);
    if(target) target.classList.add('active');
    const menu = document.getElementById('menu-' + tabId);
    if(menu) menu.classList.add('active');

    if(tabId === 'settings') loadUserProfile();
    if(tabId === 'reportList') updateCompanyLists();
}

function updateCompanyLists() {
    const companies = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const dropdowns = document.querySelectorAll('.company-dropdown');
    dropdowns.forEach(select => {
        select.innerHTML = '<option value="">업체를 선택하세요</option>';
        companies.forEach(c => select.innerHTML += `<option value="${c.name}">${c.name}</option>`);
    });

    const body = document.getElementById('company-list-body');
    if(body) {
        body.innerHTML = companies.length ? companies.map(c => `
            <tr><td><strong>${c.name}</strong></td><td>${c.rep}</td><td>${c.date}</td><td><button class="btn-small-outline">수정</button></td></tr>
        `).join('') : '<tr><td colspan="4" style="text-align:center;">업체 없음</td></tr>';
    }
}

// (기타 saveCompanyData, generateReport 등 기존 기능 함수들 유지...)
