// ============ XPLA Contract Config ============
const XPLA = {
  lcd: 'https://cube-lcd.xpla.dev',
  chainId: 'cube_47-5',
  contract: 'xpla1g7trqwupk4qfl5ltkdne6lsdclu2zd22usy9xquvxyrpzuv7kqvqm4ez8e',
  denom: 'axpla',
  decimals: 18,
};
const TX_FEE_GAS = 1000000;
const TX_FEE_AMOUNT = '500000000000000000axpla';
const TX_FEE_XPLA = 0.5;
const EXPLORER_TX_URL = 'https://explorer.xpla.io/testnet/tx/';

async function xplaQuery(queryMsg) {
  const encoded = btoa(JSON.stringify(queryMsg));
  const res = await fetch(`${XPLA.lcd}/cosmwasm/wasm/v1/contract/${XPLA.contract}/smart/${encoded}`);
  if (!res.ok) throw new Error(`LCD query failed: HTTP ${res.status}`);
  return (await res.json()).data;
}

async function xplaGetBalance(address) {
  const res = await fetch(`${XPLA.lcd}/cosmos/bank/v1beta1/balances/${address}`);
  const json = await res.json();
  const coin = json.balances?.find(b => b.denom === XPLA.denom);
  if (!coin) return '0';
  return axplaToXpla(coin.amount);
}

function axplaToXpla(axplaStr) {
  const raw = BigInt(axplaStr);
  const whole = raw / BigInt(10 ** XPLA.decimals);
  const frac = ((raw % BigInt(10 ** XPLA.decimals)) * 100n / BigInt(10 ** XPLA.decimals)).toString().padStart(2, '0');
  return `${whole}.${frac}`;
}

function axplaToNumber(axplaStr) {
  const raw = BigInt(axplaStr);
  return Number(raw) / (10 ** XPLA.decimals);
}

function xplaToAxpla(xplaAmount) {
  const parts = String(xplaAmount).split('.');
  const whole = BigInt(parts[0] || '0');
  let frac = (parts[1] || '0').padEnd(XPLA.decimals, '0').slice(0, XPLA.decimals);
  return (whole * BigInt(10 ** XPLA.decimals) + BigInt(frac)).toString();
}

// ============ Contract Data Layer ============
async function fetchBounties(opts = {}) {
  const batchSize = 50;
  const all = [];
  let startAfter = opts.startAfter || undefined;
  while (true) {
    const query = { list_bounties: { limit: batchSize } };
    if (opts.status) query.list_bounties.status = opts.status;
    if (opts.client) query.list_bounties.client = opts.client;
    if (opts.worker) query.list_bounties.worker = opts.worker;
    if (startAfter) query.list_bounties.start_after = startAfter;
    const data = await xplaQuery(query);
    const batch = data.bounties || [];
    all.push(...batch);
    if (batch.length < batchSize) break;
    startAfter = batch[batch.length - 1].id;
    if (all.length > 500) break;
  }
  return all;
}

async function fetchBounty(bountyId) {
  return await xplaQuery({ get_bounty: { bounty_id: Number(bountyId) } });
}

async function fetchApplicants(bountyId) {
  const data = await xplaQuery({ get_applicants: { bounty_id: Number(bountyId) } });
  return data.applicants || [];
}

async function fetchConfig() {
  return await xplaQuery({ config: {} });
}

function mapContractBounty(raw) {
  const rewardNum = axplaToNumber(raw.reward_amount);
  const statusMap = { open: 'open', assigned: 'progress', in_progress: 'progress', submitted: 'review', settled: 'done', cancelled: 'done' };
  const deadlineSec = raw.deadline;
  const now = Math.floor(Date.now() / 1000);
  const remaining = deadlineSec - now;
  let deadlineLabel;
  if (remaining <= 0) deadlineLabel = '만료됨';
  else if (remaining < 3600) deadlineLabel = Math.floor(remaining / 60) + '분 남음';
  else if (remaining < 86400) deadlineLabel = Math.floor(remaining / 3600) + '시간 남음';
  else deadlineLabel = Math.floor(remaining / 86400) + '일 남음';

  return {
    id: String(raw.id),
    numId: raw.id,
    title: raw.title,
    categoryId: raw.category,
    desc: raw.description,
    reward: Math.round(rewardNum * 100) / 100,
    rewardAxpla: raw.reward_amount,
    deadline: deadlineLabel,
    deadlineTimestamp: deadlineSec,
    status: statusMap[raw.status] || raw.status,
    contractStatus: raw.status,
    requester: raw.client,
    requesterShort: raw.client.slice(0, 8) + '...' + raw.client.slice(-4),
    worker: raw.worker || null,
    workerShort: raw.worker ? raw.worker.slice(0, 8) + '...' + raw.worker.slice(-4) : null,
    createdAt: raw.created_at * 1000,
    likes: 0,
    matchingType: raw.matching_type === 'first_come' ? 'firstcome' : raw.matching_type,
    paymentType: raw.payment_type,
    milestones: raw.milestones.map((m, i) => ({
      id: `m_${i}`, title: m.title, percent: m.percent,
      reward: Math.round(rewardNum * m.percent / 100 * 100) / 100,
      status: m.completed ? 'done' : (i === raw.current_milestone_index && ['assigned','in_progress','submitted'].includes(raw.status) ? 'active' : 'pending'),
    })),
    currentMilestone: raw.current_milestone_index,
    submission: raw.latest_summary ? { summary: raw.latest_summary, proofBundle: raw.latest_proof_hash || '', submittedAt: raw.submitted_at ? raw.submitted_at * 1000 : null } : null,
    externalLink: raw.external_link,
  };
}
