import { z } from "zod";
import { parseUnits, zeroAddress, Abi, TransactionReceipt } from 'viem';
import { Environment, encodeData } from "@lens-protocol/client";
import HandlerBase, { ActionModuleConfig, DefaultFetchActionModuleDataParams } from "./HandlerBase";
import SimpleCollectionMintActionAbi from "../abis/SimpleCollectionMintAction.json";
import MadSBTAbi from "../abis/MadSBT.json";
import MadSBTLevelsAbi from "../abis/SBTLevels.json";
import {
  MAD_SBT_TESTNET_ADDRESS,
  MAD_SBT_MAINNET_ADDRESS,
  SBT_LEVELS_MAINNET_ADDRESS,
  SBT_LEVELS_TESTNET_ADDRESS,
  storjGatewayURL
} from "../utils/madfi";
import { getEventFromReceipt } from "../utils/viem";

const SIMPLE_COLLECTION_MINT_TESTNET_ADDRESS = "0x34e1071e319fe512c052a92a2ceFaF2589a0E098";
const SIMPLE_COLLECTION_MINT_MAINNET_ADDRESS = "0x55991a42e8FEb9DFAC9Fcc172f133D36AC2282A2";

const DEFAULT_COLLECTION_METADATA = {
  name: "MadFi Social Club",
  description: "Dynamic, onchain media that grants access to a brand or creator\'s content, rewards, and more"
};

const MODULE_INIT_DATA_SCHEMA = z.object({
  amount: z.string().optional().nullable(),
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
  amount: z.string(),
  currency: z.string()
});

type ModuleInitDataSchema = z.infer<typeof MODULE_INIT_DATA_SCHEMA>;
type ModuleActDataSchema = z.infer<typeof MODULE_ACT_DATA_SCHEMA>;
type PublicationCollectionConfig = {
  amount: BigInt;
  collectLimit: BigInt;
  currency: `0x${string}`;
  currentCollects: BigInt;
  recipient: string;
  referralFee: number;
  followerOnly: boolean;
  endTimestamp: number;
};

class SimpleCollectionMintAction extends HandlerBase {
  private madSBTAddress: `0x${string}`;
  private sbtLevelsAddress: `0x${string}`;
  private collectionId?: BigInt;
  private isProfileAdmin?: boolean;

  public publicationCollectConfig?: PublicationCollectionConfig;
  public isFreeMint?: boolean;
  public hasMinted?: boolean;

  constructor(
    _environment: Environment,
    profileId: string,
    publicationId: string,
    authenticatedProfileId?: string,
    rpcURLs?: { [chainId: number]: string }
  ) {
    super(_environment, profileId, publicationId, authenticatedProfileId, rpcURLs);

    if (this.isPolygon) {
      this.madSBTAddress = MAD_SBT_MAINNET_ADDRESS;
      this.sbtLevelsAddress = SBT_LEVELS_MAINNET_ADDRESS;
    } else {
      this.madSBTAddress = MAD_SBT_TESTNET_ADDRESS;
      this.sbtLevelsAddress = SBT_LEVELS_TESTNET_ADDRESS;
    }

    this.mintableNFT = true;
  }

