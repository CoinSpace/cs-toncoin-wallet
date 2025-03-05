/* eslint-disable max-len */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { hex } from '@scure/base';
import path from 'node:path';
import sinon from 'sinon';

import { Amount } from '@coinspace/cs-common';
import Wallet, { TonTransaction } from '@coinspace/cs-toncoin-wallet';

async function loadFixtires() {
  const fixtures = {};
  const files = await fs.readdir('./test/fixtures');
  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join('./test/fixtures', file);
      fixtures[file.replace('.json', '')] = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    }
  }
  return fixtures;
}

// either dismiss upset disease clump hazard paddle twist fetch tissue hello buyer
const SEED = hex.decode('2b48a48a752f6c49772bf97205660411cd2163fe6ce2de19537e9c94d3648c85c0d7f405660c20253115aaf1799b1c41cdd62b4cfbb6845bc9475495fc64b874');
const SEED_PUB_KEY = {
  data: '3551dd99b8e909ffa2388f92c67357e1840b3a6d93f6031119f2286b4fac43eb',
  settings: {
    bip44: "m/44'/607'/0'",
  },
};
const ADDRESS = 'UQBa1jalGfCwrast5gg_PB-U2cdCHg2mPy2gUO-_4u_vuboO';
const JETTON_WALLET_ADDRESS = 'EQB1asV3k_H0eCB3NIIe-5YpLbeJvQ9HAiO-c6ECljhZ6Y4V';
const PRIVATE_KEY = '24c3f92d74f59cc10f0918dc0660c3caaea002a6ceb0f72f0f4b5d0942babae63551dd99b8e909ffa2388f92c67357e1840b3a6d93f6031119f2286b4fac43eb';
const SECOND_ADDRESS = 'UQBj8pDDn0TAuiZ_EI4npXVtNJTUrdAtRpit6UPiy0cnWnMj';
const TON_PRICE = 2.14;

const FIXTURES = await loadFixtires();

const toncoin = {
  _id: 'toncoin@toncoin',
  asset: 'toncoin',
  platform: 'toncoin',
  type: 'coin',
  decimals: 9,
};
const tetherAtToncoin = {
  _id: 'tether@toncoin',
  asset: 'tether',
  platform: 'toncoin',
  type: 'token',
  address: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
  decimals: 6,
};
let defaultOptionsCoin;
let defaultOptionsToken;

