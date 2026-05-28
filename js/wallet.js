// ============ Wallet State ============
let currentUser = null;
let xplaController = null;
let xplaConnectTypes = [];
let _txPending = false;

// ============ XPLA Wallet (공식 @xpla/wallet-controller) ============
// xpla-wc.js 번들이 window.XplaWC를 제공 → 여기서 초기화
function initXplaController() {
  if (!window.XplaWC) {
    console.error('[Wallet] xpla-wc.js bundle not loaded');
    return;
  }
  const { WalletController, ConnectType } = window.XplaWC;

  xplaController = new WalletController({
    defaultNetwork: {
      name: 'testnet',
      chainID: 'cube_47-5',
      lcd: 'https://cube-lcd.xpla.dev',
    },
    walletConnectChainIds: {
      0: { name: 'testnet', chainID: 'cube_47-5', lcd: 'https://cube-lcd.xpla.dev' },
      1: { name: 'mainnet', chainID: 'dimension_37-1', lcd: 'https://dimension-lcd.xpla.dev' },
    },
  });

  xplaController.availableConnectTypes().subscribe((types) => {
    xplaConnectTypes = types;
    console.log('[Wallet] availableConnectTypes:', types);
    updateWalletModalButtons();
  });

  xplaController.states().subscribe(async (state) => {
    console.log('[Wallet] state:', state.status, state.wallets);
    if (state.status === 'WALLET_CONNECTED' && state.wallets?.length > 0) {
      const addr = state.wallets[0].xplaAddress;
      const connectType = state.wallets[0].connectType;
      let balance = '0';
      try { balance = await xplaGetBalance(addr); } catch(e) {}
      currentUser = { address: addr, shortAddress: addr.slice(0, 8) + '...' + addr.slice(-4), balance, connectType };
      saveUser(); updateUserUI();
      closeWalletConnectModal();
      showToast('지갑 연결 완료! (' + connectType + ')');
      loadContractBounties();
    }
  });

  console.log('[Wallet] Controller initialized');
}

function updateWalletModalButtons() {
  const extBtn = document.getElementById('walletConnectBtn');
  const wcBtn = document.getElementById('walletWCBtn');
  const loadMsg = document.getElementById('wcLoadingMsg');
  const installGuide = document.getElementById('walletInstallGuide');
  if (loadMsg) loadMsg.classList.add('hidden');

  const hasExtension = xplaConnectTypes.includes('EXTENSION');
  const hasWC = xplaConnectTypes.includes('WALLETCONNECT');

  if (extBtn) {
    extBtn.style.display = hasExtension ? '' : 'none';
    if (hasExtension) extBtn.classList.replace('premium-secondary-btn', 'premium-btn');
  }
  if (wcBtn) wcBtn.style.display = hasWC ? '' : 'none';

  if (installGuide) {
    const ua = navigator.userAgent || '';
    const isMobile = /android|iphone|ipad|ipod/i.test(ua);
    const needsGuide = isMobile ? !hasWC : !hasExtension;
    if (needsGuide) {
      installGuide.classList.remove('hidden');
      setupInstallLink();
    } else {
      installGuide.classList.add('hidden');
    }
  }
}

function setupInstallLink() {
  const link = document.getElementById('installLink');
  const icon = document.getElementById('installLinkIcon');
  const text = document.getElementById('installLinkText');
  const title = document.getElementById('installGuideTitle');
  const desc = document.getElementById('installGuideDesc');
  if (!link) return;

  const ua = navigator.userAgent || '';
  const isAndroid = /android/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);

  if (isAndroid) {
    link.href = 'https://play.google.com/store/apps/details?id=xpla.android';
    icon.textContent = '▶';
    text.textContent = 'Google Play에서 설치';
    title.textContent = 'XPLA Vault 앱을 설치해주세요';
    desc.textContent = '설치 후 WalletConnect(QR)로 연결할 수 있어요';
  } else if (isIOS) {
    link.href = 'https://apps.apple.com/us/app/xpla-vault/id1640593143';
    icon.textContent = '🍎';
    text.textContent = 'App Store에서 설치';
    title.textContent = 'XPLA Vault 앱을 설치해주세요';
    desc.textContent = '설치 후 WalletConnect(QR)로 연결할 수 있어요';
  } else {
    link.href = 'https://chrome.google.com/webstore/detail/xpla-vault-wallet/ocjobpilfplciaddcbafabcegbilnbnb';
    icon.textContent = '🌐';
    text.textContent = 'Chrome 익스텐션 설치';
    title.textContent = 'XPLA Vault 익스텐션이 없어요';
    desc.textContent = '설치 후 이 페이지를 새로고침 해주세요';
  }
}

function connectExtension() {
  if (!xplaController) { showToast('월렛 모듈 로딩 중...'); return; }
  xplaController.connect('EXTENSION');
}

function connectViaWC() {
  if (!xplaController) { showToast('월렛 모듈 로딩 중...'); return; }
  closeWalletConnectModal();
  showToast('XPLA Vault 앱으로 QR 코드를 스캔하세요');
  xplaController.connect('WALLETCONNECT');
}

