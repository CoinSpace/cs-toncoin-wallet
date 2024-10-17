import { Address, Cell } from '@ton/ton';

export function areAddressesEqual(a, b) {
  try {
    return Address.parse(a).equals(Address.parse(b));
  } catch {
    return false;
  }
}

export const JETTON_OP = {
  Transfer: 0xf8a7ea5,
  TransferNotification: 0x7362d09c,
  InternalTransfer: 0x178d4519,
  Excesses: 0xd53276db,
  Burn: 0x595f07bc,
  BurnNotification: 0x7bdd97de,
};

const JETTON_OP_MAP = Object.entries(JETTON_OP).reduce((obj, [key, val]) => {
  obj[val] = key;
  return obj;
}, {});

export function parseJettonMsgBody(body) {
  if (!body) return undefined;
  const slice = Cell.fromBase64(body).beginParse();
  if (slice.remainingBits < 32) return undefined;
  const op = slice.loadUint(32);

  if (op !== JETTON_OP.Transfer && op !== JETTON_OP.InternalTransfer) {
    return undefined;
  }
  // const queryId
  slice.loadUintBig(64);
  const value = slice.loadCoins();
  const address = slice.loadMaybeAddress();

  return {
    op: JETTON_OP_MAP[op],
    incoming: op === JETTON_OP.InternalTransfer,
    value,
    address: address?.toString(),
  };
}
