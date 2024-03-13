import * as errors from './errors.js';

export default class API {
  #wallet;
  constructor(wallet) {
    this.#wallet = wallet;
  }

  async #requestNode(config) {
    const data = await this.#wallet.requestNode(config);
    if (data?.ok !== true) {
      throw new errors.NodeError(`Invalid response "${JSON.stringify(data)}"`);
    }
    return data.result;
  }

  async getWalletInformation(address) {
    const res = await this.#requestNode({
      url: 'api/v1/getWalletInformation',
      method: 'GET',
      params: {
        address,
      },
    });
    return res;
  }

  async estimateFee(address, body, init) {
    const res = await this.#requestNode({
      url: 'api/v1/estimateFee',
      method: 'POST',
      data: {
        address,
        body,
        init_data: init?.data,
        init_code: init?.code,
        ignore_chksig: true,
      },
    });
    return res;
  }

  async sendBoc(boc) {
    const res = await this.#requestNode({
      url: 'api/v1/sendBoc',
      method: 'POST',
      data: {
        boc,
      },
    });
    return res;
  }

  async getTransactions(address, cursor, limit) {
    const res = await this.#requestNode({
      url: 'api/v1/getTransactions',
      method: 'GET',
      params: {
        address,
        lt: cursor?.lt,
        hash: cursor?.hash,
        limit,
      },
    });
    return res;
  }
}
