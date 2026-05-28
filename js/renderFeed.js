// ============ Onboarding / Feed / Filters / Activity Rendering ============

// ============ 온보딩 ============
function renderCategoryGrid() {
  const grid = document.getElementById('categoryGrid');
  grid.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'cat-card rounded-2xl p-4 relative';
    card.dataset.id = cat.id;
    card.onclick = () => toggleCategory(cat.id);
    if (userInterests.includes(cat.id)) card.classList.add('selected');
    card.innerHTML = `
      <div class="cat-check absolute top-2 right-2"><div class="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center"><svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></div></div>
      <div class="text-2xl mb-2">${cat.icon}</div>
      <div class="font-semibold text-sm text-neutral-900 mb-0.5">${cat.name}</div>
      <div class="text-xs text-neutral-500">${cat.desc}</div>
    `;
    grid.appendChild(card);
  });
  updateOnboardingState();
}
function toggleCategory(id) {
  const idx = userInterests.indexOf(id);
  if (idx >= 0) userInterests.splice(idx, 1);
  else userInterests.push(id);
  document.querySelectorAll('.cat-card').forEach(card => { if (card.dataset.id === id) card.classList.toggle('selected'); });
  updateOnboardingState();
}
function selectAll() {
  userInterests = CATEGORIES.map(c => c.id);
  document.querySelectorAll('.cat-card').forEach(c => c.classList.add('selected'));
  updateOnboardingState();
}
function updateOnboardingState() {
  const count = userInterests.length;
  document.getElementById('selectedCount').textContent = count;
  const btn = document.getElementById('onboardingNextBtn');
  if (count >= 3) {
    btn.disabled = false;
    btn.className = 'w-full px-6 py-3.5 rounded-2xl premium-btn text-white font-semibold text-base transition-all';
    btn.textContent = '다음 →';
  } else {
    btn.disabled = true;
    btn.className = 'w-full px-6 py-3.5 rounded-2xl bg-white/10 border border-white/10 text-white/35 font-semibold text-base cursor-not-allowed transition-all';
    btn.textContent = (3 - count) + '개 더 선택해주세요';
  }
}
function completeOnboarding() { if (userInterests.length < 3) return; saveInterests(); enterApp(); }
function skipOnboarding() { userInterests = CATEGORIES.map(c => c.id); saveInterests(); enterApp(); }

// ============ 탭 ============
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const desktopTab = document.getElementById('tab-' + tab);
  if (desktopTab) desktopTab.classList.add('active');
  document.querySelectorAll('[data-tab-target="' + tab + '"]').forEach(b => b.classList.add('active'));
  if (tab === 'home') {
    document.getElementById('page-home').classList.remove('hidden');
    document.getElementById('page-activity').classList.add('hidden');
    document.getElementById('floatingBtn').classList.remove('hidden');
    renderHome();
  } else {
    document.getElementById('page-home').classList.add('hidden');
    document.getElementById('page-activity').classList.remove('hidden');
    document.getElementById('floatingBtn').classList.add('hidden');
    renderActivity();
  }
}

function toggleFeedMode() {
  feedMode = feedMode === 'recommended' ? 'all' : 'recommended';
  const btn = document.getElementById('feedModeBtn');
  const title = document.getElementById('feedSectionTitle');
  if (feedMode === 'recommended') {
    btn.innerHTML = '⭐ 내 관심사';
    btn.className = 'text-xs px-2.5 py-1 rounded-lg font-semibold';
    title.textContent = '🎯 당신을 위한 추천';
  } else {
    btn.innerHTML = '🌐 전체';
    btn.className = 'text-xs px-2.5 py-1 rounded-lg font-semibold';
    title.textContent = '🌐 전체 바운티';
  }
  displayCount = PAGE_SIZE;
  renderHome();
}

// ============ 상태 탭 ============
function renderStatusTabs() {
  const container = document.getElementById('statusTabs');
  container.innerHTML = '';
  STATUS_TABS.forEach(tab => {
    const btn = document.createElement('button');
    btn.className = 'status-tab px-3 py-1.5 rounded-full text-sm font-medium' + (tab.id === activeStatus ? ' active' : '');
    btn.dataset.status = tab.id;
    btn.innerHTML = `<span>${tab.label}</span><span class="count" id="status-count-${tab.id}">0</span>`;
    btn.onclick = () => selectStatus(tab.id);
    container.appendChild(btn);
  });
}

