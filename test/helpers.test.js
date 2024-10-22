import { areAddressesEqual } from '@coinspace/cs-toncoin-wallet/helpers';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('address helper', () => {
  it('should be equal (1)', () => {
    assert.equal(areAddressesEqual(
      'UQARFlgfJwwwL2q_3sTkZ4PuhiKdsw8YqhIgvyJIR3VSIgBl',
      'EQARFlgfJwwwL2q_3sTkZ4PuhiKdsw8YqhIgvyJIR3VSIl2g'
    ), true);
  });

  it('should be equal (2)', () => {
    assert.equal(areAddressesEqual(
      'UQARFlgfJwwwL2q_3sTkZ4PuhiKdsw8YqhIgvyJIR3VSIgBl',
      '0QARFlgfJwwwL2q_3sTkZ4PuhiKdsw8YqhIgvyJIR3VSIrvv'
    ), true);
  });

  it('should be equal (3)', () => {
    assert.equal(areAddressesEqual(
      'EQARFlgfJwwwL2q_3sTkZ4PuhiKdsw8YqhIgvyJIR3VSIl2g',
      '0QARFlgfJwwwL2q_3sTkZ4PuhiKdsw8YqhIgvyJIR3VSIrvv'
    ), true);
  });

  it('should not be equual', () => {
    assert.equal(areAddressesEqual(
      'EQAM1kRWS2ta7nKTxVGN9tz_AmWeGOXwTLJnhd5kFhshsBnA',
      '0QARFlgfJwwwL2q_3sTkZ4PuhiKdsw8YqhIgvyJIR3VSIrvv'
    ), false);
  });

  it('should not be equual (invalid address)', () => {
    assert.equal(areAddressesEqual(
      'foobar',
      '0QARFlgfJwwwL2q_3sTkZ4PuhiKdsw8YqhIgvyJIR3VSIrvv'
    ), false);
  });
});
