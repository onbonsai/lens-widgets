import { Environment } from "@lens-protocol/client";
import { getAddress } from "ethers/lib/utils";

// 1. import your handler class
import {
  SIMPLE_COLLECTION_MINT_TESTNET_ADDRESS,
  SIMPLE_COLLECTION_MINT_MAINNET_ADDRESS,
  SimpleCollectionMintAction
} from "./handlers/SimpleCollectionMintAction";
import {
  ZORA_LZ_MINT_TESTNET_ADDRESS,
  ZORA_LZ_MINT_MAINNET_ADDRESS,
  ZoraLzMintAction
} from "./handlers/ZoraLzMintAction";

// 2. add the entry for MAINNET, where `handler` is the exported handler class
const MAINNET = [
  { address: ZORA_LZ_MINT_MAINNET_ADDRESS, handler: ZoraLzMintAction, name: "ZoraLzMintAction" },
  { address: SIMPLE_COLLECTION_MINT_MAINNET_ADDRESS, handler: SimpleCollectionMintAction, name: "SimpleCollectionMintAction" }
];

// 2. add the entry for TESTNET
const TESTNET = [
  { address: ZORA_LZ_MINT_TESTNET_ADDRESS, handler: ZoraLzMintAction, name: "ZoraLzMintAction" },
  { address: SIMPLE_COLLECTION_MINT_TESTNET_ADDRESS, handler: SimpleCollectionMintAction, name: "SimpleCollectionMintAction" }
];

// 3. you are gucci
const supportedActionModules = (_environment: Environment) => {
  const list = _environment.name === "production" ? MAINNET : TESTNET;
  return list.reduce((memo, data) => ({ ...memo, [getAddress(data.address)]: data }), {});
};

export const fetchActionModuleHandler = (_environment: Environment, contract: string) => {
  return supportedActionModules(_environment)[contract];
};

export const fetchActionModuleHandlers = (_environment: Environment, actionModules?: [any]) => {
  if (!actionModules?.length) return [];
  const data = supportedActionModules(_environment);

  return actionModules.map(({ contract }) => data[getAddress(contract.address)]).filter((a) => a);
};