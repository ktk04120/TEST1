// ===== Firebase 초기화 =====
// [임시 테스트 모드] Storage(파일 저장소)는 아직 연결하지 않았습니다.
// 로그인 / 역할 구분 / 관리자 조회 흐름만 먼저 확인하는 용도로,
// 실제 파일은 저장하지 않고 파일 "이름"만 기록합니다.
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ===== 화면 요소 =====
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginMsg = document.getElementById('login-msg');
const roleTag = document.getElementById('role-tag');
const mainContent = document.getElementById('main-content');

let currentUser = null;
let currentRole = null; // 'user' | 'admin'
let selectedFiles = [];

// ===== 로그인 =====
document.getElementById('login-btn').addEventListener('click', () => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) {
    showLoginMsg('아이디와 비밀번호를 입력해주세요', 'error');
    return;
  }
  auth.signInWithEmailAndPassword(email, password)
    .catch(err => {
      showLoginMsg('로그인 실패: 아이디 또는 비밀번호를 확인해주세요', 'error');
    });
});

document.getElementById('logout-btn').addEventListener('click', () => {
  auth.signOut();
});

function showLoginMsg(text, type) {
  loginMsg.innerHTML = '<div class="msg ' + type + '">' + text + '</div>';
}

// ===== 로그인 상태 감지 =====
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    currentUser = null;
    currentRole = null;
    loginScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
    return;
  }
  currentUser = user;

  // users/{uid} 문서에서 role 조회
  try {
    const doc = await db.collection('users').doc(user.uid).get();
    if (!doc.exists) {
      showLoginMsg('계정에 역할(role) 정보가 없습니다. 관리자에게 문의하세요.', 'error');
      auth.signOut();
      return;
    }
    currentRole = doc.data().role; // 'user' or 'admin'
  } catch (e) {
    showLoginMsg('사용자 정보를 불러오지 못했습니다', 'error');
    auth.signOut();
    return;
  }

  loginScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  roleTag.textContent = currentRole === 'admin' ? '관리자 모드' : '현장 제출 모드';

  if (currentRole === 'admin') {
    renderAdminView();
  } else {
    renderUploadView();
  }
});

// ===== 현장 업로드 화면 =====
function renderUploadView() {
  selectedFiles = [];
  mainContent.innerHTML = `
    <div class="card">
      <div id="upload-msg"></div>
      <div class="field">
        <label>현장명</label>
        <input type="text" id="site-name" placeholder="예: 강남 A현장" />
      </div>
      <div class="field">
        <label>점검일자</label>
        <input type="date" id="site-date" value="${todayStr()}" />
      </div>
      <div class="field">
        <label>점검 자료 (사진 / PDF, 여러 개 선택 가능)</label>
        <div class="file-drop" id="file-drop">파일을 선택하려면 클릭하세요</div>
        <input type="file" id="file-input" multiple accept="image/*,application/pdf" style="display:none" />
        <div class="file-list" id="file-list"></div>
      </div>
      <button class="btn-primary" id="upload-btn">제출</button>
    </div>
  `;

  const fileDrop = document.getElementById('file-drop');
  const fileInput = document.getElementById('file-input');
  fileDrop.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    selectedFiles = Array.from(e.target.files);
    const list = document.getElementById('file-list');
    list.innerHTML = selectedFiles.map(f => '<div>📎 ' + f.name + '</div>').join('');
  });

  document.getElementById('upload-btn').addEventListener('click', submitChecklist);
}

async function submitChecklist() {
  const site = document.getElementById('site-name').value.trim();
  const date = document.getElementById('site-date').value;
  const msgBox = document.getElementById('upload-msg');
  const btn = document.getElementById('upload-btn');

  if (!site) { msgBox.innerHTML = '<div class="msg error">현장명을 입력해주세요</div>'; return; }
  if (selectedFiles.length === 0) { msgBox.innerHTML = '<div class="msg error">파일을 최소 1개 선택해주세요</div>'; return; }

  btn.disabled = true;
  btn.textContent = '제출 중...';
  msgBox.innerHTML = '';

  try {
    // [임시 테스트 모드] 실제 파일은 저장하지 않고 파일 이름만 기록합니다.
    // 나중에 Storage를 연결하면 이 부분에서 실제 업로드 후 URL을 받아오도록 바꾸면 됩니다.
    const fileNames = selectedFiles.map(f => ({ name: f.name, url: null }));

    await db.collection('submissions').add({
      site,
      date,
      files: fileNames,
      uploaderEmail: currentUser.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    msgBox.innerHTML = '<div class="msg success">제출이 완료되었습니다 (테스트 모드: 파일 이름만 기록됨)</div>';
    renderUploadView();
  } catch (e) {
    console.error(e);
    msgBox.innerHTML = '<div class="msg error">제출 중 오류가 발생했습니다. 다시 시도해주세요</div>';
    btn.disabled = false;
    btn.textContent = '제출';
  }
}

// ===== 관리자 화면 =====
let allSubmissions = [];
let filterSite = 'all';

async function renderAdminView() {
  mainContent.innerHTML = `
    <div class="filters">
      <select id="filter-site"><option value="all">전체 현장</option></select>
      <button class="refresh-btn" id="refresh-btn">새로고침</button>
    </div>
    <div id="admin-list"><div class="empty">불러오는 중...</div></div>
  `;
  document.getElementById('refresh-btn').addEventListener('click', loadSubmissions);
  document.getElementById('filter-site').addEventListener('change', (e) => {
    filterSite = e.target.value;
    renderAdminList();
  });
  await loadSubmissions();
}

async function loadSubmissions() {
  const listBox = document.getElementById('admin-list');
  listBox.innerHTML = '<div class="empty">불러오는 중...</div>';
  try {
    const snap = await db.collection('submissions').orderBy('createdAt', 'desc').get();
    allSubmissions = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const sites = Array.from(new Set(allSubmissions.map(s => s.site))).sort();
    const sel = document.getElementById('filter-site');
    sel.innerHTML = '<option value="all">전체 현장</option>' +
      sites.map(s => '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + '</option>').join('');
    sel.value = filterSite;

    renderAdminList();
  } catch (e) {
    console.error(e);
    listBox.innerHTML = '<div class="empty">데이터를 불러오지 못했습니다. 새로고침을 눌러 다시 시도해주세요.</div>';
  }
}

function renderAdminList() {
  const listBox = document.getElementById('admin-list');
  let items = allSubmissions;
  if (filterSite !== 'all') items = items.filter(s => s.site === filterSite);

  if (items.length === 0) {
    listBox.innerHTML = '<div class="empty">제출된 자료가 없습니다.</div>';
    return;
  }

  listBox.innerHTML = items.map(s => `
    <div class="sub-item">
      <div class="sub-top">
        <div>
          <div class="sub-site">${escapeHtml(s.site)}</div>
          <div class="sub-meta">${escapeHtml(s.date || '')} · 제출자 ${escapeHtml(s.uploaderEmail || '')}</div>
        </div>
      </div>
      <div class="sub-files">
        ${(s.files || []).map(f => f.url
          ? '<a href="' + f.url + '" target="_blank" rel="noopener">📎 ' + escapeHtml(f.name) + '</a>'
          : '<span style="display:inline-block;margin:6px 6px 0 0;font-size:12.5px;color:#6B7178;border:1px solid #E1DCCF;border-radius:6px;padding:4px 9px;">📎 ' + escapeHtml(f.name) + ' (테스트 모드: 파일 미저장)</span>'
        ).join('')}
      </div>
    </div>
  `).join('');
}

// ===== 유틸 =====
function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