function updateStatusCounts() {
  const all = Object.values(bounties);
  let visible = all;
  
  // 관심사 모드 + 카테고리 필터 적용
  if (feedMode === 'recommended' && userInterests.length > 0 && activeCategory === 'all') {
    visible = visible.filter(b => userInterests.includes(b.categoryId));
  }
  if (activeCategory !== 'all') {
    visible = visible.filter(b => b.categoryId === activeCategory);
  }
  
  STATUS_TABS.forEach(tab => {
    const el = document.getElementById('status-count-' + tab.id);
    if (!el) return;
    const count = tab.id === 'all' ? visible.length : visible.filter(b => b.status === tab.id).length;
    el.textContent = count;
  });
}

function selectStatus(statusId) {
  activeStatus = statusId;
  displayCount = PAGE_SIZE; // 페이지 리셋
  document.querySelectorAll('.status-tab').forEach(t => { t.classList.toggle('active', t.dataset.status === statusId); });
  renderFeed();
}

// ============ 카테고리 ============
function renderCategoryChips() {
  const container = document.getElementById('categoryChips');
  container.innerHTML = '';
  const allChip = document.createElement('button');
  allChip.className = 'chip active px-3.5 py-1.5 rounded-full text-sm font-medium';
  allChip.dataset.cat = 'all';
  allChip.textContent = '전체';
  allChip.onclick = () => selectChip('all');
  container.appendChild(allChip);
  CATEGORIES.forEach(cat => {
    const chip = document.createElement('button');
    chip.className = 'chip px-3.5 py-1.5 rounded-full text-sm font-medium';
    chip.dataset.cat = cat.id;
    chip.textContent = `${cat.icon} ${cat.name}`;
    chip.onclick = () => selectChip(cat.id);
    container.appendChild(chip);
  });
}
function selectChip(catId) {
  activeCategory = catId;
  displayCount = PAGE_SIZE;
  document.querySelectorAll('.chip').forEach(c => { c.classList.toggle('active', c.dataset.cat === catId); });
  renderFeed();
}
function populateCategorySelect() {
  const select = document.getElementById('categoryInput');
  select.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = `${cat.icon} ${cat.name}`;
    select.appendChild(opt);
  });
}
function getCategoryById(id) { return CATEGORIES.find(c => c.id === id) || { icon: '📋', name: id }; }

// ============ 정렬 ============
function toggleSortMenu(e) {
  e.stopPropagation();
  document.getElementById('sortMenu').classList.toggle('hidden');
}
function setSort(sortKey, e) {
  e.stopPropagation();
  activeSort = sortKey;
  document.querySelectorAll('.sort-item').forEach(item => { item.classList.toggle('active', item.dataset.sort === sortKey); });
  const labels = { newest: '최신순', 'reward-high': '보상↑', 'reward-low': '보상↓', popular: '인기순' };
  document.getElementById('sortLabel').textContent = labels[sortKey];
  document.getElementById('sortMenu').classList.add('hidden');
  displayCount = PAGE_SIZE;
  renderFeed();
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.sort-dropdown')) document.getElementById('sortMenu').classList.add('hidden');
});

// ============ 필터 초기화 ============
function resetFilters() {
  activeStatus = 'open';
  activeCategory = 'all';
  activeSort = 'newest';
  displayCount = PAGE_SIZE;
  feedMode = 'all';
  document.querySelectorAll('.status-tab').forEach(t => { t.classList.toggle('active', t.dataset.status === 'open'); });
  document.querySelectorAll('.chip').forEach(c => { c.classList.toggle('active', c.dataset.cat === 'all'); });
  document.querySelectorAll('.sort-item').forEach(item => { item.classList.toggle('active', item.dataset.sort === 'newest'); });
  document.getElementById('sortLabel').textContent = '최신순';
  toggleFeedMode(); // recommended로 되돌림
}

// ============ 더 보기 ============
function loadMore() {
  displayCount += PAGE_SIZE;
  renderFeed();
}

// ============ 액션 ============
function getMyActionItems() {
  if (!currentUser) return [];
  const items = [];
  Object.values(bounties).forEach(b => {
    if (b.requester === currentUser.address && b.status === 'review') items.push({ ...b, actionType: 'review', priority: 1 });
    else if (b.worker === currentUser.address && b.status === 'progress') items.push({ ...b, actionType: 'submit', priority: 2 });
    else if (b.requester === currentUser.address && b.status === 'open' && b.matchingType === 'approval') {
      items.push({ ...b, actionType: 'select-applicant', priority: 2.5 });
    }
    else if (b.worker === currentUser.address && b.status === 'review') items.push({ ...b, actionType: 'waiting-review', priority: 3 });
    else if (b.requester === currentUser.address && b.status === 'progress') items.push({ ...b, actionType: 'waiting', priority: 4 });
  });
  items.sort((a, b) => a.priority - b.priority);
  return items;
}

