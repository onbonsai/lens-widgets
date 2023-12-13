import { z } from "zod";
import { polygon, polygonMumbai } from 'viem/chains'
import { Abi, PublicClient, createPublicClient, http } from "viem";
import { Environment, production } from "@lens-protocol/client";
import {
  MUMBAI_CURRENCY_WMATIC,
  POLYGON_CURRENCY_WMATIC,
  MUMBAI_CURRENCY_WETH,
  POLYGON_CURRENCY_WETH,
  MUMBAI_WHITELISTED_CURRENCIES,
  POLYGON_WHITELISTED_CURRENCIES,
} from "./../utils/constants";

export type ActionModuleConfig = {
  metadata: {
    name: string;
    displayName?: string;
    description: string;
  };
  address: {
    mumbai?: string;
    polygon?: string
  };
  actButtonStateLabels: {
    pre: string;
    post: string;
  },
  abi?: Abi
};

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
  public publicClient: PublicClient;
  public profileId: string;
  public publicationId: string;
  public authenticatedProfileId?: string;
  public wmatic: `0x${string}`;
  public weth: `0x${string}`;
  public currencies?: { address: `0x${string}`, symbol: string }[];

  public address: `0x${string}`;
  public metadata?: string;

  public mintableNFT?: boolean;
  public mintableNFTMetadata?: MintableNFT;
  public mintableNFTURLs?: { opensea?: string; zora?: string };

  constructor(_environment: Environment, profileId: string, publicationId: string, authenticatedProfileId?: string) {
    this.chain = _environment == production
      ? polygon
      : polygonMumbai;
    this.isPolygon = _environment == production;

    // @ts-expect-error: throw error right after
    this.address = this.chain === polygon
      ? this.getActionModuleConfig().address.polygon
      : this.getActionModuleConfig().address.mumbai
    if (!this.address) throw new Error("No address returned from #getActionModuleConfig");

    // TODO: accept rpc url in constructor params
    this.publicClient = createPublicClient({ chain: this.chain, transport: http(this.chain.rpcUrls.default.http[0]) });
    this.profileId = profileId;
    this.publicationId = publicationId;
    this.authenticatedProfileId = authenticatedProfileId;
    // @ts-expect-error: 0x{string}
    this.currencies = this.chain === polygon
      ? POLYGON_WHITELISTED_CURRENCIES
      : MUMBAI_WHITELISTED_CURRENCIES;

    if (_environment === production) {
      this.wmatic = POLYGON_CURRENCY_WMATIC;
      this.weth = POLYGON_CURRENCY_WETH;
    } else {
      this.wmatic = MUMBAI_CURRENCY_WMATIC;
      this.weth = MUMBAI_CURRENCY_WETH;
    }
  }

  // fetch any module data you wish to render / use for transactions
  abstract fetchActionModuleData(data: DefaultFetchActionModuleDataParams): Promise<any>;

  // returns data necessary to render info
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