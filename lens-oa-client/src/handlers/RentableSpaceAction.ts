import { z } from "zod";
import { Abi, TransactionReceipt, WalletClient, encodeAbiParameters, zeroAddress, zeroHash } from 'viem';
import { Environment, encodeData } from "@lens-protocol/client";
import HandlerBase, { ActionModuleConfig, DefaultFetchActionModuleDataParams } from "./HandlerBase";
import RentableSpaceActionAbi from "../abis/RentableSpaceAction.json";
import { fetchToken } from "../utils/tokens"

const RENTABLE_SPACE_ACTION_TESTNET_ADDRESS = "0xDE54905696C8f05505209A610aa91B63f9f44d4C";
const RENTABLE_SPACE_ACTION_MAINNET_ADDRESS = "0x6f7B96f99a3904581470002cEE1c5182d8743f34";

const MODULE_INIT_DATA_SCHEMA = z.object({
  currency: z.string(),
  allowOpenAction: z.boolean(),
  costPerSecond: z.string(),
  expireAt: z.string().optional().nullable(),
  clientFeePerActBps: z.number().optional().nullable(),
  referralFeePerActBps: z.number().optional().nullable(),
  interestMerkleRoot: z.string().optional().nullable(),
});

const MODULE_ACT_DATA_SCHEMA = z.object({
  adPubId: z.string().optional().nullable(), // [optional] the pub id to pull contentUri and action module for the ad
  duration: z.number(), // the amount of time the advertiser wishes to pay for (in seconds)
  costPerSecond: z.number(), // the amount the advertisers is willing to pay per second (check getAdCost)
  merkleProofIndex: z.string().nullable().optional(), // [optional] proof index the space's category merkle
  clientAddress: z.string().optional().nullable(), // [optional] the whitelisted client address to receive fees
  openActionModule: z.string().optional().nullable(), // [optional] the linked open action module
  adContentUri: z.string(), // [optional] if no pub id passed in, use this lens metadata uri
  merkleProof: z.array(z.string()).optional().nullable() // [optional] proof for the space's category merkle
});

type ModuleInitDataSchema = z.infer<typeof MODULE_INIT_DATA_SCHEMA>;
type ModuleActDataSchema = z.infer<typeof MODULE_ACT_DATA_SCHEMA>;
export type ActiveSpace = {
  spaceId: BigInt;
  currency: `0x${string}`;
  costPerSecond: number;
  expireAt: number;
  interestMerkleRoot: string;
  allowOpenAction: boolean;
  clientFeePerActBps: number;
  referralFeePerActBps: number;
};
export type ActiveAd = {
  advertiserId: BigInt;
  adId: BigInt;
  createdAt: number;
  expireAt: number;
  costPerSecond: number;
  openActionModule: `0x${string}`;
  adContentUri: string;
};
export type GetAdCostResponse = {
  cost: BigInt;
  costWithFee: BigInt;
  costPerSecond: BigInt;
};
export enum CancelAdReason {
  BAD_CONTENT,
  BAD_ADVERTISER,
  BAD_ACTOR, // any bad activity
  EXIT, // to allow good faith canceling after `adMinDuration`
  OTHER
}

class RentableSpaceAction extends HandlerBase {
  public isProfileAdmin?: boolean;
  public connectedWalletAddress?: string;
  public activeSpace?: ActiveSpace;
  public activeAd?: ActiveAd | null;
  public paymentToken?: { symbol: string; decimals: number };

  constructor(
    _environment: Environment,
    profileId?: string,
    publicationId?: string,
    authenticatedProfileId?: string,
    rpcURLs?: { [chainId: number]: string }
  ) {
    super(_environment, profileId, publicationId, authenticatedProfileId, rpcURLs);
  }

  async fetchActionModuleData(data: DefaultFetchActionModuleDataParams): Promise<any> {
    this.authenticatedProfileId = data.authenticatedProfileId; // in case it wasn't set before
    // @ts-expect-error: type
    this.metadata = await this.lensClient.modules.fetchMetadata({ implementation: this.address });

    this.connectedWalletAddress = data.connectedWalletAddress;
    this.isProfileAdmin = data.authenticatedProfileId === this.profileId;

    const [activeSpace, activeAd] = await Promise.all([
      (this.publicClient.readContract({
        address: this.address,
        abi: RentableSpaceActionAbi as unknown as Abi,
        functionName: "activeSpaces",
        args: [this.profileId],
      }) as unknown as any),
      ((async () => {
        try {
          // will not throw if exists and not expired
          await this.publicClient.readContract({
            address: this.address,
            abi: RentableSpaceActionAbi as unknown as Abi,
            functionName: 'getActiveAd',
            args: [this.profileId, this.pubId]
          });

          return await this.publicClient.readContract({
            address: this.address,
            abi: RentableSpaceActionAbi as unknown as Abi,
            functionName: 'activeAds',
            args: [this.profileId, this.pubId]
          });
        } catch {} // NotFoundOrExpired
      })() as unknown as any),
    ]);

    this.activeSpace = activeSpace ? {
      spaceId: activeSpace[0],
      currency: activeSpace[1],
      costPerSecond: activeSpace[2],
      expireAt: activeSpace[3],
      interestMerkleRoot: activeSpace[4],
      allowOpenAction: activeSpace[5],
      clientFeePerActBps: activeSpace[6],
      referralFeePerActBps: activeSpace[7],
    } : undefined;
    this.activeAd = activeAd ? {
      advertiserId: activeAd[0],
      adId: activeAd[1],
      createdAt: activeAd[2],
      expireAt: activeAd[3],
      costPerSecond: activeAd[4],
      openActionModule: `0x${activeAd[5]}`,
      adContentUri: activeAd[6],
    } : undefined;
    // TODO: get ad cost

    try {
      this.paymentToken = await fetchToken(this.publicClient, this.activeSpace!.currency);
    } catch {
      console.log('failed to fetch payment token');
      this.panicked = true;
    }

    return { activeAd };
  }

