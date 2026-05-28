// ============ Modals / Action Flows / XPLA Debug Panel ============

// ============ 등록 ============
function openCreateModal() { 
  document.getElementById('createModal').classList.remove('hidden'); 
  document.getElementById('createModal').classList.add('flex');
  // 옵션 초기화
  setTimeout(() => { updateMatchingOption(); updatePaymentOption(); }, 50);
}
function closeCreateModal() { document.getElementById('createModal').classList.add('hidden'); document.getElementById('createModal').classList.remove('flex'); }
function updatePreview() {
  const v = parseFloat(document.getElementById('rewardInput').value) || 0;
  document.getElementById('previewAgent').textContent = (v * 0.9).toFixed(1) + ' XPLA';
  document.getElementById('previewValidator').textContent = (v * 0.03).toFixed(1) + ' XPLA';
  document.getElementById('previewBurn').textContent = (v * 0.03).toFixed(1) + ' XPLA';
  document.getElementById('previewEco').textContent = (v * 0.04).toFixed(1) + ' XPLA';
  const needed = document.getElementById('previewNeeded');
  if (needed) needed.textContent = '~' + (v + TX_FEE_XPLA).toFixed(1) + ' XPLA';
  document.getElementById('previewTotal').textContent = v + ' XPLA';
  // 마일스톤 금액 다시 계산
  updateMilestoneSummary();
}
document.getElementById('rewardInput').addEventListener('input', updatePreview);

function updateMatchingOption() {
  const selected = document.querySelector('input[name="matchingType"]:checked');
  const hint = document.getElementById('matchingHint');
  if (!selected || !hint) return;
  if (selected.value === 'firstcome') {
    hint.innerHTML = '⚡ 빠르게 시작할 수 있어요. 정량적 작업에 적합 (번역, 데이터 정제 등)';
  } else {
    hint.innerHTML = '🎯 지원자를 보고 작업자를 선택할 수 있어요. 정성적 작업에 적합 (디자인, 기획 등)';
  }
}

// 결제 방식 토글
function updatePaymentOption() {
  const selected = document.querySelector('input[name="paymentType"]:checked');
  const hint = document.getElementById('paymentHint');
  const section = document.getElementById('milestoneSection');
  if (!selected || !hint || !section) return;
  if (selected.value === 'lump') {
    hint.innerHTML = '💰 작업 완료 후 한 번에 정산해요. 빠르고 단순한 작업에 적합';
    section.classList.add('hidden');
  } else {
    hint.innerHTML = '🎯 마일스톤마다 결과 검토 후 단계별 정산. 큰 프로젝트에 적합 (디자인, 개발 등)';
    section.classList.remove('hidden');
    // 마일스톤이 비어있으면 기본 2개 생성
    const list = document.getElementById('milestoneList');
    if (list.children.length === 0) {
      addMilestone('초안', 40);
      addMilestone('최종안', 60);
    }
    updateMilestoneSummary();
  }
}

// 마일스톤 추가
function addMilestone(title = '', percent = 0) {
  const list = document.getElementById('milestoneList');
  const idx = list.children.length;
  const item = document.createElement('div');
  item.className = 'milestone-item';
  
  // 자동 퍼센트 계산 (남은 거 N등분)
  if (percent === 0) {
    const remaining = 100 - Array.from(list.querySelectorAll('.ms-percent')).reduce((s, el) => s + (parseInt(el.value) || 0), 0);
    percent = Math.max(remaining, 10);
  }
  
  item.innerHTML = `
    <div class="flex items-start gap-2 mb-2">
      <div class="milestone-step pending flex-shrink-0">${idx + 1}</div>
      <div class="flex-1 min-w-0">
        <input type="text" class="ms-title w-full" placeholder="마일스톤 제목 (예: 초안 제출)" value="${escapeHtml(title)}" maxlength="40" />
      </div>
      <button type="button" onclick="removeMilestone(this)" class="milestone-remove-btn flex-shrink-0">✕</button>
    </div>
    <div class="flex items-center gap-2">
      <label class="text-[11px] text-white/55">비율</label>
      <input type="number" class="ms-percent" style="width: 70px" value="${percent}" min="5" max="100" oninput="updateMilestoneSummary()" />
      <span class="text-[11px] text-white/55">%</span>
      <span class="text-[11px] text-white/45 ms-amount-display ml-auto"></span>
    </div>
  `;
  list.appendChild(item);
  updateMilestoneSummary();
}

// 마일스톤 삭제
function removeMilestone(btn) {
  const list = document.getElementById('milestoneList');
  if (list.children.length <= 1) {
    showToast('최소 1개 이상 필요해요');
    return;
  }
  btn.closest('.milestone-item').remove();
  // 번호 재정렬
  Array.from(list.querySelectorAll('.milestone-step')).forEach((el, i) => el.textContent = i + 1);
  updateMilestoneSummary();
}