describe('Ton Wallet', () => {
  beforeEach(() => {
    defaultOptionsCoin = {
      crypto: toncoin,
      platform: toncoin,
      cache: { get() {}, set() {} },
      settings: {},
      request(...args) { console.log(args); },
      apiNode: 'node',
      storage: { get() {}, set() {}, save() {} },
    };

    defaultOptionsToken = {
      crypto: tetherAtToncoin,
      platform: toncoin,
      cache: { get() {}, set() {} },
      settings: {},
      request(...args) { console.log(args); },
      apiNode: 'node',
      storage: { get() {}, set() {}, save() {} },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('constructor', () => {
    it('create wallet instance (coin)', () => {
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      assert.equal(wallet.state, Wallet.STATE_CREATED);
    });

    it('create wallet instance (token)', () => {
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      assert.equal(wallet.state, Wallet.STATE_CREATED);
      assert.equal(wallet.tokenUrl, 'https://tonscan.org/jetton/EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs');
    });

    it('wallet should have tokenUrl static method', () => {
      const url = Wallet.tokenUrl('toncoin', 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs', false);
      assert.equal(url, 'https://tonscan.org/jetton/EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs');
    });
  });

  describe('create wallet', () => {
    it('should create new wallet with seed (coin)', async () => {
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.create(SEED);
      assert.equal(wallet.state, Wallet.STATE_INITIALIZED);
      assert.equal(wallet.address, ADDRESS);
    });

    it('should create new wallet with seed (token)', async () => {
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      await wallet.create(SEED);
      assert.equal(wallet.state, Wallet.STATE_INITIALIZED);
      assert.equal(wallet.address, ADDRESS);
    });

    it('should fails without seed', async () => {
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await assert.rejects(async () => {
        await wallet.create();
      }, {
        name: 'TypeError',
        message: 'seed must be an instance of Uint8Array or Buffer, undefined provided',
      });
    });
  });

  describe('open wallet', () => {
    it('should open wallet with public key (coin)', async () => {
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(SEED_PUB_KEY);
      assert.equal(wallet.state, Wallet.STATE_INITIALIZED);
      assert.equal(wallet.address, ADDRESS);
    });

    it('should open wallet with public key (token)', async () => {
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      await wallet.open(SEED_PUB_KEY);
      assert.equal(wallet.state, Wallet.STATE_INITIALIZED);
      assert.equal(wallet.address, ADDRESS);
    });

    it('should fails without public key', async () => {
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await assert.rejects(async () => {
        await wallet.open();
      }, {
        name: 'TypeError',
        message: 'publicKey must be an instance of Object with data property',
      });
    });
  });

  describe('storage', () => {
    it('should load initial balance from storage (coin)', async () => {
      sinon.stub(defaultOptionsCoin.storage, 'get')
        .withArgs('balance').returns('1234567890');
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(SEED_PUB_KEY);
      assert.equal(wallet.balance.value, 1234567890n);
    });

    it('should load initial balance from storage (token)', async () => {
      sinon.stub(defaultOptionsToken.storage, 'get')
        .withArgs('balance').returns('1234567890');
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      await wallet.open(SEED_PUB_KEY);
      assert.equal(wallet.balance.value, 1234567890n);
    });
  });

  describe('load', () => {
    it('should load wallet (coin)', async () => {
      sinon.stub(defaultOptionsCoin, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getWalletInformation',
          params: {
            address: ADDRESS,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getWalletInformation']);
      const storage = sinon.mock(defaultOptionsCoin.storage);
      storage.expects('set').once().withArgs('balance', '4936421995');
      storage.expects('save').once();
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(SEED_PUB_KEY);
      await wallet.load();
      assert.equal(wallet.state, Wallet.STATE_LOADED);
      assert.equal(wallet.balance.value, 4936421995n);
      storage.verify();
    });

    it('should load wallet (coin uninitialized)', async () => {
      sinon.stub(defaultOptionsCoin, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getWalletInformation',
          params: {
            address: ADDRESS,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getWalletInformation-uninitialized']);
      const storage = sinon.mock(defaultOptionsCoin.storage);
      storage.expects('set').once().withArgs('balance', '0');
      storage.expects('save').once();
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(SEED_PUB_KEY);
      await wallet.load();
      assert.equal(wallet.state, Wallet.STATE_LOADED);
      assert.equal(wallet.balance.value, 0n);
      storage.verify();
    });

    it('should load wallet (token)', async () => {
      sinon.stub(defaultOptionsToken, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getWalletInformation',
          params: {
            address: ADDRESS,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getWalletInformation'])
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getJettonWalletAddress',
          params: {
            address: ADDRESS,
            jetton: tetherAtToncoin.address,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getJettonWalletAddress'])
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getJettonData',
          params: {
            address: JETTON_WALLET_ADDRESS,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getJettonData']);
      const storage = sinon.mock(defaultOptionsToken.storage);
      storage.expects('set').once().withArgs('balance', '7000000');
      storage.expects('save').once();
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      await wallet.open(SEED_PUB_KEY);
      await wallet.load();
      assert.equal(wallet.state, Wallet.STATE_LOADED);
      assert.equal(wallet.balance.value, 7000000n);
      storage.verify();
    });

    it('should set STATE_ERROR on error', async () => {
      sinon.stub(defaultOptionsCoin, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getWalletInformation',
          params: {
            address: ADDRESS,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).rejects();
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(SEED_PUB_KEY);
      await assert.rejects(async () => {
        await wallet.load();
      });
      assert.equal(wallet.state, Wallet.STATE_ERROR);
    });
  });

  describe('getPublicKey', () => {
    it('should export public key', async () => {
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.create(SEED);
      const publicKey = wallet.getPublicKey();
      assert.deepEqual(publicKey, SEED_PUB_KEY);
    });

    it('public key is valid', async () => {
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.create(SEED);
      const publicKey = wallet.getPublicKey();
      const secondWalet = new Wallet({
        ...defaultOptionsCoin,
      });
      secondWalet.open(publicKey);
      assert.equal(wallet.address, secondWalet.address);
    });
  });

  describe('getPrivateKey', () => {
    it('should export private key', async () => {
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.create(SEED);
      const privateKey = wallet.getPrivateKey(SEED);
      assert.deepEqual(privateKey, [{
        address: ADDRESS,
        privatekey: PRIVATE_KEY,
      }]);
    });
  });

  describe('validators', () => {
    describe('validateAddress', () => {
      let wallet;
      beforeEach(async () => {
        sinon.stub(defaultOptionsCoin, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v1/getWalletInformation',
            params: {
              address: ADDRESS,
            },
            baseURL: 'node',
            headers: sinon.match.any,
          }).resolves(FIXTURES['getWalletInformation']);
        wallet = new Wallet({
          ...defaultOptionsCoin,
        });
        await wallet.open(SEED_PUB_KEY);
        await wallet.load();
      });

      it('valid address', async () => {
        assert.ok(await wallet.validateAddress({ address: SECOND_ADDRESS }));
      });

      it('invalid address', async () => {
        await assert.rejects(async () => {
          await wallet.validateAddress({ address: '123' });
        }, {
          name: 'InvalidAddressError',
          message: 'Invalid address "123"',
        });
      });

      it('own address', async () => {
        await assert.rejects(async () => {
          await wallet.validateAddress({ address: ADDRESS });
        }, {
          name: 'DestinationEqualsSourceError',
          message: 'Destination address equals source address',
        });
      });

      it('wrong network address', async () => {
        await assert.rejects(async () => {
          await wallet.validateAddress({ address: 'kQCq_OSo1wEAbhZFLfsCXGItpiCR1A2HDYxgdMh7GgbbChY3' });
        }, {
          name: 'InvalidNetworkAddressError',
          message: 'Invalid network "kQCq_OSo1wEAbhZFLfsCXGItpiCR1A2HDYxgdMh7GgbbChY3"',
        });
      });
    });

    describe('validateAmount (coin)', () => {
      it('should be valid amount', async () => {
        sinon.stub(defaultOptionsCoin, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v1/getWalletInformation',
            params: {
              address: ADDRESS,
            },
            baseURL: 'node',
            headers: sinon.match.any,
          }).resolves(FIXTURES['getWalletInformation'])
          .withArgs({
            seed: 'device',
            method: 'POST',
            url: 'api/v1/estimateFee',
            data: {
              address: ADDRESS,
              body: sinon.match.string,
              init_code: sinon.match.undefined,
              init_data: sinon.match.undefined,
              ignore_chksig: true,
            },
            baseURL: 'node',
            headers: sinon.match.any,
          }).resolves(FIXTURES['estimateFee'])
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v4/csfee',
            params: { crypto: 'toncoin@toncoin' },
          }).resolves(FIXTURES['csfee']);
        const wallet = new Wallet({
          ...defaultOptionsCoin,
        });
        await wallet.open(SEED_PUB_KEY);
        await wallet.load();

        const valid = await wallet.validateAmount({
          address: SECOND_ADDRESS,
          amount: new Amount(1_000000000n, wallet.crypto.decimals),
          price: TON_PRICE,
        });
        assert.ok(valid);
      });

      it('throw on uninitialized account', async () => {
        sinon.stub(defaultOptionsCoin, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v1/getWalletInformation',
            params: {
              address: ADDRESS,
            },
            baseURL: 'node',
            headers: sinon.match.any,
          }).resolves(FIXTURES['getWalletInformation-uninitialized'])
          .withArgs({
            seed: 'device',
            method: 'POST',
            url: 'api/v1/estimateFee',
            data: {
              address: ADDRESS,
              body: sinon.match.string,
              init_code: sinon.match.string,
              init_data: sinon.match.string,
              ignore_chksig: true,
            },
            baseURL: 'node',
            headers: sinon.match.any,
          }).resolves(FIXTURES['estimateFee'])
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v4/csfee',
            params: { crypto: 'toncoin@toncoin' },
          }).resolves(FIXTURES['csfee']);
        const wallet = new Wallet({
          ...defaultOptionsCoin,
        });
        await wallet.open(SEED_PUB_KEY);
        await wallet.load();

        await assert.rejects(async () => {
          await wallet.validateAmount({
            address: SECOND_ADDRESS,
            amount: new Amount(123n, wallet.crypto.decimals),
            price: TON_PRICE,
          });
        }, {
          name: 'BigAmountError',
          message: 'Big amount',
          amount: new Amount(0n, wallet.crypto.decimals),
        });
      });

      it('throw on small amount', async () => {
        sinon.stub(defaultOptionsCoin, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v1/getWalletInformation',
            params: {
              address: ADDRESS,
            },
            baseURL: 'node',
            headers: sinon.match.any,
          }).resolves(FIXTURES['getWalletInformation'])
          .withArgs({
            seed: 'device',
            method: 'POST',
            url: 'api/v1/estimateFee',
            data: {
              address: ADDRESS,
              body: sinon.match.string,
              init_code: sinon.match.undefined,
              init_data: sinon.match.undefined,
              ignore_chksig: true,
            },
            baseURL: 'node',
            headers: sinon.match.any,
          }).resolves(FIXTURES['estimateFee'])
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v4/csfee',
            params: { crypto: 'toncoin@toncoin' },
          }).resolves(FIXTURES['csfee']);
        const wallet = new Wallet({
          ...defaultOptionsCoin,
        });
        await wallet.open(SEED_PUB_KEY);
        await wallet.load();

        await assert.rejects(async () => {
          await wallet.validateAmount({
            address: SECOND_ADDRESS,
            amount: new Amount(0n, wallet.crypto.decimals),
            price: TON_PRICE,
          });
        }, {
          name: 'SmallAmountError',
          message: 'Small amount',
          amount: new Amount(1n, wallet.crypto.decimals),
        });
      });

      it('throw on big amount', async () => {
        sinon.stub(defaultOptionsCoin, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v1/getWalletInformation',
            params: {
              address: ADDRESS,
            },
            baseURL: 'node',
            headers: sinon.match.any,
          }).resolves(FIXTURES['getWalletInformation'])
          .withArgs({
            seed: 'device',
            method: 'POST',
            url: 'api/v1/estimateFee',
            data: {
              address: ADDRESS,
              body: sinon.match.string,
              init_code: sinon.match.undefined,
              init_data: sinon.match.undefined,
              ignore_chksig: true,
            },
            baseURL: 'node',
            headers: sinon.match.any,
          }).resolves(FIXTURES['estimateFee'])
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v4/csfee',
            params: { crypto: 'toncoin@toncoin' },
          }).resolves(FIXTURES['csfee']);
        const wallet = new Wallet({
          ...defaultOptionsCoin,
        });
        await wallet.open(SEED_PUB_KEY);
        await wallet.load();

        await assert.rejects(async () => {
          await wallet.validateAmount({
            address: SECOND_ADDRESS,
            amount: new Amount(200_000000000n, wallet.crypto.decimals),
            price: TON_PRICE,
          });
        }, {
          name: 'BigAmountError',
          message: 'Big amount',
          amount: new Amount(4790119855n, wallet.crypto.decimals),
        });
      });
    });

    describe('validateAmount (token)', () => {
      it('should be valid amount', async () => {
        sinon.stub(defaultOptionsToken, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v1/getWalletInformation',
            params: {
              address: ADDRESS,
            },
            baseURL: 'node',
            headers: sinon.match.any,
          }).resolves(FIXTURES['getWalletInformation'])
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v1/getJettonWalletAddress',
            params: {
              address: ADDRESS,
              jetton: tetherAtToncoin.address,
            },
            baseURL: 'node',
            headers: sinon.match.any,
          }).resolves(FIXTURES['getJettonWalletAddress'])
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v1/getJettonData',
            params: {
              address: JETTON_WALLET_ADDRESS,
            },
            baseURL: 'node',
            headers: sinon.match.any,
          }).resolves(FIXTURES['getJettonData']);
        const wallet = new Wallet({
          ...defaultOptionsToken,
        });
        await wallet.open(SEED_PUB_KEY);
        await wallet.load();

        const valid = await wallet.validateAmount({
          address: SECOND_ADDRESS,
          amount: new Amount(1_000000n, wallet.crypto.decimals),
        });
        assert.ok(valid);
      });

      it('throw on uninitialized account', async () => {
        sinon.stub(defaultOptionsToken, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v1/getWalletInformation',
            params: {
              address: ADDRESS,
            },
            baseURL: 'node',
            headers: sinon.match.any,
          }).resolves(FIXTURES['getWalletInformation-uninitialized'])
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v1/getJettonWalletAddress',
            params: {
              address: ADDRESS,
              jetton: tetherAtToncoin.address,
            },
            baseURL: 'node',
            headers: sinon.match.any,
          }).resolves(FIXTURES['getJettonWalletAddress'])
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v1/getJettonData',
            params: {
              address: JETTON_WALLET_ADDRESS,
            },
            baseURL: 'node',
            headers: sinon.match.any,
          }).resolves(FIXTURES['getJettonData']);
        const wallet = new Wallet({
          ...defaultOptionsToken,
        });
        await wallet.open(SEED_PUB_KEY);
        await wallet.load();

        await assert.rejects(async () => {
          await wallet.validateAmount({
            address: SECOND_ADDRESS,
            amount: new Amount(123n, wallet.crypto.decimals),
            price: TON_PRICE,
          });
        }, {
          name: 'InsufficientCoinForTransactionFeeError',
          message: 'Insufficient funds to pay the transaction fee',
          amount: new Amount(50000000n, wallet.platform.decimals),
        });
      });

      it('throw on small amount', async () => {
        sinon.stub(defaultOptionsToken, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v1/getWalletInformation',
            params: {
              address: ADDRESS,
            },
            baseURL: 'node',
            headers: sinon.match.any,
          }).resolves(FIXTURES['getWalletInformation'])
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v1/getJettonWalletAddress',
            params: {
              address: ADDRESS,
              jetton: tetherAtToncoin.address,
            },
            baseURL: 'node',
            headers: sinon.match.any,
          }).resolves(FIXTURES['getJettonWalletAddress'])
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v1/getJettonData',
            params: {
              address: JETTON_WALLET_ADDRESS,
            },
            baseURL: 'node',
            headers: sinon.match.any,
          }).resolves(FIXTURES['getJettonData']);
        const wallet = new Wallet({
          ...defaultOptionsToken,
        });
        await wallet.open(SEED_PUB_KEY);
        await wallet.load();

        await assert.rejects(async () => {
          await wallet.validateAmount({
            address: SECOND_ADDRESS,
            amount: new Amount(0n, wallet.crypto.decimals),
            price: TON_PRICE,
          });
        }, {
          name: 'SmallAmountError',
          message: 'Small amount',
          amount: new Amount(1n, wallet.crypto.decimals),
        });
      });

      it('throw on big amount', async () => {
        sinon.stub(defaultOptionsToken, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v1/getWalletInformation',
            params: {
              address: ADDRESS,
            },
            baseURL: 'node',
            headers: sinon.match.any,
          }).resolves(FIXTURES['getWalletInformation'])
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v1/getJettonWalletAddress',
            params: {
              address: ADDRESS,
              jetton: tetherAtToncoin.address,
            },
            baseURL: 'node',
            headers: sinon.match.any,
          }).resolves(FIXTURES['getJettonWalletAddress'])
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v1/getJettonData',
            params: {
              address: JETTON_WALLET_ADDRESS,
            },
            baseURL: 'node',
            headers: sinon.match.any,
          }).resolves(FIXTURES['getJettonData']);
        const wallet = new Wallet({
          ...defaultOptionsToken,
        });
        await wallet.open(SEED_PUB_KEY);
        await wallet.load();

        await assert.rejects(async () => {
          await wallet.validateAmount({
            address: SECOND_ADDRESS,
            amount: new Amount(200_000000n, wallet.crypto.decimals),
            price: TON_PRICE,
          });
        }, {
          name: 'BigAmountError',
          message: 'Big amount',
          amount: new Amount(7_000000n, wallet.crypto.decimals),
        });
      });
    });

    describe('validateMeta', () => {
      let wallet;
      beforeEach(async () => {
        sinon.stub(defaultOptionsCoin, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: 'api/v1/getWalletInformation',
            params: {
              address: ADDRESS,
            },
            baseURL: 'node',
            headers: sinon.match.any,
          }).resolves(FIXTURES['getWalletInformation']);
        wallet = new Wallet({
          ...defaultOptionsCoin,
        });
        await wallet.open(SEED_PUB_KEY);
        await wallet.load();
      });

      it('should support meta', () => {
        assert.ok(wallet.isMetaSupported);
      });

      it('should return meta names', () => {
        assert.deepEqual(wallet.metaNames, ['memo']);
      });

      it('empty memo is valid', async () => {
        assert.ok(await wallet.validateMeta({
          address: SECOND_ADDRESS,
        }));
      });

      it('valid memo', async () => {
        assert.ok(await wallet.validateMeta({
          address: SECOND_ADDRESS,
          meta: {
            memo: '12345',
          },
        }));
      });

      it('valid long memo', async () => {
        assert.ok(await wallet.validateMeta({
          address: SECOND_ADDRESS,
          meta: {
            memo: '1'.repeat(657432),
          },
        }));
      });

      it('should throw invalid tag', async () => {
        await assert.rejects(async () => {
          await wallet.validateMeta({
            address: SECOND_ADDRESS,
            meta: {
              memo: '1'.repeat(657432 + 1),
            },
          });
        }, {
          name: 'InvalidMemoError',
          meta: 'memo',
        });
      });
    });

    describe('validateDerivationPath', () => {
      let wallet;
      beforeEach(async () => {
        wallet = new Wallet({
          ...defaultOptionsCoin,
        });
      });

      it('valid path', () => {
        assert.equal(wallet.validateDerivationPath("m/44'/607'/1'/2'"), true);
      });

      it('invalid path', () => {
        assert.equal(wallet.validateDerivationPath("m/44'/607'/1/2'"), false);
      });
    });
  });

  describe('estimateTransactionFee', () => {
    it('should estimate transaction fee (coin)', async () => {
      sinon.stub(defaultOptionsCoin, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getWalletInformation',
          params: {
            address: ADDRESS,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getWalletInformation'])
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v1/estimateFee',
          data: {
            address: ADDRESS,
            body: sinon.match.string,
            init_code: sinon.match.undefined,
            init_data: sinon.match.undefined,
            ignore_chksig: true,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['estimateFee'])
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v4/csfee',
          params: { crypto: 'toncoin@toncoin' },
        }).resolves(FIXTURES['csfee']);
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(SEED_PUB_KEY);
      await wallet.load();
      const fee = await wallet.estimateTransactionFee({
        address: SECOND_ADDRESS,
        amount: new Amount(1n, wallet.crypto.decimals),
        price: TON_PRICE,
      });
      assert.equal(fee.value, 146302140n);
    });

    it('should estimate transaction fee (coin uninitialized)', async () => {
      sinon.stub(defaultOptionsCoin, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getWalletInformation',
          params: {
            address: ADDRESS,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getWalletInformation-uninitialized'])
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v1/estimateFee',
          data: {
            address: ADDRESS,
            body: sinon.match.string,
            init_code: sinon.match.string,
            init_data: sinon.match.string,
            ignore_chksig: true,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['estimateFee'])
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v4/csfee',
          params: { crypto: 'toncoin@toncoin' },
        }).resolves(FIXTURES['csfee']);
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(SEED_PUB_KEY);
      await wallet.load();
      const fee = await wallet.estimateTransactionFee({
        address: SECOND_ADDRESS,
        amount: new Amount(1n, wallet.crypto.decimals),
        price: TON_PRICE,
      });
      assert.equal(fee.value, 146302140n);
    });

    it('should estimate transaction fee (token)', async () => {
      sinon.stub(defaultOptionsToken, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getWalletInformation',
          params: {
            address: ADDRESS,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getWalletInformation'])
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getJettonWalletAddress',
          params: {
            address: ADDRESS,
            jetton: tetherAtToncoin.address,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getJettonWalletAddress'])
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getJettonData',
          params: {
            address: JETTON_WALLET_ADDRESS,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getJettonData']);
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      await wallet.open(SEED_PUB_KEY);
      await wallet.load();
      const fee = await wallet.estimateTransactionFee({
        address: SECOND_ADDRESS,
        amount: new Amount(1n, wallet.crypto.decimals),
      });
      assert.equal(fee.value, 50000000n);
    });
  });

  describe('estimateMaxAmount', () => {
    it('should correct estimate max amount (coin)', async () => {
      sinon.stub(defaultOptionsCoin, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getWalletInformation',
          params: {
            address: ADDRESS,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getWalletInformation'])
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v1/estimateFee',
          data: {
            address: ADDRESS,
            body: sinon.match.string,
            init_code: sinon.match.undefined,
            init_data: sinon.match.undefined,
            ignore_chksig: true,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['estimateFee'])
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v4/csfee',
          params: { crypto: 'toncoin@toncoin' },
        }).resolves(FIXTURES['csfee']);
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(SEED_PUB_KEY);
      await wallet.load();
      const maxAmount = await wallet.estimateMaxAmount({ address: SECOND_ADDRESS, price: TON_PRICE });
      assert.equal(maxAmount.value, 4790119855n);
    });

    it('should estimate max amount to be 0 (coin)', async () => {
      sinon.stub(defaultOptionsCoin, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getWalletInformation',
          params: {
            address: ADDRESS,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getWalletInformation-uninitialized'])
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v1/estimateFee',
          data: {
            address: ADDRESS,
            body: sinon.match.string,
            init_code: sinon.match.string,
            init_data: sinon.match.string,
            ignore_chksig: true,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['estimateFee'])
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v4/csfee',
          params: { crypto: 'toncoin@toncoin' },
        }).resolves(FIXTURES['csfee']);
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(SEED_PUB_KEY);
      await wallet.load();
      const maxAmount = await wallet.estimateMaxAmount({ address: SECOND_ADDRESS, price: TON_PRICE });
      assert.equal(maxAmount.value, 0n);
    });

    it('should correct estimate max amount (token)', async () => {
      sinon.stub(defaultOptionsToken, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getWalletInformation',
          params: {
            address: ADDRESS,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getWalletInformation'])
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getJettonWalletAddress',
          params: {
            address: ADDRESS,
            jetton: tetherAtToncoin.address,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getJettonWalletAddress'])
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getJettonData',
          params: {
            address: JETTON_WALLET_ADDRESS,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getJettonData']);
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      await wallet.open(SEED_PUB_KEY);
      await wallet.load();
      const maxAmount = await wallet.estimateMaxAmount({ address: SECOND_ADDRESS });
      assert.equal(maxAmount.value, 7000000n);
    });
  });

  describe('createTransaction', () => {
    it('should create valid transaction (coin)', async () => {
      sinon.stub(defaultOptionsCoin, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getWalletInformation',
          params: {
            address: ADDRESS,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getWalletInformation'])
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v1/estimateFee',
          data: {
            address: ADDRESS,
            body: sinon.match.string,
            init_code: sinon.match.undefined,
            init_data: sinon.match.undefined,
            ignore_chksig: true,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['estimateFee'])
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v4/csfee',
          params: { crypto: 'toncoin@toncoin' },
        }).resolves(FIXTURES['csfee'])
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v1/sendBoc',
          data: {
            boc: sinon.match.string,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves({ ok: true });
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(SEED_PUB_KEY);
      await wallet.load();

      await wallet.createTransaction({
        address: SECOND_ADDRESS,
        amount: new Amount(1_000000000, wallet.crypto.decimals),
        price: TON_PRICE,
      }, SEED);
      assert.equal(wallet.balance.value, 3_790119855n);
    });

    it('should create valid transaction (token)', async () => {
      sinon.stub(defaultOptionsToken, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getWalletInformation',
          params: {
            address: ADDRESS,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getWalletInformation'])
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getJettonWalletAddress',
          params: {
            address: ADDRESS,
            jetton: tetherAtToncoin.address,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getJettonWalletAddress'])
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getJettonData',
          params: {
            address: JETTON_WALLET_ADDRESS,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getJettonData'])
        .withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v1/sendBoc',
          data: {
            boc: sinon.match.string,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves({ ok: true });
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      await wallet.open(SEED_PUB_KEY);
      await wallet.load();

      await wallet.createTransaction({
        address: SECOND_ADDRESS,
        amount: new Amount(1_000000, wallet.crypto.decimals),
      }, SEED);
      assert.equal(wallet.balance.value, 6_000000n);
    });
  });

  describe('loadTransactions', () => {
    it('should load transactions (coin)', async () => {
      sinon.stub(defaultOptionsCoin, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getWalletInformation',
          params: {
            address: ADDRESS,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getWalletInformation'])
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getTransactions',
          params: {
            address: ADDRESS,
            lt: undefined,
            hash: undefined,
            limit: 10,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getTransactions']);
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });
      await wallet.open(SEED_PUB_KEY);
      await wallet.load();

      const res = await wallet.loadTransactions();
      assert.equal(res.hasMore, false);
      assert.equal(res.transactions.length, 6);
      assert.equal(res.transactions[0].action, TonTransaction.ACTION_TOKEN_TRANSFER);
      assert.equal(res.transactions[1].action, TonTransaction.ACTION_TRANSFER);
      assert.deepEqual(res.cursor, {
        lt: '19487583000004',
        hash: 'rH3RZieivA2wiQEedqoF4wGtRyscwGpnEScblXra6CA=',
      });
    });

    it('should load transactions (token)', async () => {
      sinon.stub(defaultOptionsToken, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getWalletInformation',
          params: {
            address: ADDRESS,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getWalletInformation'])
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getJettonWalletAddress',
          params: {
            address: ADDRESS,
            jetton: tetherAtToncoin.address,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getJettonWalletAddress'])
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getJettonData',
          params: {
            address: JETTON_WALLET_ADDRESS,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getJettonData'])
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/getTransactions',
          params: {
            address: JETTON_WALLET_ADDRESS,
            lt: undefined,
            hash: undefined,
            limit: 10,
          },
          baseURL: 'node',
          headers: sinon.match.any,
        }).resolves(FIXTURES['getTransactions-jetton']);
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });
      await wallet.open(SEED_PUB_KEY);
      await wallet.load();

      const res = await wallet.loadTransactions();
      assert.equal(res.hasMore, false);
      assert.equal(res.transactions.length, 3);
      assert.deepEqual(res.cursor, {
        lt: '23462714000003',
        hash: 'FIP6OF6smN4OtN31s3/Skwj1p6+rwaZI/FPDxJqpr3M=',
      });
    });
  });

  describe('unalias', () => {
    let wallet;

    beforeEach(() => {
      wallet = new Wallet({
        ...defaultOptionsCoin,
      });
    });

    it('unalias E', async () => {
      assert.deepEqual(await wallet.unalias('EQBj8pDDn0TAuiZ_EI4npXVtNJTUrdAtRpit6UPiy0cnWi7m'), {
        address: 'EQBj8pDDn0TAuiZ_EI4npXVtNJTUrdAtRpit6UPiy0cnWi7m',
      });
    });

    it('unalias U', async () => {
      assert.deepEqual(await wallet.unalias('UQBj8pDDn0TAuiZ_EI4npXVtNJTUrdAtRpit6UPiy0cnWnMj'), {
        address: 'EQBj8pDDn0TAuiZ_EI4npXVtNJTUrdAtRpit6UPiy0cnWi7m',
        alias: 'UQBj8pDDn0TAuiZ_EI4npXVtNJTUrdAtRpit6UPiy0cnWnMj',
      });
    });

    it('unalias invalid address', async () => {
      assert.deepEqual(await wallet.unalias('foobar'), undefined);
    });
  });

  describe('settings', () => {
    it('settings supported for coin', async () => {
      const wallet = new Wallet({
        ...defaultOptionsCoin,
      });

      assert.equal(wallet.isSettingsSupported, true);
    });

    it('settings not supported for token', async () => {
      const wallet = new Wallet({
        ...defaultOptionsToken,
      });

      assert.equal(wallet.isSettingsSupported, false);
    });
  });
});