function disconnectWallet() {
  if (xplaController) {
    try { xplaController.disconnect(); } catch(e) {}
  }
  currentUser = null;
  localStorage.removeItem('bounx-wallet');
  document.getElementById('walletInfo')?.classList.add('hidden');
  showToast('지갑 연결 해제됨');
  setTimeout(() => location.reload(), 500);
}

function friendlyError(e) {
  const m = (e.message || '').toLowerCase();
  if (m.includes('denied') || m.includes('cancel') || m.includes('reject')) return '지갑에서 서명을 취소했어요.';
  if (m.includes('insufficient fee') || m.includes('minimum global fee')) return '네트워크 수수료가 부족해요. 잠시 후 다시 시도해주세요.';
  if (m.includes('insufficient fund') || m.includes('insufficient balance')) return '잔액이 부족해요. 보상 금액과 네트워크 수수료를 확인해주세요.';
  if (m.includes('network') || m.includes('chain')) return 'XPLA 테스트넷으로 연결해주세요.';
  if (m.includes('timeout') || m.includes('fetch')) return '네트워크 연결에 문제가 있어요. 잠시 후 다시 시도해주세요.';
  return '처리 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.';
}

async function executeContract(executeMsg, axplaAmount, actionName) {
  if (!currentUser) { showWalletModal(); return; }
  if (_txPending) { showToast('이전 요청을 처리하고 있어요. 잠시만 기다려주세요.'); return; }

  if (xplaController && currentUser.connectType) {
    if (xplaController._states?.getValue) {
      const st = xplaController._states.getValue();
      if (st?.status !== 'WALLET_CONNECTED') {
        showToast('지갑 연결이 끊겼어요. 다시 연결해주세요.');
        showWalletModal();
        return;
      }
      const wcAddr = st.wallets?.[0]?.xplaAddress;
      if (wcAddr && wcAddr !== currentUser.address) {
        showToast('지갑 주소가 변경되었어요. 다시 연결해주세요.');
        disconnectWallet();
        return;
      }
      const connChainId = st.network?.chainID;
      if (connChainId && connChainId !== XPLA.chainId) {
        showToast('XPLA 테스트넷으로 연결해주세요.');
        return;
      }
    }

    if (axplaAmount && axplaAmount !== '0') {
      try {
        const balStr = await xplaGetBalance(currentUser.address);
        const balNum = parseFloat(balStr) || 0;
        const rewardNum = parseFloat(axplaToXpla(axplaAmount)) || 0;
        if (balNum < rewardNum + TX_FEE_XPLA) {
          showToast('잔액이 부족해요. 필요: ' + (rewardNum + TX_FEE_XPLA).toFixed(2) + ' XPLA, 보유: ' + balNum.toFixed(2) + ' XPLA');
          return;
        }
      } catch(e) {}
    }

    _txPending = true;
    try {
      const { MsgExecuteContract, Fee } = window.XplaWC;
      const coins = {};
      if (axplaAmount && axplaAmount !== '0') {
        coins[XPLA.denom] = axplaAmount;
      }
      const msg = new MsgExecuteContract(
        currentUser.address,
        XPLA.contract,
        executeMsg,
        Object.keys(coins).length > 0 ? coins : undefined
      );
      const fee = new Fee(TX_FEE_GAS, TX_FEE_AMOUNT);

      showToast('지갑 확인 중...');
      const result = await xplaController.post({ msgs: [msg], fee });
      const txhash = result.txhash || '';
      showTxSuccess(actionName, txhash);
      // 블록 생성 + LCD 반영까지 보통 5~7초 → 여러 번 재시도해 반영 즉시 갱신
      [3000, 6000, 9000, 13000].forEach(delay => {
        setTimeout(async () => { try { await refreshBalance(); await loadContractBounties(); } catch (e) {} }, delay);
      });
      return result;
    } catch (e) {
      console.error('[executeContract]', e);
      showToast(friendlyError(e));
      throw e;
    } finally {
      _txPending = false;
    }
  }

  vaultRedirect(executeMsg, axplaAmount, actionName);
}

function showTxSuccess(actionName, txhash) {
  const t = document.getElementById('toast');
  const short = txhash.slice(0, 10) + '...';
  t.innerHTML = '<div>' + actionName + '</div>'
    + '<div class="flex items-center gap-2 mt-1"><span class="font-mono text-xs opacity-60">' + short + '</span>'
    + '<a href="' + EXPLORER_TX_URL + txhash + '" target="_blank" class="text-xs underline opacity-75">거래 보기</a>'
    + '<button onclick="navigator.clipboard.writeText(\'' + txhash + '\');this.textContent=\'복사됨\'" class="text-xs underline opacity-75">복사</button></div>';
  t.classList.remove('hidden');
  setTimeout(() => { t.classList.add('hidden'); t.innerHTML = ''; }, 8000);
}