// 마일스톤 합계 표시
function updateMilestoneSummary() {
  const list = document.getElementById('milestoneList');
  const summary = document.getElementById('milestoneSummary');
  const reward = parseFloat(document.getElementById('rewardInput').value) || 0;
  if (!summary) return;
  
  const percents = Array.from(list.querySelectorAll('.ms-percent')).map(el => parseInt(el.value) || 0);
  const total = percents.reduce((s, p) => s + p, 0);
  
  // 각 마일스톤 금액 표시
  Array.from(list.children).forEach((item, i) => {
    const amountEl = item.querySelector('.ms-amount-display');
    if (amountEl && reward > 0) {
      const amount = (reward * (percents[i] || 0) / 100).toFixed(1);
      amountEl.textContent = `${amount} XPLA`;
    } else if (amountEl) {
      amountEl.textContent = '';
    }
  });
  
  if (total === 100) {
    summary.innerHTML = `<span class="text-emerald-300">✓ 합계 ${total}% (정확함)</span>`;
  } else {
    summary.innerHTML = `<span class="text-amber-300">⚠️ 합계 ${total}% (100%가 되도록 조정해주세요)</span>`;
  }
}

function submitBounty() {
  if (!currentUser) { showWalletModal(); return; }
  const title = document.getElementById('titleInput').value.trim();
  const categoryId = document.getElementById('categoryInput').value;
  const desc = document.getElementById('descInput').value.trim();
  const reward = parseFloat(document.getElementById('rewardInput').value);
  const deadlineSelect = document.getElementById('deadlineInput').value;
  const matchingType = document.querySelector('input[name="matchingType"]:checked')?.value || 'firstcome';
  const paymentType = document.querySelector('input[name="paymentType"]:checked')?.value || 'lump';

  if (!title) { showToast('제목을 입력해주세요'); return; }
  if (isNaN(reward) || reward <= 0) { showToast('보상 금액은 0보다 커야 해요'); return; }
  if (reward < 0.01) { showToast('최소 보상은 0.01 XPLA예요'); return; }
  const rewardStr = String(reward);
  if (rewardStr.includes('.') && rewardStr.split('.')[1].length > 6) { showToast('소수점 6자리까지만 입력 가능해요'); return; }

  const deadlineMap = { '12시간': 12*3600, '1일': 86400, '3일': 3*86400, '7일': 7*86400 };
  const deadlineSeconds = Math.floor(Date.now() / 1000) + (deadlineMap[deadlineSelect] || 14*86400);

  let milestoneInputs = [];
  if (paymentType === 'milestone') {
    const list = document.getElementById('milestoneList');
    const items = Array.from(list.children);
    if (items.length < 1) { showToast('마일스톤을 최소 1개 만들어주세요'); return; }
    let totalPercent = 0;
    for (let i = 0; i < items.length; i++) {
      const msTitle = items[i].querySelector('.ms-title').value.trim();
      const percent = parseInt(items[i].querySelector('.ms-percent').value) || 0;
      if (!msTitle) { showToast(`마일스톤 ${i + 1} 제목을 입력해주세요`); return; }
      if (percent < 5) { showToast(`마일스톤 ${i + 1} 비율은 최소 5% 이상`); return; }
      totalPercent += percent;
      milestoneInputs.push({ title: msTitle, percent: percent });
    }
    if (totalPercent !== 100) { showToast(`마일스톤 합계가 100%여야 해요 (현재 ${totalPercent}%)`); return; }
  }

  const contractMatchingType = matchingType === 'firstcome' ? 'first_come' : 'approval';
  const executeMsg = {
    create_bounty: {
      title: title,
      description: desc || title,
      category: categoryId,
      external_link: null,
      deadline: deadlineSeconds,
      matching_type: contractMatchingType,
      payment_type: paymentType,
      milestones: milestoneInputs,
    }
  };

  const axplaAmount = xplaToAxpla(String(reward));
  closeCreateModal();
  executeContract(executeMsg, axplaAmount, '등록 완료!').catch(() => {});
}



function applyToBounty(bountyId) {
  if (!currentUser) { showWalletModal(); return; }
  const b = bounties[bountyId];
  if (!b || b.status !== 'open') { showToast('이미 신청된 바운티예요'); return; }
  if (b.requester === currentUser.address) { showToast('자기 바운티에는 신청할 수 없어요'); return; }

  const matchingType = b.matchingType || 'firstcome';
  if (matchingType === 'approval') {
    openApplyMessageModal(bountyId);
  } else {
    const executeMsg = { apply_to_bounty: { bounty_id: b.numId, message: 'I want to work on this bounty' } };
    executeContract(executeMsg, '0', '신청 완료!').catch(() => {});
  }
}

