import { z } from "zod";
import { polygon, polygonMumbai } from 'viem/chains'
import { PublicClient, createPublicClient, http } from "viem";
import { Environment, production, LensClient } from "@lens-protocol/client";
import {
  MUMBAI_CURRENCY_WMATIC,
  POLYGON_CURRENCY_WMATIC,
  MUMBAI_CURRENCY_WETH,
  POLYGON_CURRENCY_WETH,
  MUMBAI_WHITELISTED_CURRENCIES,
  POLYGON_WHITELISTED_CURRENCIES,
} from "./../utils/constants";

export type ActionModuleConfig = {
  metadata?: ModuleMetadataResultFragment | null;
  displayName?: string;
  description: string;
  address: {
    mumbai?: string;
    polygon?: string
  };
};

// TODO: not exported from `@lens-protocol/client`
export type ModuleMetadataResultFragment = {
  moduleType: ModuleType;
  signlessApproved: boolean;
  sponsoredApproved: boolean;
  verified: boolean;
  metadata: {
    authors: string[];
    description: string;
    initializeCalldataABI: string;
    initializeResultDataABI: string | null;
    name: string;
    processCalldataABI: string;
    title: string;
    attributes: MetadataAttribute;
  };
};

type MetadataAttribute = {
  type: { type: any; key: string; value: string; }
  key: string;
  value: string;
}

enum ModuleType {
  Follow = 'FOLLOW',
  OpenAction = 'OPEN_ACTION',
  Reference = 'REFERENCE',
}

export type DefaultFetchActionModuleDataParams = {
  authenticatedProfileId: string,
  connectedWalletAddress: string
};

export type MintableNFT = {
  name: string;
  description: string;
  image: string;
  chainId?: number; // if it's on another chain
}

// must be implemented by every action module in this directory
abstract class HandlerBase {
  public isPolygon?: boolean;
  public chain: typeof polygon | typeof polygonMumbai;
  public lensClient: LensClient;
  public publicClient: PublicClient;
  public profileId: string;
  public pubId: string;
  public publicationId?: string; // {profileId}-{pubId}
  public authenticatedProfileId?: string;
  public wmatic: `0x${string}`;
  public weth: `0x${string}`;
  public currencies?: { address: `0x${string}`, symbol: string }[];
  public panicked?: boolean; // to prevent button from rendering on errors

  public address: `0x${string}`;
  public metadata?: ModuleMetadataResultFragment | null;
  public rpcURLs?: { [chainId: number]: string };

  public mintableNFT?: boolean;
  public mintableNFTMetadata?: MintableNFT;
  public mintableNFTURLs?: { opensea?: string; zora?: string };
  public disabled?: boolean; // to prevent acting twice or acting on invalid state

  constructor(
    _environment: Environment,
    profileId: string,
    pubId: string,
    authenticatedProfileId?: string,
    rpcURLs?: { [chainId: number]: string }
  ) {
    // TODO: something cleaner
    let storage;
    if (typeof window !== 'undefined') {
      storage = window.localStorage;
    }
    this.lensClient = new LensClient({ environment: _environment, storage });
    this.chain = _environment.name === "production"
      ? polygon
      : polygonMumbai;
    this.isPolygon = _environment.name === "production";
    this.rpcURLs = rpcURLs;

    // @ts-expect-error: throw error right after
    this.address = this.chain === polygon
      ? this.getActionModuleConfig().address.polygon
      : this.getActionModuleConfig().address.mumbai
    if (!this.address) throw new Error("No address returned from #getActionModuleConfig");

    const rpc = rpcURLs && rpcURLs[this.chain.id] ? rpcURLs[this.chain.id] : this.chain.rpcUrls.default.http[0];
    this.publicClient = createPublicClient({ chain: this.chain, transport: http(rpc) });
    this.profileId = profileId;
    this.pubId = pubId;
    this.publicationId = `${profileId}-${pubId}`;
    this.authenticatedProfileId = authenticatedProfileId;
    // @ts-expect-error: 0x{string}
    this.currencies = this.chain === polygon
      ? POLYGON_WHITELISTED_CURRENCIES
      : MUMBAI_WHITELISTED_CURRENCIES;

    if (_environment.name === "production") {
      this.wmatic = POLYGON_CURRENCY_WMATIC;
      this.weth = POLYGON_CURRENCY_WETH;
    } else {
      this.wmatic = MUMBAI_CURRENCY_WMATIC;
      this.weth = MUMBAI_CURRENCY_WETH;
    }
  }

  // fetch any module data you wish to render / use for transactions
  abstract fetchActionModuleData(data: DefaultFetchActionModuleDataParams): Promise<any>;

  // returns data necessary to render info, including the Lens API-registered module metadata
  abstract getActionModuleConfig(): ActionModuleConfig;

  // returns the form data for module init; as a zod object
  abstract getModuleInitDataSchema(): z.ZodObject<any>;

  // encodes the form data for module init
  abstract encodeModuleInitData(data: any): string;

  // returns the form data for module act; as a zod object
  abstract getModuleActDataSchema(): z.ZodObject<any>;

  // encodes the form data for module act
  abstract encodeModuleActData(data: any): string;

  // returns the label for the act button, based on whatever state you determine outside the class
  abstract getActButtonLabel(): string;
}

export default HandlerBase;