  async fetchActionModuleData(data: DefaultFetchActionModuleDataParams): Promise<any> {
    this.authenticatedProfileId = data.authenticatedProfileId; // in case it wasn't set before
    // @ts-expect-error: type
    this.metadata = await this.lensClient.modules.fetchMetadata({ implementation: this.address });

    const collectionId = await this.publicClient.readContract({
      address: this.address,
      abi: SimpleCollectionMintActionAbi as unknown as Abi,
      functionName: "activeCollections",
      args: [this.profileId, this.pubId],
    }) as BigInt;

    const [hasMinted, publicationCollectConfig, collectionData, collectionMetadata] = await Promise.all([
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
        args: [this.profileId, this.pubId],
      }),
      (this.publicClient.readContract({
        address: this.madSBTAddress,
        abi: MadSBTAbi as unknown as Abi,
        functionName: "collectionData",
        args: [collectionId],
      }) as Promise<any[]>),
      (this.publicClient.readContract({
        address: this.sbtLevelsAddress,
        abi: MadSBTLevelsAbi as unknown as Abi,
        functionName: "collectionMetadata",
        args: [collectionId],
      }) as Promise<[string, string]>),
    ]);

    const imagePath = collectionData[6]! as string;
    this.mintableNFTMetadata = {
      name: collectionMetadata[0] || DEFAULT_COLLECTION_METADATA.name,
      description: collectionMetadata[1] || DEFAULT_COLLECTION_METADATA.description,
      image: storjGatewayURL(`${imagePath}/1.png`)
    };

    this.collectionId = collectionId;
    this.hasMinted = hasMinted as boolean;
    this.publicationCollectConfig = publicationCollectConfig as PublicationCollectionConfig;
    this.isProfileAdmin = data.authenticatedProfileId === this.profileId;
    this.isFreeMint = this.publicationCollectConfig.amount === BigInt(0);

    this._setURLs(this.madSBTAddress, collectionId.toString());

    return {
      collectionId,
      hasMinted,
      isProfileAdmin: this.isProfileAdmin,
      publicationCollectConfig
    };
  }

  getActionModuleConfig(): ActionModuleConfig {
    return {
      displayName: "Join Social Club",
      description: "Mint this badge NFT and get access to exclusive content, rewards, and more",
      address: {
        mumbai: SIMPLE_COLLECTION_MINT_TESTNET_ADDRESS,
        polygon: SIMPLE_COLLECTION_MINT_MAINNET_ADDRESS
      },
      metadata: this.metadata
    };
  }

  getModuleInitDataSchema() {
    return MODULE_INIT_DATA_SCHEMA;
  }

  encodeModuleInitData(data: ModuleInitDataSchema): string {
    if (data.amount && BigInt(data.amount) > 0 && !(data.currency && data.currencyDecimals)) {
      throw new Error('when `amount` is a value greater than 0, you must provide `currency` and `currencyDecimals`');
    }

    const baseFeeCollectModuleInitData = {
      amount: !!data.amount ? parseUnits(data.amount.toString(), data.currencyDecimals!).toString() : 0,
      collectLimit: data.collectLimit || 0,
      currency: data.currency || zeroAddress,
      recipient: data.recipient,
      referralFee: (data.referralFee || 0) * 100, // bps
      followerOnly: data.followerOnly,
      endTimestamp: data.endTimestamp || 0,
    };

    return encodeData(
      JSON.parse(this.metadata!.metadata.initializeCalldataABI),
      [this.collectionId!.toString(), JSON.stringify(baseFeeCollectModuleInitData)] // TODO: stringified?
    );
  }

  getModuleActDataSchema() {
    return MODULE_ACT_DATA_SCHEMA;
  }

  encodeModuleActData(data: ModuleActDataSchema): string {
    return encodeData(
      JSON.parse(this.metadata!.metadata.processCalldataABI),
      [data.currency, data.amount]
    );
  }

  getActButtonLabel(): string {
    if (this.isProfileAdmin) return "Promoting Club";
    if (this.hasMinted) return "Joined";

    return "Join Club";
  }

  getResultingTokenId(transactionReceipt: TransactionReceipt): BigInt {
    const event = getEventFromReceipt({
      transactionReceipt,
      contractAddress: this.address,
      abi: SimpleCollectionMintActionAbi,
      eventName: "CollectionMinted"
    });
    const { resultingTokenId }: { resultingTokenId: BigInt } = event.args;
    this._setURLs(this.madSBTAddress, resultingTokenId.toString());
    return resultingTokenId;
  }

  _setURLs(tokenAddress: string, tokenId: string): void {
    const network = this.isPolygon ? "polygon" : "mumbai";
    const _openseaBase = `https://${!this.isPolygon ? 'testnets.' : ''}opensea.io`;
    const openseaURL = `${_openseaBase}/assets/${network}/${tokenAddress}/${tokenId}`;

    this.mintableNFTURLs = { opensea: openseaURL };
  }
}

export {
  SIMPLE_COLLECTION_MINT_TESTNET_ADDRESS,
  SIMPLE_COLLECTION_MINT_MAINNET_ADDRESS,
  SimpleCollectionMintAction
};