function openApplyMessageModal(bountyId) {
  const b = bounties[bountyId];
  if (!b) return;

  let html = '<div class="space-y-4">';
  html += `<div class="comment-area rounded-xl p-3.5"><div class="text-xs text-white/55 mb-1">${getCategoryById(b.categoryId).icon} ${getCategoryById(b.categoryId).name} · 🎯 승인 필요</div><div class="font-semibold text-white text-sm">${escapeHtml(b.title)}</div></div>`;
  html += '<div><label class="block text-sm font-medium text-neutral-700 mb-1.5">자기소개 메시지</label><textarea id="applyMessageInput" class="input-field w-full px-3.5 py-2.5 rounded-xl text-sm resize-none" rows="4" placeholder="왜 내가 이 작업에 적합한지 짧게 소개해주세요. 예: 부동산 분야 5년 경험, 3일 안에 마무리 가능합니다."></textarea></div>';
  html += '<div class="bg-violet-50/10 rounded-xl p-3 text-xs border border-violet-100/30"><div class="font-semibold text-violet-200 mb-1">🎯 승인 대기</div><div class="text-white/60 leading-relaxed">의뢰자가 지원자 중에서 작업자를 선택해요. 선택되면 알림이 옵니다.</div></div>';
  html += '<div class="flex gap-2">';
  html += '<button onclick="closeApplyModal()" class="flex-1 px-4 py-2.5 rounded-xl premium-secondary-btn font-semibold text-sm">취소</button>';
  html += `<button onclick="submitApplication('${b.id}')" class="flex-1 px-4 py-2.5 rounded-xl premium-btn text-white font-semibold text-sm">이 작업 지원하기</button>`;
  html += '</div></div>';
  
  document.getElementById('applyContent').innerHTML = html;
  document.getElementById('applyModal').classList.remove('hidden');
  document.getElementById('applyModal').classList.add('flex');
}

function closeApplyModal() {
  document.getElementById('applyModal').classList.add('hidden');
  document.getElementById('applyModal').classList.remove('flex');
}

function submitApplication(bountyId) {
  const message = document.getElementById('applyMessageInput').value.trim();
  if (!message) { showToast('자기소개 메시지를 작성해주세요'); return; }
  if (message.length < 10) { showToast('조금 더 자세히 적어주세요 (10자 이상)'); return; }
  const b = bounties[bountyId];
  if (!b) return;
  const executeMsg = { apply_to_bounty: { bounty_id: b.numId, message: message } };
  closeApplyModal();
  executeContract(executeMsg, '0', '지원 완료!').catch(() => {});
}

async function openApplicantsModal(bountyId) {
  const b = bounties[bountyId];
  if (!b) return;
  const cat = getCategoryById(b.categoryId);

  document.getElementById('applicantsContent').innerHTML = '<div class="text-center py-8 text-white/55"><div class="text-sm">지원자 로딩 중...</div></div>';
  document.getElementById('applicantsModal').classList.remove('hidden');
  document.getElementById('applicantsModal').classList.add('flex');

  let applicantList = [];
  try { applicantList = await fetchApplicants(b.numId); } catch (e) { console.error(e); }

  let html = '<div class="space-y-3">';
  html += `<div class="comment-area rounded-xl p-3.5"><div class="text-xs text-white/55 mb-1">${cat.icon} ${cat.name} · 🎯 승인 필요</div><div class="font-semibold text-white text-sm">${escapeHtml(b.title)}</div></div>`;

  if (applicantList.length === 0) {
    html += '<div class="text-center py-8 text-white/55"><div class="text-3xl mb-2">🕊️</div><div class="text-sm">아직 지원자가 없어요</div><div class="text-xs mt-1">조금만 기다려주세요</div></div>';
  } else {
    html += `<div class="text-xs text-white/55 mb-2">총 <span class="text-white font-semibold">${applicantList.length}명</span>이 지원했어요. 한 명을 선택해주세요.</div>`;
    applicantList.forEach(a => {
      const workerAddr = a.worker;
      const shortAddr = workerAddr.slice(0, 8) + '...' + workerAddr.slice(-4);
      const avatarChar = shortAddr.slice(4, 5).toUpperCase();
      const avatarColors = ['bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700'];
      const avatarColor = avatarColors[workerAddr.charCodeAt(6) % avatarColors.length];
      html += '<div class="applicant-card rounded-xl p-3.5">';
      html += '<div class="flex items-start gap-3 mb-2">';
      html += `<div class="w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center font-bold text-xs flex-shrink-0">${avatarChar}</div>`;
      html += '<div class="flex-1 min-w-0">';
      html += `<div class="flex items-center gap-2"><span class="font-mono text-sm font-semibold text-white">${shortAddr}</span><span class="text-xs text-white/45">·</span><span class="text-xs text-white/55">${timeAgo(a.applied_at * 1000)}</span></div>`;
      html += `<div class="text-xs text-white/72 mt-1.5 leading-relaxed">${escapeHtml(a.message)}</div>`;
      html += '</div></div>';
      html += `<button onclick="selectApplicant('${b.id}', '${workerAddr}', '${shortAddr}')" class="w-full mt-2 px-3 py-2 rounded-lg premium-btn text-white text-xs font-semibold">작업자로 선택하기</button>`;
      html += '</div>';
    });
  }
  html += '</div>';
  document.getElementById('applicantsContent').innerHTML = html;
}

function closeApplicantsModal() {
  document.getElementById('applicantsModal').classList.add('hidden');
  document.getElementById('applicantsModal').classList.remove('flex');
}

function selectApplicant(bountyId, workerAddress, workerShort) {
  if (!confirm(workerShort + ' 님을 작업자로 선택하시겠어요?')) return;
  const b = bounties[bountyId];
  if (!b) return;
  const executeMsg = { accept_applicant: { bounty_id: b.numId, selected_worker: workerAddress } };
  closeApplicantsModal();
  executeContract(executeMsg, '0', '작업자 선택 완료!').catch(() => {});
}

// comments removed — not available in contract

