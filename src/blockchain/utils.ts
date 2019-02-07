import { Nonce } from "@iov/bcp-types";
import { Int53, Uint53 } from "@iov/encoding";

import BN = require("bn.js");

export function decodeHexQuantity(hexString: string): number {
  // "0x00" in ganache response is an error: zero should be represented as "0x0"
  // "0x0n" in ganache response is an error: no leading zeroes allowed, when fixed implement {1}[a-f1-9]
  if (hexString.match(/^0x[a-f0-9]+$/)) {
    return parseInt(hexString, 16);
  }
  throw new Error("invalid hex quantity input");
}

export function decodeHexQuantityString(hexString: string): string {
  if (hexString.match(/^0x[a-f0-9]+$/)) {
    const hexToBN = new BN(hexString.replace("0x", ""), 16);
    return hexToBN.toString();
  }
  throw new Error("invalid hex quantity input");
}

export function decodeHexQuantityNonce(hexString: string): Nonce {
  const nonce = decodeHexQuantity(hexString);
  return new Int53(nonce) as Nonce;
}

export function encodeQuantity(value: number): string {
  try {
    const checkedValue = new Uint53(value);
    return "0x" + new BN(checkedValue.toNumber()).toString(16);
  } catch {
    throw new Error("Input is not a unsigned safe integer");
  }
}

export function encodeQuantityString(value: string): string {
  if (!value.match(/^[0-9]+$/)) {
    throw new Error("Input is not a valid string number");
  }
  return "0x" + new BN(value).toString(16);
}

/**
 * Takes a hex representation optionally prefixed with 0x and returns a normalized
 * representation: unprefixed, padded to even characters count, lower case.
 */
export function normalizeHex(input: string): string {
  const unprefixedLower = input.replace("0x", "").toLowerCase();
  if (unprefixedLower.length % 2 !== 0) {
    return "0" + unprefixedLower;
  } else {
    return unprefixedLower;
  }
}
