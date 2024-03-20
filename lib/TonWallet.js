import * as errors from './errors.js';
import API from './API.js';
import { HDKey } from 'ed25519-keygen/hdkey';
import { concatBytes } from '@noble/hashes/utils';
import { hex, utf8 } from '@scure/base';

import {
  Amount,
  CsWallet,
  Transaction,
  utils,
} from '@coinspace/cs-common';

import { Buffer } from 'buffer';
import {
  Address,
  SendMode,
  WalletContractV4,
  beginCell,
  external,
  internal,
  storeMessage,
} from '@ton/ton';

class TonTransaction extends Transaction {
  get url() {
    if (this.development) {
      return `https://testnet.tonscan.org/tx/${this.id}`;
    }
    return `https://tonscan.org/tx/${this.id}`;
  }
}

const FEE_FACTOR = 1.05;

export default class TonWallet extends CsWallet {
  #publicKey;
  #wallet;
  #balance;
  #dustThreshold = 1n;
  #api;

  // memorized functions
  #getWalletInformation;
  #estimateMinerFee;

  get balance() {
    return new Amount(this.#balance, this.crypto.decimals);
  }

  get address() {
    return this.#wallet.address.toString({
      testOnly: this.development,
      bounceable: false,
    });
  }

  get defaultSettings() {
    return {
      bip44: "m/44'/607'/0'",
    };
  }

  get isSettingsSupported() {
    return true;
  }

  get isCsFeeSupported() {
    return true;
  }

  get isMetaSupported() {
    return true;
  }

  get isUnaliasSupported() {
    return true;
  }

  get metaNames() {
    return ['memo'];
  }

  get dummyExchangeDepositAddress() {
    return 'UQBa1jalGfCwrast5gg_PB-U2cdCHg2mPy2gUO-_4u_vuboO';
  }

  constructor(options = {}) {
    super(options);
    this.#api = new API(this);
    this.#getWalletInformation = this.memoize(this._getWalletInformation);
    this.#estimateMinerFee = this.memoize(this._estimateMinerFee);
  }

  #keypairFromSeed(seed) {
    return HDKey
      .fromMasterSeed(seed)
      .derive(this.settings.bip44);
  }

  #publicKeyFromSeed(seed) {
    return this.#keypairFromSeed(seed).publicKeyRaw;
  }

  #walletFromPublicKey(publicKey) {
    return WalletContractV4.create({
      publicKey: Buffer.from(publicKey),
      workchain: 0,
    });
  }

  async #getBalance() {
    const { balance } = await this.#getWalletInformation(this.address);
    return BigInt(balance || 0);
  }

  async _getWalletInformation(address) {
    const info = await this.#api.getWalletInformation(address);
    return info;
  }

  async #sendBoc(boc) {
    const data = await this.#api.sendBoc(boc.toString('base64'));
    return data;
  }

  async #getTransactions(address, cursor, limit) {
    const data = await this.#api.getTransactions(address.toString({
      testOnly: this.development,
      bounceable: false,
    }), cursor, limit);
    return data;
  }

  async create(seed) {
    this.typeSeed(seed);
    this.state = CsWallet.STATE_INITIALIZING;
    this.#publicKey = this.#publicKeyFromSeed(seed);
    this.#wallet = this.#walletFromPublicKey(this.#publicKey);
    this.#init();
    this.state = CsWallet.STATE_INITIALIZED;
  }

  async open(publicKey) {
    this.typePublicKey(publicKey);
    this.state = CsWallet.STATE_INITIALIZING;
    if (publicKey.settings.bip44 === this.settings.bip44) {
      this.#publicKey = hex.decode(publicKey.data);
      this.#wallet = this.#walletFromPublicKey(this.#publicKey);
      this.#init();
      this.state = CsWallet.STATE_INITIALIZED;
    } else {
      this.state = CsWallet.STATE_NEED_INITIALIZATION;
    }
  }

  #init() {
    this.#balance = BigInt(this.storage.get('balance') || 0);
  }

  async load() {
    this.state = CsWallet.STATE_LOADING;
    try {
      if (this.crypto.type === 'coin') {
        this.#balance = await this.#getBalance();
        this.storage.set('balance', this.#balance.toString());
      }
      await this.storage.save();
      this.state = CsWallet.STATE_LOADED;
    } catch (err) {
      this.state = CsWallet.STATE_ERROR;
      throw err;
    }
  }

  async cleanup() {
    await super.cleanup();
    this.memoizeClear(this.#getWalletInformation);
    this.memoizeClear(this.#estimateMinerFee);
  }

  getPublicKey() {
    return {
      settings: this.settings,
      data: hex.encode(this.#publicKey),
    };
  }

  getPrivateKey(seed) {
    this.typeSeed(seed);
    const keypair = this.#keypairFromSeed(seed);
    return [{
      address: this.address,
      privatekey: hex.encode(concatBytes(keypair.privateKey, keypair.publicKeyRaw)),
    }];
  }

  #parseAddress(address) {
    try {
      return Address.parseFriendly(address);
    } catch (err) {
      throw new errors.InvalidAddressError(address, { cause: err });
    }
  }

  validateDerivationPath(path) {
    return /^m(\/\d+')*$/.test(path);
  }

  async validateAddress({ address }) {
    super.validateAddress({ address });
    const parsed = this.#parseAddress(address);
    if (parsed.isTestOnly !== this.development) {
      throw new errors.InvalidNetworkAddressError(address);
    }
    if (this.#wallet.address.equals(parsed.address)) {
      throw new errors.DestinationEqualsSourceError();
    }
    return true;
  }

  async validateAmount({ address, amount, price, meta = {} }) {
    super.validateAmount({ address, amount, price, meta });
    const { value } = amount;
    if (value < this.#dustThreshold) {
      throw new errors.SmallAmountError(new Amount(this.#dustThreshold, this.crypto.decimals));
    }
    const maxAmount = await this.#estimateMaxAmount({ address, price, meta });
    if (value > maxAmount) {
      throw new errors.BigAmountError(new Amount(maxAmount, this.crypto.decimals));
    }
    return true;
  }

  #validateMemo(memo) {
    return utf8.decode(memo).length <= 657432;
  }

  async validateMeta({ address, meta = {} }) {
    super.validateMeta({ address, meta });
    if (meta.memo !== undefined && !this.#validateMemo(meta.memo)) {
      throw new errors.InvalidMemoError(meta.memo);
    }
    return true;
  }

  calculateCsFee({ value, price }) {
    return super.calculateCsFee(value, {
      price,
      dustThreshold: this.#dustThreshold,
    });
  }

  calculateCsFeeForMaxAmount({ value, price }) {
    return super.calculateCsFeeForMaxAmount(value, {
      price,
      dustThreshold: this.#dustThreshold,
    });
  }

  async #createTransfer({ secretKey, value, address, memo, csFeeValue, csFeeAddress }) {
    //const parsed = this.#parseAddress(address);
    const { seqno = 0, account_state: stateFrom } = await this.#getWalletInformation(this.address);
    //const { account_state: stateTo } = await this.#getWalletInformation(address);

    const messages = [internal({
      to: address,
      value,
      // https://github.com/ton-blockchain/TEPs/pull/123
      // No more Bouncing Durov
      //bounce: parsed.isBounceable ? true : (stateTo !== 'uninitialized'),
      bounce: false,
      body: memo,
    })];

    if (csFeeValue > 0n) {
      messages.push(internal({
        to: csFeeAddress,
        value: csFeeValue,
        bounce: false,
      }));
    }

    const transfer = this.#wallet.createTransfer({
      secretKey,
      seqno,
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      messages,
    });

    return {
      to: this.#wallet.address,
      init: stateFrom === 'uninitialized' ? this.#wallet.init : undefined,
      body: transfer,
    };
  }

  async _estimateMinerFee({ value, address, memo, csFeeValue, csFeeAddress }) {
    const transfer = await this.#createTransfer({
      secretKey: new Uint8Array(64),
      value,
      address,
      memo,
      csFeeValue,
      csFeeAddress,
    });

    const init = transfer.init ? {
      data: transfer.init.data.toBoc().toString('base64'),
      code: transfer.init.code.toBoc().toString('base64'),
    } : undefined;
    const { source_fees: fees } = await this.#api.estimateFee(transfer.to.toString({
      testOnly: this.development,
      bounceable: false,
    }), transfer.body.toBoc().toString('base64'), init);
    const fee = BigInt(fees.storage_fee + fees.in_fwd_fee + fees.fwd_fee + fees.gas_fee);

    if (this.development) {
      console.log({ fees, fee, csFee: csFeeValue });
    }
    return utils.multiplyAtom(fee, FEE_FACTOR);
  }

  async estimateTransactionFee({ address, amount, price, meta = {} }) {
    super.estimateTransactionFee({ address, amount, price });
    const { value } = amount;
    const csFeeConfig = await this.getCsFeeConfig();
    const csFeeValue = await this.calculateCsFee({ value, price });
    const minerFee = await this.#estimateMinerFee({
      address,
      value,
      memo: meta?.memo,
      csFeeValue,
      csFeeAddress: csFeeConfig.address,
    });
    return new Amount(minerFee + csFeeValue, this.crypto.decimals);
  }

  async #estimateMaxAmount({ address, price, meta }) {
    if (this.#balance === 0n) {
      return 0n;
    }

    const csFeeConfig = await this.getCsFeeConfig();
    const minerFee = await this.#estimateMinerFee({
      address,
      value: this.#balance,
      memo: meta?.memo,
      csFeeValue: csFeeConfig.disabled ? 0n : 1n,
      csFeeAddress: csFeeConfig.disabled ? undefined : csFeeConfig.address,
    });

    if (this.#balance < minerFee) {
      return 0n;
    }

    const csFee = await this.calculateCsFeeForMaxAmount({ value: this.#balance - minerFee, price });
    const max = this.#balance - minerFee - csFee;
    if (max < 0) {
      return 0n;
    }
    return max;
  }

  async estimateMaxAmount({ address, price, meta = {} }) {
    super.estimateMaxAmount({ address, price });
    const maxAmount = await this.#estimateMaxAmount({ address, price, meta });
    return new Amount(maxAmount, this.crypto.decimals);
  }

  async createTransaction({ address, amount, meta = {}, price }, seed) {
    super.createTransaction({ address, amount, meta, price }, seed);
    const { value } = amount;
    const csFeeConfig = await this.getCsFeeConfig();
    const csFeeValue = await this.calculateCsFee({ value, price });
    const minerFee = await this.#estimateMinerFee({
      address,
      value,
      memo: meta?.memo,
      csFeeValue,
      csFeeAddress: csFeeConfig.address,
    });

    const keypair = this.#keypairFromSeed(seed);
    const ext = external(await this.#createTransfer({
      secretKey: concatBytes(keypair.privateKey, keypair.publicKeyRaw),
      value,
      address,
      memo: meta?.memo,
      csFeeValue,
      csFeeAddress: csFeeConfig.address,
    }));

    const cell = beginCell()
      .store(storeMessage(ext))
      .endCell();
    const id = cell.hash().toString('base64');
    await this.#sendBoc(cell.toBoc());
    this.#balance -= value + minerFee + csFeeValue;
    if (this.#balance < 0n) this.#balance = 0n;
    this.storage.set('balance', this.#balance.toString());
    await this.storage.save();
    // not tx id
    return id;
  }

  async loadTransactions({ cursor } = {}) {
    const limit = cursor ? this.txPerPage + 1 : this.txPerPage;
    const data = await this.#getTransactions(this.#wallet.address, cursor, limit);
    if (cursor) data.shift();
    const transactions = data.map((item) => this.#transformTx(item));
    return {
      transactions,
      hasMore: transactions.length >= this.txPerPage,
      cursor: {
        lt: data.at(-1)?.transaction_id.lt,
        hash: data.at(-1)?.transaction_id.hash,
      },
    };
  }

  #transformTx(tx) {
    const inValue = parseInt(tx.in_msg.value);
    if (inValue > 0) {
      return new TonTransaction({
        id: tx.transaction_id.hash,
        to: tx.in_msg.destination,
        from: tx.in_msg.source,
        amount: new Amount(inValue, this.crypto.decimals),
        incoming: true,
        fee: new Amount(tx.fee, this.crypto.decimals),
        timestamp: new Date(tx.utime * 1000),
        confirmations: 1,
        minConfirmations: 1,
        status: TonTransaction.STATUS_SUCCESS,
        meta: {
          memo: tx.in_msg.message,
        },
        development: this.development,
      });
    } else {
      const msg = tx.out_msgs[0];
      const fee = BigInt(tx.fee) + BigInt(tx.out_msgs[1]?.csfee === true ? tx.out_msgs[1].value : 0);
      return new TonTransaction({
        id: tx.transaction_id.hash,
        to: msg?.destination,
        from: msg?.source,
        amount: new Amount(msg?.value || 0, this.crypto.decimals),
        incoming: false,
        fee: new Amount(fee, this.crypto.decimals),
        timestamp: new Date(tx.utime * 1000),
        confirmations: 1,
        minConfirmations: 1,
        status: TonTransaction.STATUS_SUCCESS,
        meta: {
          memo: msg?.message,
        },
        development: this.development,
      });
    }
  }

  async unalias(address) {
    try {
      const parsed = Address.parseFriendly(address);
      return {
        address,
        alias: parsed.address.toString({
          testOnly: parsed.isTestOnly,
          bounceable: !parsed.isBounceable,
        }),
      };
    } catch {
      return;
    }
  }
}