async function openDetail(bountyId) {
  const b = bounties[bountyId];
  if (!b) return;
  const cat = getCategoryById(b.categoryId);
  const isMine = currentUser && b.requester === currentUser.address;
  const isWorker = currentUser && b.worker === currentUser.address;
  const matchingType = b.matchingType || 'firstcome';
  const labels = {
    open: '<span class="badge-open text-xs font-semibold px-2 py-0.5 rounded-full">진행 가능</span>',
    progress: '<span class="badge-progress text-xs font-semibold px-2 py-0.5 rounded-full">진행 중</span>',
    review: '<span class="badge-review text-xs font-semibold px-2 py-0.5 rounded-full">검토 대기</span>',
    done: '<span class="badge-done text-xs font-semibold px-2 py-0.5 rounded-full">완료</span>',
  };
  let html = '<div class="space-y-4">';
  html += '<div class="flex items-center justify-between flex-wrap gap-2">';
  html += `<div class="text-xs text-neutral-500 font-medium">${cat.icon} ${cat.name}</div>`;
  html += '<div class="flex items-center gap-1.5">';
  if (b.status === 'open') {
    html += matchingType === 'firstcome'
      ? '<span class="badge-matching-firstcome text-[10px] font-semibold px-2 py-0.5 rounded-full">⚡ 선착순</span>'
      : '<span class="badge-matching-approval text-[10px] font-semibold px-2 py-0.5 rounded-full">🎯 승인 필요</span>';
  }
  html += labels[b.status];
  html += '</div></div>';

  html += `<div><h2 class="font-display text-xl font-bold tracking-tight mb-2">${escapeHtml(b.title)}</h2>`;
  if (b.desc) html += `<p class="text-sm text-neutral-600 leading-relaxed whitespace-pre-wrap">${escapeHtml(b.desc)}</p>`;
  html += '</div>';
  html += '<div class="grid grid-cols-2 gap-3">';
  html += `<div class="bg-neutral-50 rounded-xl p-3" style="border:1.5px solid var(--bx-line,#d9cbb8)"><div class="text-xs text-neutral-500 mb-1">보상</div><div class="font-display text-lg font-bold">${b.reward} XPLA</div></div>`;
  html += `<div class="bg-neutral-50 rounded-xl p-3" style="border:1.5px solid var(--bx-line,#d9cbb8)"><div class="text-xs text-neutral-500 mb-1">마감</div><div class="font-display text-lg font-bold">${b.deadline}</div></div>`;
  html += '</div>';

  if (b.paymentType === 'milestone' && b.milestones && b.milestones.length > 0) {
    const currentIdx = b.currentMilestone || 0;
    html += '<div class="milestone-progress">';
    html += '<div class="flex items-center justify-between mb-3"><span class="text-sm font-semibold text-white">🎯 마일스톤 진행도</span>';
    const doneCount = b.milestones.filter(m => m.status === 'done').length;
    html += `<span class="text-xs text-white/55">${doneCount}/${b.milestones.length} 완료</span></div>`;
    html += '<div class="flex items-center mb-3">';
    b.milestones.forEach((m, i) => {
      let stepCls = 'pending', icon = i + 1;
      if (m.status === 'done') { stepCls = 'done'; icon = '✓'; }
      else if (m.status === 'active' || m.status === 'review') { stepCls = 'active'; }
      html += `<div class="milestone-step ${stepCls}">${icon}</div>`;
      if (i < b.milestones.length - 1) html += `<div class="milestone-line ${m.status === 'done' ? 'done' : ''}"></div>`;
    });
    html += '</div><div class="space-y-1.5">';
    b.milestones.forEach((m, i) => {
      let statusLabel = '';
      if (m.status === 'done') statusLabel = '<span class="text-[10px] text-emerald-300 font-semibold">✓ 완료</span>';
      else if (m.status === 'active') statusLabel = '<span class="text-[10px] text-cyan-300 font-semibold">진행 중</span>';
      else statusLabel = '<span class="text-[10px] text-white/45">대기</span>';
      html += `<div class="flex items-center justify-between gap-2 text-xs"><div class="flex items-center gap-2 flex-1 min-w-0"><span class="text-white/45 flex-shrink-0">${i + 1}.</span><span class="text-white/85 truncate ${i === currentIdx ? 'font-semibold' : ''}">${escapeHtml(m.title)}</span>${statusLabel}</div><span class="text-white/65 font-mono flex-shrink-0">${m.reward} XPLA <span class="text-white/45">(${m.percent}%)</span></span></div>`;
    });
    html += '</div></div>';
  }

  html += '<div class="space-y-2 text-xs">';
  html += `<div class="flex justify-between text-neutral-500"><span>의뢰자</span><span class="font-mono text-neutral-700">${b.requesterShort}${isMine ? ' <span class="my-badge text-[10px] font-semibold px-1.5 py-0.5 rounded ml-1">나</span>' : ''}</span></div>`;
  if (b.workerShort) html += `<div class="flex justify-between text-neutral-500"><span>작업자</span><span class="font-mono text-neutral-700">${b.workerShort}${isWorker ? ' <span class="my-badge text-[10px] font-semibold px-1.5 py-0.5 rounded ml-1">나</span>' : ''}</span></div>`;
  html += `<div class="flex justify-between text-neutral-500"><span>Bounty ID</span><span class="font-mono text-neutral-700">#${b.numId}</span></div>`;
  html += `<div class="flex justify-between text-neutral-500"><span>컨트랙트 상태</span><span class="font-mono text-neutral-700">${b.contractStatus}</span></div>`;
  html += '</div>';

  // 상태별 액션
  if (b.status === 'open' && !isMine && currentUser) {
    const btnLabel = matchingType === 'approval' ? '지원하기 📨' : '신청하기 ✋';
    html += `<button onclick="closeDetailModal(); applyToBounty('${b.id}')" class="w-full px-4 py-2.5 rounded-xl premium-btn text-white font-semibold text-sm">${btnLabel}</button>`;
  } else if (b.status === 'open' && isMine) {
    html += `<button onclick="closeDetailModal(); openApplicantsModal('${b.id}')" class="w-full px-4 py-2.5 rounded-xl premium-btn text-white font-semibold text-sm">지원자 확인하기 →</button>`;
    html += `<button onclick="closeDetailModal(); cancelBounty('${b.id}')" class="w-full mt-2 px-4 py-2.5 rounded-xl premium-secondary-btn font-semibold text-sm">바운티 취소</button>`;
  } else if (b.status === 'progress' && isWorker) {
    html += `<button onclick="closeDetailModal(); openWorkSubmit('${b.id}')" class="w-full px-4 py-2.5 rounded-xl premium-btn text-white font-semibold text-sm">결과물 제출하기</button>`;
  } else if (b.status === 'progress' && isMine) {
    html += '<div class="bg-amber-50/10 rounded-xl p-3 text-xs text-amber-200 text-center border border-amber-100/20">작업자가 결과물을 제출하기를 기다리는 중...</div>';
  } else if (b.status === 'review' && isMine) {
    html += `<button onclick="closeDetailModal(); openReview('${b.id}')" class="w-full px-4 py-2.5 rounded-xl premium-btn text-white font-semibold text-sm">결과물 검토하기</button>`;
  } else if (b.status === 'review' && isWorker) {
    html += '<div class="bg-violet-50/10 rounded-xl p-3 text-xs text-violet-200 text-center border border-violet-100/30">의뢰자의 검토를 기다리는 중...</div>';
  } else if (b.status === 'done') {
    html += '<div class="bg-emerald-50/10 rounded-xl p-3 text-xs text-emerald-200 border border-emerald-100/30"><div class="font-semibold mb-1">✓ 정산 완료</div></div>';
  }

  html += '</div>';
  document.getElementById('detailContent').innerHTML = html;
  document.getElementById('detailModal').classList.remove('hidden');
  document.getElementById('detailModal').classList.add('flex');

  // Load applicants asynchronously for approval mode bounties
  if (b.status === 'open' && isMine && matchingType === 'approval') {
    loadDetailApplicants(bountyId);
  }
}

