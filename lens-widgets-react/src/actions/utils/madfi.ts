export const MAD_SBT_TESTNET_ADDRESS = "0x37aB71116E2A89dA7d27c918aBE6B9Bb8bEE5d12";
export const MAD_SBT_MAINNET_ADDRESS = "";

export const SBT_LEVELS_TESTNET_ADDRESS = "0x214955A9Ab649A17a14999A0afdC9F2c422084b1";
export const SBT_LEVELS_MAINNET_ADDRESS = "";

export const MADFI_API_BASE_URL = "https://api.madfi.xyz/prod";
export const DEFAULT_MADFI_API_KEY = process.env.NEXT_PUBLIC_MADFI_API_KEY;
export const STORJ_API_URL = "https://www.storj-ipfs.com";

const _hash = (uriOrHash: string): string => (
  typeof uriOrHash === "string" && uriOrHash.startsWith("ipfs://") ? uriOrHash.split("ipfs://")[1] : uriOrHash
);

export const storjGatewayURL = (uriOrHash: string): string => (
  `${STORJ_API_URL}/ipfs/${_hash(uriOrHash)}`
);