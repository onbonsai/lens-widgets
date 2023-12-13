export const MAD_SBT_TESTNET_ADDRESS = "0x0c437264f4a7799a3E70D4DD58B05511bf5F29a6";
export const MAD_SBT_MAINNET_ADDRESS = "";

export const SBT_LEVELS_TESTNET_ADDRESS = "0x090DF22a7988D348E2c7fe99351a3BaAD10642Ea";
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