async function loadDetailApplicants(bountyId) {
  const b = bounties[bountyId];
  if (!b) return;
  try {
    const applicants = await fetchApplicants(b.numId);
    if (applicants.length > 0) {
      b._applicants = applicants;
    }
  } catch (e) { console.error('Failed to load applicants', e); }
}

function cancelBounty(bountyId) {
  const b = bounties[bountyId];
  if (!b) return;
  if (!confirm('바운티를 취소할까요? 예치한 보상이 지갑으로 돌아옵니다.')) return;
  const executeMsg = { cancel_bounty: { bounty_id: b.numId } };
  executeContract(executeMsg, '0', '취소 완료! 보상이 반환되었어요.').catch(() => {});
}
function closeDetailModal() { document.getElementById('detailModal').classList.add('hidden'); document.getElementById('detailModal').classList.remove('flex'); }

function openWorkSubmit(bountyId) {
  const b = bounties[bountyId];
  if (!b) return;
  
  // 마일스톤 모드면 현재 활성 마일스톤 정보 표시
  const isMilestone = b.paymentType === 'milestone' && b.milestones;
  const currentMs = isMilestone ? b.milestones[b.currentMilestone || 0] : null;
  const submitReward = currentMs ? currentMs.reward : b.reward;
  
  let html = '<div class="space-y-4">';
  html += `<div class="bg-violet-50/10 rounded-xl p-3.5 border border-violet-100/30 text-sm"><div class="font-semibold text-white mb-1">📋 ${escapeHtml(b.title)}</div><div class="text-xs text-white/65">${escapeHtml(b.desc || '설명 없음')}</div></div>`;
  
  if (isMilestone && currentMs) {
    html += `<div class="bg-emerald-50/10 rounded-xl p-3 border border-emerald-100/30">`;
    html += `<div class="text-xs text-emerald-200 font-semibold mb-1">🎯 현재 마일스톤 (${(b.currentMilestone || 0) + 1}/${b.milestones.length})</div>`;
    html += `<div class="text-sm text-white font-semibold">${escapeHtml(currentMs.title)}</div>`;
    html += `<div class="text-xs text-white/65 mt-1">이 마일스톤 정산: ${currentMs.reward} XPLA (${currentMs.percent}%)</div>`;
    html += `</div>`;
  }
  
  html += '<div><label class="block text-sm font-medium text-neutral-700 mb-1.5">결과물 요약</label><textarea id="submissionInput" class="input-field w-full px-3.5 py-2.5 rounded-xl text-sm resize-none" rows="5" placeholder="작업한 결과를 정리해주세요..."></textarea></div>';
  html += `<div class="bg-emerald-50/10 rounded-xl p-3 text-xs text-emerald-200 border border-emerald-100/30"><div class="font-semibold mb-1">💰 예상 보상</div><div>승인 시 <strong>${(submitReward * 0.9).toFixed(1)} XPLA</strong>가 정산됩니다 (90%)</div></div>`;
  html += '<div class="flex gap-2">';
  html += '<button onclick="closeWorkModal()" class="flex-1 px-4 py-2.5 rounded-xl premium-secondary-btn font-semibold text-sm">취소</button>';
  html += `<button onclick="submitWork('${b.id}')" class="flex-1 px-4 py-2.5 rounded-xl premium-btn text-white font-semibold text-sm">결과물 제출하기</button>`;
  html += '</div></div>';
  document.getElementById('workContent').innerHTML = html;
  document.getElementById('workModal').classList.remove('hidden');
  document.getElementById('workModal').classList.add('flex');
}
function closeWorkModal() { document.getElementById('workModal').classList.add('hidden'); document.getElementById('workModal').classList.remove('flex'); }
function submitWork(bountyId) {
  const summary = document.getElementById('submissionInput').value.trim();
  if (!summary) { showToast('결과물 요약을 작성해주세요'); return; }
  const b = bounties[bountyId];
  if (!b) return;
  const proofHash = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(16))).map(x => x.toString(16).padStart(2,'0')).join('');
  const executeMsg = {
    submit_work: {
      bounty_id: b.numId,
      proof_hash: proofHash,
      summary: summary,
      milestone_index: b.paymentType === 'milestone' ? b.currentMilestone : null,
    }
  };
  closeWorkModal();
  executeContract(executeMsg, '0', '결과 제출 완료!').catch(() => {});
}

