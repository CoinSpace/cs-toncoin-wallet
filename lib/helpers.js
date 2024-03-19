import { Address } from '@ton/ton';

export function areAddressesEqual(a, b) {
  try {
    return Address.parse(a).equals(Address.parse(b));
  } catch {
    return false;
  }
}