function vaultRedirect(executeMsg, axplaAmount, actionName) {
  navigator.clipboard.writeText(JSON.stringify(executeMsg)).catch(() => {});
  const vaultUrl = `https://vault.xpla.io/contract/execute/${XPLA.contract}`;
  window.open(vaultUrl, '_blank');
  const amountHint = axplaAmount && axplaAmount !== '0'
    ? ' → Amount에 ' + axplaToXpla(axplaAmount) + ' XPLA 입력'
    : '';
  showToast('Vault가 열렸어요! Execute Message에 붙여넣기(Ctrl+V)' + amountHint + ' → Submit');
}

// ============ Wallet / User ============
function initUser() {
  try {
    const saved = localStorage.getItem('bounx-wallet');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.connectType) {
        currentUser = parsed;
      } else {
        localStorage.removeItem('bounx-wallet');
      }
    }
  } catch (e) {}
}
function saveUser() { if (currentUser) localStorage.setItem('bounx-wallet', JSON.stringify(currentUser)); updateUserUI(); }
function updateUserUI() {
  if (!currentUser) return;
  const short = currentUser.shortAddress;
  const bal = currentUser.balance || '0';
  ['userAddress', 'userAddressMobile'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = short; });
  ['userBalance', 'userBalanceMobile', 'userBalanceHero'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = bal; });
  document.getElementById('walletInfo')?.classList.remove('hidden');
}

function showWalletModal() {
  const modal = document.getElementById('walletConnectModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  const subtitle = document.getElementById('walletModalSubtitle');
  const tip = document.getElementById('walletModalTip');
  const addrSection = document.getElementById('walletAddrSection');

  addrSection.classList.add('hidden');
  subtitle.textContent = xplaController ? 'XPLA Vault로 연결하세요' : '로딩 중...';
  tip.textContent = xplaController ? '익스텐션 또는 모바일 앱으로 연결 가능' : 'Wallet 모듈 로딩 중...';
  updateWalletModalButtons();

  if (currentUser) {
    document.getElementById('walletAddrInput').value = currentUser.address;
  }
}
function showManualConnect() {
  document.getElementById('walletAddrSection').classList.remove('hidden');
  document.getElementById('walletConnectBtn').textContent = '연결하기';
  document.getElementById('walletConnectBtn').setAttribute('onclick', 'connectManual()');
  document.getElementById('walletManualToggle').classList.add('hidden');
}
function closeWalletConnectModal() { document.getElementById('walletConnectModal').classList.add('hidden'); document.getElementById('walletConnectModal').classList.remove('flex'); }

function connectAndStart() {
  if (!xplaController) {
    showManualConnect();
    showToast('월렛 모듈 로딩 중... 주소를 직접 입력하거나 잠시 후 다시 시도해주세요');
    return;
  }
  connectExtension();
}

async function connectManual() {
  const addr = (document.getElementById('walletAddrInput').value || '').trim();
  if (!addr || !addr.startsWith('xpla1')) { showToast('올바른 XPLA 주소를 입력하세요 (xpla1...)'); return; }
  const btn = document.getElementById('walletConnectBtn');
  btn.disabled = true; btn.textContent = '연결 중...';
  let balance = '0';
  try { balance = await xplaGetBalance(addr); } catch (e) { balance = '?'; }
  currentUser = { address: addr, shortAddress: addr.slice(0, 8) + '...' + addr.slice(-4), balance: balance };
  saveUser(); updateUserUI();
  closeWalletConnectModal();
  showToast('지갑 연결 완료! (읽기 전용 — 트랜잭션에는 익스텐션 필요)');
  loadContractBounties();
  btn.disabled = false; btn.textContent = '연결하기';
}

async function refreshBalance() {
  if (!currentUser) return;
  try {
    currentUser.balance = await xplaGetBalance(currentUser.address);
    saveUser();
  } catch (e) {}
}

// ============ XPLA Panel connect (debug) ============
async function xplaConnectWallet() {
  const btn = document.querySelector('#xplaConnectBtn button');
  btn.disabled = true; btn.textContent = '연결 중...';

  let addr;
  if (xplaController && xplaConnectTypes.includes('EXTENSION')) {
    connectExtension();
    btn.disabled = false; btn.textContent = '연결';
    return;
  } else {
    const input = document.getElementById('xplaAddrInput');
    addr = (input.value || '').trim();
    if (!addr || !addr.startsWith('xpla1')) { showToast('올바른 XPLA 주소를 입력하세요'); btn.disabled = false; btn.textContent = '연결'; return; }
  }

  let balance = '0';
  try { balance = await xplaGetBalance(addr); } catch (e) { balance = '?'; }
  currentUser = { address: addr, shortAddress: addr.slice(0, 8) + '...' + addr.slice(-4), balance: balance };
  saveUser(); updateUserUI();
  document.getElementById('xplaAddrInput').value = addr;
  document.getElementById('xplaWalletAddr').textContent = addr.slice(0, 12) + '...' + addr.slice(-6);
  document.getElementById('xplaWalletBal').textContent = balance;
  document.getElementById('xplaWalletConnected').classList.remove('hidden');
  document.getElementById('xplaConnectBtn').classList.add('hidden');
  btn.disabled = false; btn.textContent = '연결';
  showToast('지갑 연결 완료!');
  loadContractBounties();
}