function openReview(bountyId) {
  const b = bounties[bountyId];
  if (!b || !b.submission) return;
  
  const isMilestone = b.paymentType === 'milestone' && b.milestones;
  const currentMs = isMilestone ? b.milestones[b.currentMilestone || 0] : null;
  const reviewReward = currentMs ? currentMs.reward : b.reward;
  
  let html = '<div class="space-y-4">';
  
  if (isMilestone && currentMs) {
    html += `<div class="bg-emerald-50/10 rounded-xl p-3 border border-emerald-100/30">`;
    html += `<div class="text-xs text-emerald-200 font-semibold mb-1">🎯 검토 중: 마일스톤 ${(b.currentMilestone || 0) + 1}/${b.milestones.length}</div>`;
    html += `<div class="text-sm text-white font-semibold">${escapeHtml(currentMs.title)}</div>`;
    html += `<div class="text-xs text-white/65 mt-1">이번 정산: ${reviewReward} XPLA · 승인 후 다음 마일스톤 활성화</div>`;
    html += `</div>`;
  }
  
  html += '<div class="bg-violet-50/10 rounded-xl p-3.5 border border-violet-100/30">';
  html += '<div class="flex items-center gap-2 mb-2"><svg class="w-4 h-4 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/></svg><span class="text-xs font-semibold text-violet-200">Proof Bundle</span></div>';
  html += `<div class="font-mono text-xs text-violet-200/80 break-all">${b.submission.proofBundle}</div></div>`;
  html += `<div><div class="text-sm font-medium text-neutral-700 mb-2">결과물 요약</div><div class="bg-neutral-50 rounded-xl p-3.5 text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">${escapeHtml(b.submission.summary)}</div></div>`;
  html += `<div><div class="text-sm font-medium text-neutral-700 mb-2">작업자 정보</div><div class="bg-neutral-50 rounded-xl p-3 text-xs"><div class="flex justify-between text-neutral-500"><span>주소</span><span class="font-mono text-neutral-700">${b.workerShort}</span></div></div></div>`;
  html += '<div class="bg-amber-50/10 rounded-xl p-3 text-xs text-amber-200 border border-amber-100/30"><div class="font-semibold mb-1">⏰ 14일 안에 응답하지 않으면</div><div class="opacity-80">컨트랙트가 자동으로 작업자에게 정산합니다</div></div>';
  html += '<div class="flex gap-2">';
  html += `<button onclick="rejectWork('${b.id}')" class="flex-1 px-4 py-2.5 rounded-xl premium-secondary-btn font-semibold text-sm">수정 요청</button>`;

  const approveLabel = '승인하고 정산하기';
  html += `<button onclick="approveWork('${b.id}')" class="flex-1 px-4 py-2.5 rounded-xl premium-btn text-white font-semibold text-sm">${approveLabel}</button>`;
  html += '</div></div>';
  document.getElementById('reviewContent').innerHTML = html;
  document.getElementById('reviewModal').classList.remove('hidden');
  document.getElementById('reviewModal').classList.add('flex');
}
function closeReviewModal() { document.getElementById('reviewModal').classList.add('hidden'); document.getElementById('reviewModal').classList.remove('flex'); }
function approveWork(bountyId) {
  const b = bounties[bountyId];
  if (!b) return;
  const executeMsg = { approve_work: { bounty_id: b.numId } };
  closeReviewModal();
  executeContract(executeMsg, '0', '정산 완료!').then(() => { openSettlement(b); }).catch(() => {});
}
function rejectWork(bountyId) {
  if (!confirm('결과물이 부족한가요? 수정을 요청하면 작업자가 다시 제출할 수 있어요.')) return;
  const b = bounties[bountyId];
  if (!b) return;
  const executeMsg = { reject_work: { bounty_id: b.numId, reason: null } };
  closeReviewModal();
  executeContract(executeMsg, '0', '수정 요청 완료!').catch(() => {});
}

