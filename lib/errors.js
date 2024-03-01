import * as errors from '@coinspace/cs-common/errors';
export * from '@coinspace/cs-common/errors';

export class InvalidNetworkAddressError extends errors.AddressError {
  name = 'InvalidNetworkAddressError';
  constructor(address, options) {
    super(`Invalid network "${address}"`, options);
    this.address = address;
  }
}

export class InvalidMemoError extends errors.InvalidMetaError {
  name = 'InvalidMemoError';
  constructor(memo, options) {
    super(`Invalid Memo: "${memo}"`, {
      ...options,
      meta: 'memo',
    });
  }
}