  getActionModuleConfig(): ActionModuleConfig {
    return {
      displayName: `Rentable Billboard`,
      description: `This post is rentable; you can pay to place your content or publication here`,
      address: {
        mumbai: RENTABLE_SPACE_ACTION_TESTNET_ADDRESS,
        polygon: RENTABLE_SPACE_ACTION_MAINNET_ADDRESS
      },
      metadata: this.metadata
    };
  }

  getModuleInitDataSchema() {
    return MODULE_INIT_DATA_SCHEMA;
  }

  encodeModuleInitData(data: ModuleInitDataSchema): string {
    const expireAt = data.expireAt || "0";
    const clientFeePerActBps = data.clientFeePerActBps?.toString() || "0";
    const referralFeePerActBps = data.referralFeePerActBps?.toString() || "0"
    const interestMerkleRoot = data.interestMerkleRoot || zeroHash;
    return encodeData(
      JSON.parse(this.metadata!.metadata.initializeCalldataABI),
      [
        data.currency,
        data.allowOpenAction,
        data.costPerSecond,
        expireAt,
        clientFeePerActBps,
        referralFeePerActBps,
        interestMerkleRoot
      ]
    );
  }

  getModuleActDataSchema() {
    return MODULE_ACT_DATA_SCHEMA;
  }

  encodeModuleActData(data: ModuleActDataSchema): string {
    return encodeAbiParameters(
      [JSON.parse(this.metadata!.metadata.processCalldataABI)],
      [{
        adPubId: data.adPubId || "0",
        duration: data.duration,
        costPerSecond: data.costPerSecond,
        merkleProofIndex: data.merkleProofIndex || "0",
        clientAddress: data.clientAddress || zeroAddress,
        openActionModule: data.openActionModule || zeroAddress,
        adContentUri: data.adContentUri || "",
        merkleProof: data.merkleProof || [],
      }]
    );
  }

  // for post creators to withdraw any fees earned
  async withdrawFeesEarned(walletClient: WalletClient): Promise<TransactionReceipt> {
    if (!this.authenticatedProfileId) throw new Error("authenticatedProfileId not set");
    if (!this.isProfileAdmin) throw new Error("only post creator");

    const [address] = await walletClient.getAddresses();
    const hash = await walletClient.writeContract({
      chain: this.chain,
      account: address,
      address: this.address,
      abi: RentableSpaceActionAbi as unknown as Abi,
      functionName: "withdrawFeesEarned",
      args: [this.activeSpace!.currency, this.authenticatedProfileId],
    });
    console.log(`tx: ${hash}`);
    return await this.publicClient.waitForTransactionReceipt({ hash });
  }

  // for prospective advertisers
  async getAdCost(durationSeconds: number): Promise<GetAdCostResponse> {
    const res = await this.publicClient.readContract({
      address: this.address,
      abi: RentableSpaceActionAbi as unknown as Abi,
      functionName: 'getAdCost',
      args: [this.profileId, durationSeconds]
    }) as BigInt[];

    return {
      cost: res[0],
      costWithFee: res[1],
      costPerSecond: res[2]
    };
  }

  // for post creator to cancel an active ad, with reason
  async cancelActiveAd(
    walletClient: WalletClient,
    closeSpace: boolean,
    reason: CancelAdReason,
    otherReason?: string,
    actorProfileId?: BigInt
  ): Promise<TransactionReceipt> {
    if (!this.authenticatedProfileId) throw new Error("authenticatedProfileId not set");
    if (!this.isProfileAdmin) throw new Error("only post creator");

    const [address] = await walletClient.getAddresses();
    const hash = await walletClient.writeContract({
      chain: this.chain,
      account: address,
      address: this.address,
      abi: RentableSpaceActionAbi as unknown as Abi,
      functionName: "cancelActiveAd",
      args: [this.authenticatedProfileId, actorProfileId || 0, reason, otherReason || "", closeSpace],
    });
    console.log(`tx: ${hash}`);
    return await this.publicClient.waitForTransactionReceipt({ hash });
  }

  // for post creator to close their active space, as long as no active ad is present
  async closeActiveSpace(walletClient: WalletClient): Promise<TransactionReceipt> {
    if (!this.authenticatedProfileId) throw new Error("authenticatedProfileId not set");
    if (!this.isProfileAdmin) throw new Error("only post creator");
    if (!!this.activeAd) throw new Error("cannot close while active ad; use #cancelActiveAd");

    const [address] = await walletClient.getAddresses();
    const hash = await walletClient.writeContract({
      chain: this.chain,
      account: address,
      address: this.address,
      abi: RentableSpaceActionAbi as unknown as Abi,
      functionName: "closeActiveSpace",
      args: [this.authenticatedProfileId],
    });
    console.log(`tx: ${hash}`);
    return await this.publicClient.waitForTransactionReceipt({ hash });
  }

  getActButtonLabel(): string {
    if (this.isProfileAdmin) return !!this.activeAd ? 'Cancel Ad' : 'Active';

    return !!this.activeAd ? 'Replace Ad' : 'Rent';
  }
}


export {
  RENTABLE_SPACE_ACTION_TESTNET_ADDRESS,
  RENTABLE_SPACE_ACTION_MAINNET_ADDRESS,
  RentableSpaceAction,
};