// 마일스톤 정산 모달
function openMilestoneSettlement(b, milestone, isFinal) {
  const total = milestone.reward;
  let html = '<div class="space-y-3">';
  html += `<div class="text-center mb-4">`;
  html += `<div class="text-xs text-neutral-500 mb-1">${isFinal ? '🎉 최종 마일스톤 정산' : '✓ 마일스톤 정산'}</div>`;
  html += `<div class="font-display text-3xl font-bold tracking-tight text-white">${total} <span class="text-base font-medium text-white/55">XPLA</span></div>`;
  html += `<div class="text-xs text-white/65 mt-1">${escapeHtml(milestone.title)} (${milestone.percent}%)</div>`;
  html += `</div>`;
  html += '<div class="space-y-2">';
  html += `<div class="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100"><div><div class="text-sm font-medium text-emerald-900">작업자 보상</div><div class="text-xs text-emerald-700">${b.workerShort} · 90%</div></div><div class="font-display font-bold text-emerald-900">${(total * 0.9).toFixed(1)}</div></div>`;
  html += `<div class="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100"><div><div class="text-sm font-medium text-neutral-700">Validator</div><div class="text-xs text-neutral-500">검증자 · 3%</div></div><div class="font-display font-bold text-neutral-700">${(total * 0.03).toFixed(1)}</div></div>`;
  html += `<div class="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100"><div><div class="text-sm font-medium text-neutral-700">Burn</div><div class="text-xs text-neutral-500">토큰 소각 · 3%</div></div><div class="font-display font-bold text-neutral-700">${(total * 0.03).toFixed(1)}</div></div>`;
  html += `<div class="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100"><div><div class="text-sm font-medium text-neutral-700">Ecosystem · Team</div><div class="text-xs text-neutral-500">생태계 · 4%</div></div><div class="font-display font-bold text-neutral-700">${(total * 0.04).toFixed(1)}</div></div>`;
  html += '</div>';
  
  if (!isFinal) {
    const nextIdx = (b.currentMilestone || 0) + 1;
    const nextMs = b.milestones[nextIdx];
    if (nextMs) {
      html += `<div class="mt-4 px-3 py-2.5 rounded-xl bg-violet-50/10 border border-violet-100/30 flex items-start gap-2">`;
      html += `<span class="text-base">🎯</span>`;
      html += `<div class="text-xs text-violet-200"><div class="font-semibold mb-0.5">다음 마일스톤 활성화</div><div class="opacity-80">${escapeHtml(nextMs.title)} (${nextMs.reward} XPLA)</div></div>`;
      html += `</div>`;
    }
  } else {
    html += '<div class="mt-4 px-3 py-2.5 rounded-xl bg-emerald-50/10 border border-emerald-100/30 flex items-start gap-2"><svg class="w-4 h-4 mt-0.5 text-emerald-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4"/></svg><div class="text-xs text-emerald-200"><div class="font-semibold mb-0.5">프로젝트 완료!</div><div class="opacity-80">모든 마일스톤이 정산되었습니다</div></div></div>';
  }
  
  html += '<button onclick="closeSettlementModal()" class="w-full mt-3 px-4 py-2.5 rounded-xl premium-btn text-white font-semibold text-sm">확인</button>';
  html += '</div>';
  document.getElementById('settlementContent').innerHTML = html;
  document.getElementById('settlementModal').classList.remove('hidden');
  document.getElementById('settlementModal').classList.add('flex');
}

function openSettlement(b) {
  const total = b.reward;
  let html = '<div class="space-y-3">';
  html += `<div class="text-center mb-4"><div class="text-xs text-neutral-500 mb-1">총 정산액</div><div class="font-display text-3xl font-bold tracking-tight">${total} <span class="text-base font-medium text-neutral-500">XPLA</span></div></div>`;
  html += '<div class="space-y-2">';
  html += `<div class="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100"><div><div class="text-sm font-medium text-emerald-900">작업자 보상</div><div class="text-xs text-emerald-700">${b.workerShort} · 90%</div></div><div class="font-display font-bold text-emerald-900">${(total * 0.9).toFixed(1)}</div></div>`;
  html += `<div class="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100"><div><div class="text-sm font-medium text-neutral-700">Validator</div><div class="text-xs text-neutral-500">검증자 · 3%</div></div><div class="font-display font-bold text-neutral-700">${(total * 0.03).toFixed(1)}</div></div>`;
  html += `<div class="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100"><div><div class="text-sm font-medium text-neutral-700">Burn</div><div class="text-xs text-neutral-500">토큰 소각 · 3%</div></div><div class="font-display font-bold text-neutral-700">${(total * 0.03).toFixed(1)}</div></div>`;
  html += `<div class="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-100"><div><div class="text-sm font-medium text-neutral-700">Ecosystem · Team</div><div class="text-xs text-neutral-500">생태계 · 4%</div></div><div class="font-display font-bold text-neutral-700">${(total * 0.04).toFixed(1)}</div></div>`;
  html += '</div>';
  html += '<div class="mt-4 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-2"><svg class="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4"/></svg><div class="text-xs text-emerald-800"><div class="font-semibold mb-0.5">컨트랙트가 자동 분배</div><div>의뢰자 승인과 동시에 코드로 정산되었습니다</div></div></div>';
  html += '</div>';
  document.getElementById('settlementContent').innerHTML = html;
  document.getElementById('settlementModal').classList.remove('hidden');
  document.getElementById('settlementModal').classList.add('flex');
}
function closeSettlementModal() { document.getElementById('settlementModal').classList.add('hidden'); document.getElementById('settlementModal').classList.remove('flex'); }