function renderActionSection() {
  const section = document.getElementById('actionSection');
  const row = document.getElementById('actionRow');
  const count = document.getElementById('actionCount');
  const welcomeMsg = document.getElementById('welcomeMsg');
  
  const items = getMyActionItems();
  const urgentCount = items.filter(i => i.priority <= 2).length;
  
  if (items.length === 0) {
    section.classList.add('hidden');
    welcomeMsg.textContent = '오늘도 좋은 작업이 있길!';
    return;
  }
  
  section.classList.remove('hidden');
  count.textContent = items.length;
  
  if (urgentCount > 0) welcomeMsg.innerHTML = `⚡ 액션이 필요한 작업이 <strong class="text-rose-600">${urgentCount}건</strong> 있어요`;
  else welcomeMsg.textContent = '진행 중인 작업이 있어요';
  
  row.innerHTML = '';
  items.forEach(item => {
    const cat = getCategoryById(item.categoryId);
    const card = document.createElement('div');
    card.className = 'action-card rounded-2xl p-4';
    if (item.actionType === 'review') card.classList.add('urgent');
    else if (item.actionType === 'submit') card.classList.add('working');
    else if (item.actionType === 'select-applicant') card.classList.add('urgent');
    card.onclick = () => openDetail(item.id);
    
    let actionLabel = '', actionBtn = '', badge = '';
    if (item.actionType === 'review') {
      actionLabel = '🟣 검토 필요';
      badge = '<span class="badge-review text-[10px] font-semibold px-2 py-0.5 rounded-full">검토 대기</span>';
      actionBtn = `<button onclick="event.stopPropagation(); openReview('${item.id}')" class="w-full mt-2 px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700">결과 확인하기 →</button>`;
    } else if (item.actionType === 'submit') {
      actionLabel = '🟡 작업 중';
      badge = '<span class="badge-progress text-[10px] font-semibold px-2 py-0.5 rounded-full">제출 대기</span>';
      actionBtn = `<button onclick="event.stopPropagation(); openWorkSubmit('${item.id}')" class="w-full mt-2 px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700">결과물 제출하기 →</button>`;
    } else if (item.actionType === 'select-applicant') {
      const applicantCount = item.applicants ? Object.keys(item.applicants).length : 0;
      actionLabel = '🎯 작업자 선택';
      badge = `<span class="badge-matching-approval text-[10px] font-semibold px-2 py-0.5 rounded-full">지원 ${applicantCount}명</span>`;
      actionBtn = `<button onclick="event.stopPropagation(); openApplicantsModal('${item.id}')" class="w-full mt-2 px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700">지원자 검토하기 →</button>`;
    } else if (item.actionType === 'waiting-review') {
      actionLabel = '⏳ 검토 대기 중';
      badge = '<span class="badge-review text-[10px] font-semibold px-2 py-0.5 rounded-full">제출됨</span>';
      actionBtn = `<div class="w-full mt-2 px-3 py-2 rounded-lg bg-neutral-100 text-neutral-500 text-xs text-center">의뢰자 검토 대기 중</div>`;
    } else if (item.actionType === 'waiting') {
      actionLabel = '⏳ 대기 중';
      badge = '<span class="badge-progress text-[10px] font-semibold px-2 py-0.5 rounded-full">진행 중</span>';
      actionBtn = `<div class="w-full mt-2 px-3 py-2 rounded-lg bg-neutral-100 text-neutral-500 text-xs text-center">${item.workerShort}이 작업 중</div>`;
    }
    
    card.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold ${item.actionType === 'review' || item.actionType === 'select-applicant' ? 'text-violet-700' : item.actionType === 'submit' ? 'text-amber-700' : 'text-neutral-500'}">${actionLabel}</span>
        ${badge}
      </div>
      <div class="text-xs text-neutral-500 mb-1">${cat.icon} ${cat.name}</div>
      <h3 class="font-semibold text-neutral-900 text-sm line-clamp-2 mb-2 leading-snug">${escapeHtml(item.title)}</h3>
      <div class="flex items-center gap-2 text-xs">
        <span class="font-display font-bold text-neutral-900">💰 ${item.reward} XPLA</span>
        <span class="text-neutral-400">·</span>
        <span class="text-neutral-500">${timeAgo(item.createdAt)}</span>
      </div>
      ${actionBtn}
    `;
    row.appendChild(card);
  });
}

function updateActivityDot() {
  const dots = ['activityDot', 'activityDotMobile'].map(id => document.getElementById(id)).filter(Boolean);
  const items = getMyActionItems();
  const urgent = items.filter(i => i.priority <= 2.5).length;
  dots.forEach(dot => {
    if (urgent > 0) dot.classList.remove('hidden');
    else dot.classList.add('hidden');
  });
}

// ============ 홈 ============
function renderHome() {
  renderActionSection();
  updateStatusCounts();
  renderFeed();
}

function getFilteredBounties() {
  let arr = Object.values(bounties);
  
  // 상태 필터
  if (activeStatus !== 'all') arr = arr.filter(b => b.status === activeStatus);
  
  // 카테고리 필터
  if (activeCategory !== 'all') arr = arr.filter(b => b.categoryId === activeCategory);
  
  // 추천 모드 (관심사 필터)
  if (feedMode === 'recommended' && userInterests.length > 0 && activeCategory === 'all') {
    arr = arr.filter(b => userInterests.includes(b.categoryId));
  }
  
  // 정렬
  switch (activeSort) {
    case 'newest': arr.sort((a, b) => b.createdAt - a.createdAt); break;
    case 'reward-high': arr.sort((a, b) => b.reward - a.reward); break;
    case 'reward-low': arr.sort((a, b) => a.reward - b.reward); break;
    case 'popular': arr.sort((a, b) => (b.likes || 0) - (a.likes || 0)); break;
  }
  
  return arr;
}

function renderFeed() {
  const list = document.getElementById('feedList');
  const empty = document.getElementById('feedEmpty');
  const loadMoreContainer = document.getElementById('loadMoreContainer');
  
  const filtered = getFilteredBounties();
  const visible = filtered.slice(0, displayCount);
  const remaining = filtered.length - visible.length;
  
  document.getElementById('feedCount').textContent = filtered.length + '개';
  
  Array.from(list.children).forEach(child => { if (child.id !== 'feedEmpty') child.remove(); });
  
  if (filtered.length === 0) {
    empty.style.display = '';
    loadMoreContainer.classList.add('hidden');
    
    // 빈 상태 메시지 동적 변경
    const emptyTitle = document.getElementById('emptyTitle');
    const emptyDesc = document.getElementById('emptyDesc');
    if (Object.values(bounties).length === 0) {
      emptyTitle.textContent = '아직 바운티가 없어요';
      emptyDesc.innerHTML = '첫 번째로 바운티를 등록해보세요.<br/>다른 사용자가 가져갈 수 있어요.';
    } else {
      emptyTitle.textContent = '조건에 맞는 바운티가 없어요';
      emptyDesc.textContent = '필터를 바꾸거나 새 바운티를 등록해보세요.';
    }
    return;
  }
  empty.style.display = 'none';
  
  // 더 보기 버튼 표시
  if (remaining > 0) {
    loadMoreContainer.classList.remove('hidden');
    document.getElementById('loadMoreText').textContent = `더 보기 ↓  (${remaining}개 더 있어요)`;
  } else {
    loadMoreContainer.classList.add('hidden');
  }
  
  const badges = {
    open: '<span class="badge-open text-[10px] font-semibold px-2 py-0.5 rounded-full">진행 가능</span>',
    progress: '<span class="badge-progress text-[10px] font-semibold px-2 py-0.5 rounded-full">진행 중</span>',
    review: '<span class="badge-review text-[10px] font-semibold px-2 py-0.5 rounded-full">검토 대기</span>',
    done: '<span class="badge-done text-[10px] font-semibold px-2 py-0.5 rounded-full">완료</span>',
  };
  
  visible.forEach(b => {
    const cat = getCategoryById(b.categoryId);
    const isMine = currentUser && b.requester === currentUser.address;
    const isWorker = currentUser && b.worker === currentUser.address;
    
    const card = document.createElement('article');
    card.className = 'feed-card rounded-2xl p-4 cursor-pointer' + (isMine ? ' my-bounty' : isWorker ? ' my-work' : '');
    card.onclick = (e) => { if (e.target.closest('.action-btn')) return; openDetail(b.id); };
    
    const matchingType = b.matchingType || 'firstcome';
    const explorerUrl = 'https://explorer.xpla.io/testnet/address/' + b.requester;

    // 배지 모음
    let badgeHtml = '';
    badgeHtml += `<span class="text-xs font-bold text-neutral-400 font-mono">#${b.numId}</span>`;
    badgeHtml += `<span class="text-xs text-neutral-500">${cat.icon} ${cat.name}</span>`;
    badgeHtml += badges[b.status];
    if (b.status === 'open') {
      badgeHtml += matchingType === 'firstcome'
        ? '<span class="badge-matching-firstcome text-[10px] font-semibold px-1.5 py-0.5 rounded-full">⚡ 선착순</span>'
        : '<span class="badge-matching-approval text-[10px] font-semibold px-1.5 py-0.5 rounded-full">🎯 승인 필요</span>';
    }
    if (b.paymentType === 'milestone' && b.milestones) {
      const totalMs = b.milestones.length;
      const doneCount = b.milestones.filter(m => m.status === 'done').length;
      badgeHtml += `<span class="badge-milestone text-[10px] font-semibold px-1.5 py-0.5 rounded-full">🎯 마일스톤 ${doneCount}/${totalMs}</span>`;
    }
    if (isMine) badgeHtml += '<span class="my-badge text-[10px] font-semibold px-1.5 py-0.5 rounded">나</span>';
    if (isWorker && !isMine) badgeHtml += '<span class="work-badge text-[10px] font-semibold px-1.5 py-0.5 rounded">내 작업</span>';

    // 우측 액션 — 모든 버튼 동일 크기(고정 너비), 일관된 텍스트
    const btnBase = 'action-btn w-full px-4 py-2.5 rounded-xl text-xs font-semibold text-center transition-colors';
    const myChip = `<div class="${btnBase}" style="background:rgba(139,92,246,0.12);color:var(--bx-purple,#7357a6);border:1px solid rgba(139,92,246,0.28);cursor:default">📋 내 바운티</div>`;
    let actionHtml = '';
    if (b.status === 'open' && !isMine && currentUser) {
      // 지원 가능 — 강조 배지 + 버튼
      actionHtml = `<div class="w-full flex flex-col items-center gap-1.5">`
        + `<span class="text-[10px] font-bold whitespace-nowrap" style="color:var(--bx-accent-2,#c77742)">🔥 지원 가능!</span>`
        + `<button class="${btnBase} bg-neutral-900 text-white hover:bg-neutral-800" onclick="event.stopPropagation(); applyToBounty('${b.id}')">지원하기</button>`
        + `</div>`;
    } else if (b.status === 'open' && isMine && matchingType === 'approval') {
      actionHtml = `<button class="${btnBase} bg-violet-600 text-white hover:bg-violet-700" onclick="event.stopPropagation(); openApplicantsModal('${b.id}')">지원자 확인</button>`;
    } else if (b.status === 'progress' && isWorker) {
      actionHtml = `<button class="${btnBase} bg-violet-600 text-white hover:bg-violet-700" onclick="event.stopPropagation(); openWorkSubmit('${b.id}')">결과 제출</button>`;
    } else if (b.status === 'review' && isMine) {
      actionHtml = `<button class="${btnBase} bg-violet-600 text-white hover:bg-violet-700" onclick="event.stopPropagation(); openReview('${b.id}')">결과 확인</button>`;
    } else if (isMine) {
      // 내가 등록한 바운티 (대기/진행/완료) — 액션 불필요, 소유 표시
      actionHtml = myChip;
    } else {
      const waitLabel = b.status === 'review' ? '검토 중' : b.status === 'progress' ? '진행 중' : b.status === 'done' ? '완료' : '대기 중';
      actionHtml = `<div class="${btnBase}" style="background:var(--bx-bg-2,#efe3d2);color:var(--bx-muted,#736250);cursor:default">${waitLabel}</div>`;
    }

    let html = '<div class="flex items-stretch gap-3 md:gap-4">';

    // 왼쪽: 보상 블록
    html += '<div class="flex flex-col items-center justify-center text-center flex-shrink-0" style="min-width:80px">';
    html += `<div class="font-display text-3xl font-black leading-none text-neutral-900">${b.reward}</div>`;
    html += '<div class="text-[11px] font-bold tracking-wide text-neutral-500 mt-1">XPLA</div>';
    html += `<div class="text-[10px] text-neutral-400 mt-2 whitespace-nowrap">⏱ ${b.deadline}</div>`;
    html += '</div>';

    // 구분선
    html += '<div class="w-px self-stretch flex-shrink-0" style="background:var(--bx-line,#d9cbb8)"></div>';

    // 가운데: 내용
    html += '<div class="flex-1 min-w-0">';
    html += `<div class="flex items-center gap-1.5 flex-wrap mb-1.5">${badgeHtml}</div>`;
    html += `<h3 class="font-bold text-base text-neutral-900 leading-snug mb-1">${escapeHtml(b.title)}</h3>`;
    if (b.desc) html += `<p class="text-sm text-neutral-600 leading-relaxed line-clamp-2 mb-2.5">${escapeHtml(b.desc)}</p>`;
    else html += '<div class="mb-2.5"></div>';
    html += '<div class="flex items-center gap-1.5 text-xs text-neutral-400">';
    html += `<a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="font-mono underline hover:opacity-70" style="color:var(--bx-muted,#736250);text-underline-offset:2px" title="익스플로러에서 보기">${b.requesterShort}</a>`;
    html += `<span>·</span><span>${timeAgo(b.createdAt)}</span>`;
    html += '</div></div>';

    // 오른쪽: 액션 (고정 너비로 모든 카드 버튼 정렬)
    html += `<div class="flex items-center flex-shrink-0" style="width:108px">${actionHtml}</div>`;

    html += '</div>';
    card.innerHTML = html;
    list.appendChild(card);
  });
}

