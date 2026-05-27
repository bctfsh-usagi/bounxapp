import { WalletController, ConnectType, getChainOptions } from '@xpla/wallet-controller';
import { MsgExecuteContract, Fee } from '@xpla/xpla.js';

window.XplaWC = {
  WalletController,
  ConnectType,
  getChainOptions,
  MsgExecuteContract,
  Fee,
};
window.dispatchEvent(new Event('xpla-wc-loaded'));