// reward collection handled by contract automatically



['createModal', 'detailModal', 'workModal', 'reviewModal', 'settlementModal', 'walletConnectModal', 'applyModal', 'applicantsModal'].forEach(id => {
  document.getElementById(id).addEventListener('click', (e) => {
    if (e.target.id === id) { document.getElementById(id).classList.add('hidden'); document.getElementById(id).classList.remove('flex'); }
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    ['createModal', 'detailModal', 'workModal', 'reviewModal', 'settlementModal', 'applyModal', 'applicantsModal'].forEach(id => {
      document.getElementById(id).classList.add('hidden'); document.getElementById(id).classList.remove('flex');
    });
  }
});

loadInterests();

// ============ XPLA Panel (debug tools) ============

async function xplaQueryConfig() {
  const btn = document.getElementById('xplaQueryBtn');
  const result = document.getElementById('xplaConfigResult');
  btn.disabled = true; btn.textContent = '조회 중...';
  try {
    const c = await fetchConfig();
    result.innerHTML = `<div class="space-y-2 text-sm">
      <div class="flex justify-between"><span class="text-white/50">Admin</span><span class="font-mono text-[11px] text-emerald-300">${c.admin.slice(0,16)}...</span></div>
      <div class="flex justify-between"><span class="text-white/50">Treasury</span><span class="font-mono text-[11px] text-emerald-300">${c.treasury.slice(0,16)}...</span></div>
      <div class="border-t border-white/5 my-1"></div>
      <div class="flex justify-between"><span class="text-white/50">Worker</span><span class="text-white font-semibold">${c.fee_worker_bps/100}%</span></div>
      <div class="flex justify-between"><span class="text-white/50">Validator</span><span class="text-white font-semibold">${c.fee_validator_bps/100}%</span></div>
      <div class="flex justify-between"><span class="text-white/50">Burn</span><span class="text-white font-semibold">${c.fee_burn_bps/100}%</span></div>
      <div class="flex justify-between"><span class="text-white/50">Eco·Team</span><span class="text-white font-semibold">${c.fee_eco_team_bps/100}%</span></div>
      <div class="border-t border-white/5 my-1"></div>
      <div class="flex justify-between"><span class="text-white/50">만료 기간</span><span class="text-white">${c.expiration_seconds/86400}일</span></div>
      <div class="flex justify-between"><span class="text-white/50">Denom</span><span class="text-white font-mono text-xs">${c.native_denom}</span></div>
    </div>`;
    result.classList.remove('hidden');
  } catch (e) {
    result.innerHTML = `<div class="text-red-400 text-sm">조회 실패: ${e.message}</div>`;
    result.classList.remove('hidden');
  }
  btn.disabled = false; btn.textContent = 'Config 조회';
}

function xplaCreateBounty() {
  const title = document.getElementById('cbTitle').value.trim();
  const desc = document.getElementById('cbDesc').value.trim();
  const category = document.getElementById('cbCategory').value;
  const reward = document.getElementById('cbReward').value;
  if (!title) { showToast('제목을 입력하세요'); return; }
  if (!reward || parseFloat(reward) <= 0) { showToast('보상 금액을 입력하세요'); return; }
  const deadlineSeconds = Math.floor(Date.now() / 1000) + 14 * 86400;
  const executeMsg = {
    create_bounty: { title, description: desc || title, category, external_link: null, deadline: deadlineSeconds, matching_type: 'approval', payment_type: 'lump', milestones: [] }
  };
  executeContract(executeMsg, xplaToAxpla(reward), '등록 완료!').catch(() => {});
}

function openXplaPanel() {
  document.getElementById('xplaPanel').classList.remove('hidden');
  document.getElementById('xplaPanel').classList.add('flex');
  if (currentUser) {
    document.getElementById('xplaAddrInput').value = currentUser.address;
  }
}
function closeXplaPanel() {
  document.getElementById('xplaPanel').classList.add('hidden');
  document.getElementById('xplaPanel').classList.remove('flex');
}
document.getElementById('xplaPanel').addEventListener('click', (e) => {
  if (e.target.id === 'xplaPanel') closeXplaPanel();
});
