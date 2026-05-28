// ============ App Constants ============
const CATEGORIES = [
  { id: 'research', icon: '📊', name: '리서치', desc: '시장/경쟁사/주제 조사' },
  { id: 'content', icon: '📝', name: '콘텐츠', desc: '블로그/카피/스토리' },
  { id: 'code', icon: '💻', name: '코드', desc: '리뷰/스크립트/도구' },
  { id: 'design', icon: '🎨', name: '디자인', desc: 'UI/그래픽/일러스트' },
  { id: 'data', icon: '📈', name: '데이터', desc: '분석/시각화/정제' },
  { id: 'translation', icon: '🌐', name: '번역', desc: '한↔영 외 다국어' },
  { id: 'marketing', icon: '📣', name: '마케팅', desc: 'SNS/광고/전략' },
  { id: 'planning', icon: '🎯', name: '기획', desc: '제품/서비스/이벤트' },
  { id: 'video', icon: '🎬', name: '영상', desc: '편집/자막/요약' },
  { id: 'ai', icon: '🤖', name: 'AI/자동화', desc: '프롬프트/봇/자동화' },
];

const STATUS_TABS = [
  { id: 'all', label: '전체', icon: '' },
  { id: 'open', label: '진행 가능', icon: '' },
  { id: 'progress', label: '진행 중', icon: '' },
  { id: 'review', label: '검토 대기', icon: '' },
  { id: 'done', label: '완료', icon: '' },
];

const PAGE_SIZE = 10;

let bounties = {};
let activeCategory = 'all';
let activeStatus = 'open';
let activeSort = 'newest';
let userInterests = [];
let feedMode = 'recommended';
let currentTab = 'home';
let displayCount = PAGE_SIZE;
let refreshTimer = null;


function loadInterests() {
  try { const saved = localStorage.getItem('bounx-interests'); if (saved) userInterests = JSON.parse(saved); } catch (e) { userInterests = []; }
}
function saveInterests() { localStorage.setItem('bounx-interests', JSON.stringify(userInterests)); }

function showPage(page) {
  ['page-landing', 'page-onboarding', 'page-app'].forEach(id => { document.getElementById(id).classList.add('hidden'); });
  document.getElementById('page-' + page).classList.remove('hidden');
  window.scrollTo(0, 0);
}
function startApp() {
  loadInterests();
  if (userInterests.length === 0) { showPage('onboarding'); renderCategoryGrid(); }
  else { enterApp(); }
}
function goToLanding() { if (refreshTimer) clearInterval(refreshTimer); showPage('landing'); }

function enterApp() {
  showPage('app');
  initUser();
  if (!currentUser) {
    showWalletModal();
  } else {
    updateUserUI();
    refreshBalance();
  }
  renderStatusTabs();
  renderCategoryChips();
  populateCategorySelect();
  loadContractBounties();
  startAutoRefresh();
  const isDebug = new URLSearchParams(window.location.search).get('debug') === '1';
  const panelBtn = document.getElementById('xplaPanelBtn');
  if (panelBtn) panelBtn.style.display = isDebug ? '' : 'none';
}


async function loadContractBounties() {
  try {
    const raw = await fetchBounties();
    bounties = {};
    raw.forEach(r => {
      const mapped = mapContractBounty(r);
      bounties[mapped.id] = mapped;
    });
    if (currentTab === 'home') renderHome();
    else renderActivity();
  } catch (e) {
    console.error('Failed to load bounties:', e);
    showToast('바운티 로딩 실패: ' + e.message);
  }
}

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => { loadContractBounties(); }, 15000);
}

// ============ Utils ============
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return m + '분 전';
  const h = Math.floor(m / 60);
  if (h < 24) return h + '시간 전';
  const d = Math.floor(h / 24);
  return d + '일 전';
}

function escapeHtml(s) { if (!s) return ''; return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}