function renderActivity() {
  if (!currentUser) return;
  const list = document.getElementById('activityList');
  const bountyArr = Object.values(bounties);
  const myBounties = bountyArr.filter(b => b.requester === currentUser.address || b.worker === currentUser.address);
  myBounties.sort((a, b) => b.createdAt - a.createdAt);
  const locked = myBounties.filter(b => b.requester === currentUser.address && !['done'].includes(b.status)).reduce((s, b) => s + b.reward, 0);
  const earned = myBounties.filter(b => b.worker === currentUser.address && b.status === 'done').reduce((s, b) => s + b.reward * 0.9, 0);
  document.getElementById('stat-balance').textContent = currentUser.balance || '0';
  document.getElementById('stat-locked').textContent = locked.toFixed(1);
  document.getElementById('stat-earned').textContent = earned.toFixed(1);
  list.innerHTML = '';
  if (myBounties.length === 0) {
    list.innerHTML = '<div class="text-center py-12 text-neutral-400 text-sm">아직 활동이 없어요<br/><span class="text-xs">바운티를 등록하거나 신청해보세요</span></div>';
    return;
  }
  const statusInfo = {
    open: { label: '진행 가능', cls: 'badge-open' },
    progress: { label: '진행 중', cls: 'badge-progress' },
    review: { label: '검토 대기', cls: 'badge-review' },
    done: { label: '완료', cls: 'badge-done' },
  };
  myBounties.forEach(b => {
    const cat = getCategoryById(b.categoryId);
    const isMine = b.requester === currentUser.address;
    const item = document.createElement('div');
    item.className = 'activity-card rounded-2xl p-4 cursor-pointer transition-all';
    item.onclick = () => openDetail(b.id);
    let html = '<div class="flex items-start justify-between gap-3"><div class="flex-1 min-w-0">';
    html += '<div class="flex items-center gap-2 mb-1 flex-wrap">';
    html += `<span class="text-xs text-neutral-500">${cat.icon} ${cat.name}</span>`;
    html += `<span class="${statusInfo[b.status].cls} text-[10px] font-semibold px-2 py-0.5 rounded-full">${statusInfo[b.status].label}</span>`;
    html += `<span class="my-badge text-[10px] font-semibold px-1.5 py-0.5 rounded">${isMine ? '의뢰자' : '작업자'}</span>`;
    html += '</div>';
    html += `<div class="font-medium text-neutral-900 mb-1 truncate">${escapeHtml(b.title)}</div>`;
    html += `<div class="text-xs text-neutral-500">${timeAgo(b.createdAt)}</div>`;
    html += '</div>';
    html += '<div class="text-right flex-shrink-0">';
    html += `<div class="font-display font-bold">${b.reward} <span class="text-xs font-medium text-neutral-500">XPLA</span></div>`;
    if (b.status === 'done') html += `<div class="text-[10px] text-emerald-600 mt-0.5">${isMine ? '정산 완료' : '+ ' + (b.reward * 0.9).toFixed(1)}</div>`;
    html += '</div></div>';
    item.innerHTML = html;
    list.appendChild(item);
  });
}
