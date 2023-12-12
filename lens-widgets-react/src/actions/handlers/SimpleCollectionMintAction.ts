import { z } from "zod";
import { parseUnits, zeroAddress, Abi } from 'viem';
import { Environment, production } from "@lens-protocol/client";
import HandlerBase, { ActionModuleConfig, DefaultFetchActionModuleDataParams } from "./HandlerBase";
import { encodeAbi } from "../utils/viem";
import SimpleCollectionMintActionAbi from "./../abis/SimpleCollectionMintAction.json";
import MadSBTAbi from "./../abis/MadSBT.json";
import { MAD_SBT_TESTNET_ADDRESS, MAD_SBT_MAINNET_ADDRESS } from "./../utils/madfi";

const SIMPLE_COLLECTION_MINT_TESTNET_ADDRESS = "0xB13A3274131Ad9003106aCd82A3923063252b90a";
const SIMPLE_COLLECTION_MINT_MAINNET_ADDRESS = "";

const MODULE_INIT_DATA_SCHEMA = z.object({
  amount: z.number().optional().nullable(),
  collectLimit: z.number().optional().nullable(),
  currency: z.string().optional().nullable(),
  currencyDecimals: z.number().optional().nullable(),
  referralFee: z.number().min(0).max(100).optional().nullable().refine(value => {
    if (typeof value === 'number') {
      return Number(value.toFixed(2)) === value;
    }
    return true;
  }, { message: "Up to 2 decimal places allowed" }),
  followerOnly: z.boolean().default(false),
  endTimestamp: z.number().optional().nullable(),
  recipient: z.string(),
});

const MODULE_ACT_DATA_SCHEMA = z.object({
  amount: z.number(),
  currency: z.string()
});

type ModuleInitDataSchema = z.infer<typeof MODULE_INIT_DATA_SCHEMA>;
type ModuleActDataSchema = z.infer<typeof MODULE_ACT_DATA_SCHEMA>;
type PublicationCollectionConfig = {
  amount: BigInt;
  collectLimit: BigInt;
  currency: string;
  currentCollects: BigInt;
  recipient: string;
  referralFee: number;
  followerOnly: boolean;
  endTimestamp: number;
};

class SimpleCollectionMintAction extends HandlerBase {
  private madSBTAddress: `0x${string}`;
  private collectionId?: BigInt;
  private hasMinted?: boolean;
  private isProfileAdmin?: boolean;
  private publicationCollectConfig?: PublicationCollectionConfig;

  constructor(_environment: Environment, profileId: string, publicationId: string) {
    super(_environment, profileId, publicationId);

    this.madSBTAddress = _environment === production
      ? MAD_SBT_MAINNET_ADDRESS
      : MAD_SBT_TESTNET_ADDRESS;
  }

  async fetchActionModuleData(data: DefaultFetchActionModuleDataParams): Promise<any> {
    const collectionId = await this.publicClient.readContract({
      address: this.address,
      abi: SimpleCollectionMintActionAbi as unknown as Abi,
      functionName: "activeCollections",
      args: [this.profileId, this.publicationId],
    }) as BigInt;

    console.log('fetching...')

    const [hasMinted, publicationCollectConfig] = await Promise.all([
      this.publicClient.readContract({
        address: this.madSBTAddress,
        abi: MadSBTAbi as unknown as Abi,
        functionName: "hasMinted",
        args: [data.connectedWalletAddress, collectionId],
      }),
      this.publicClient.readContract({
        address: this.address,
        abi: SimpleCollectionMintActionAbi as unknown as Abi,
        functionName: "getBasePublicationData",
        args: [this.profileId, this.publicationId],
      }),
    ]);

    this.collectionId = collectionId;
    this.hasMinted = hasMinted as boolean;
    this.publicationCollectConfig = publicationCollectConfig as PublicationCollectionConfig;
    this.isProfileAdmin = data.authenticatedProfileId === this.profileId;

    console.log({
      collectionId,
      hasMinted,
      isProfileAdmin: this.isProfileAdmin,
      publicationCollectConfig
    })
    return {
      collectionId,
      hasMinted,
      isProfileAdmin: this.isProfileAdmin,
      publicationCollectConfig
    };
  }

  getActionModuleConfig(): ActionModuleConfig {
    return {
      metadata: {
        name: "SimpleCollectionMintAction",
        displayName: "Join Social Club",
        description: "Join a social club on MadFi by minting a badge NFT"
      },
      address: {
        mumbai: SIMPLE_COLLECTION_MINT_TESTNET_ADDRESS,
        polygon: SIMPLE_COLLECTION_MINT_MAINNET_ADDRESS
      },
      actButtonStateLabels: {
        pre: "Join Club",
        post: "Joined"
      }
    }
  }

  getModuleInitDataSchema() {
    return MODULE_INIT_DATA_SCHEMA;
  }

  encodeModuleInitData(data: ModuleInitDataSchema): string {
    if (data.amount && data.amount > 0 && !(data.currency && data.currencyDecimals)) {
      throw new Error('when `amount` is a value greater than 0, you must provide `currency` and `currencyDecimals`');
    }

    const baseFeeCollectModuleInitData = {
      amount: !!data.amount ?parseUnits(data.amount.toString(), data.currencyDecimals!) : 0,
      collectLimit: data.collectLimit || 0,
      currency: data.currency || zeroAddress,
      recipient: data.recipient,
      referralFee: (data.referralFee || 0) * 100, // bps
      followerOnly: data.followerOnly,
      endTimestamp: data.endTimestamp || 0,
    };

    return encodeAbi(
      [
        'uint256',
        '(uint160 amount, uint96 collectLimit, address currency, uint16 referralFee, bool followerOnly, uint72 endTimestamp, address recipient)'
      ],
      [this.collectionId, baseFeeCollectModuleInitData]
    );
  }

  getModuleActDataSchema() {
    return MODULE_ACT_DATA_SCHEMA;
  }

  encodeModuleActData(data: ModuleActDataSchema): string {
    return encodeAbi(
      ['address', 'uint256'],
      [data.currency, data.amount]
    );
  }

  getActButtonLabel(): string {
    if (this.isProfileAdmin) return "Promoting Club";
    if (this.hasMinted) return "Joined";

    return "Join Club";
  }
}

export {
  SIMPLE_COLLECTION_MINT_TESTNET_ADDRESS,
  SIMPLE_COLLECTION_MINT_MAINNET_ADDRESS,
  SimpleCollectionMintAction
};