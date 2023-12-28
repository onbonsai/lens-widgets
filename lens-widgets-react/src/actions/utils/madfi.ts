export const MAD_SBT_TESTNET_ADDRESS = "0x16d4EF45Ce129b6D7bE32E341984682b3050e7cb";
export const MAD_SBT_MAINNET_ADDRESS = "";

export const SBT_LEVELS_TESTNET_ADDRESS = "0xbd1C968603608A78198F3bE5d67018Dc42ACb71a";
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