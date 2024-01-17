import { z } from "zod";
import { Abi, zeroAddress } from 'viem';
import { encodeAbi } from "./../utils/viem";
import { Environment, encodeData } from "@lens-protocol/client";
import HandlerBase, { ActionModuleConfig, DefaultFetchActionModuleDataParams } from "./HandlerBase";
import RewardEngagementActionAbi from "./../abis/RewardEngagementAction.json";

const REWARD_ENGAGEMENT_TESTNET_ADDRESS = "0x55Cbc1f4353D8663cB3af6b9058397f1ef237E90";
const REWARD_ENGAGEMENT_MAINNET_ADDRESS = "0xDA7F4679312Ab7Dc9B4A985564a391c14Ef45A72";

enum RewardActionType {
  COMMENT,
  MIRROR,
  QUOTE
}

const MODULE_INIT_DATA_SCHEMA = z.object({
  collectionId: z.string(),
  rewardEnum: z.number(),
  rewardLimit: z.number().optional().nullable(),
  actionType: z.number(),
});

const MODULE_ACT_DATA_SCHEMA = z.object({
  contentURI: z.string().optional().nullable()
});

type ModuleInitDataSchema = z.infer<typeof MODULE_INIT_DATA_SCHEMA>;
type ModuleActDataSchema = z.infer<typeof MODULE_ACT_DATA_SCHEMA>;
type PublicationRewarded = {
  actionType: string;
  collectionId: BigInt;
  rewardEnum: number;
  limit: number;
  claimed: number;
};

class RewardEngagementAction extends HandlerBase {
  private isProfileAdmin?: boolean;

  public connectedWalletAddress?: string;
  public publicationRewarded?: PublicationRewarded;
  public hasClaimed?: boolean;
  public verbAction?: string;
  public verb?: string;

  constructor(
    _environment: Environment,
    profileId: string,
    publicationId: string,
    authenticatedProfileId?: string,
    rpcURLs?: { [chainId: number]: string }
  ) {
    super(_environment, profileId, publicationId, authenticatedProfileId, rpcURLs);
  }

  async fetchActionModuleData(data: DefaultFetchActionModuleDataParams): Promise<any> {
    this.authenticatedProfileId = data.authenticatedProfileId; // in case it wasn't set before
    // @ts-expect-error: type
    this.metadata = await this.lensClient.modules.fetchMetadata({ implementation: this.address });

    const [pubRewarded, hasClaimed] = await Promise.all([
      (this.publicClient.readContract({
        address: this.address,
        abi: RewardEngagementActionAbi as unknown as Abi,
        functionName: "activeRewards",
        args: [this.profileId, this.pubId],
      }) as Promise<any[]>),
      this.publicClient.readContract({
        address: this.address,
        abi: RewardEngagementActionAbi as unknown as Abi,
        functionName: 'hasClaimedRewards',
        args: [this.profileId, this.pubId, data.authenticatedProfileId]
      }),
    ]);

    this.connectedWalletAddress = data.connectedWalletAddress;
    this.isProfileAdmin = data.authenticatedProfileId === this.profileId;
    this.publicationRewarded = {
      actionType: RewardActionType[pubRewarded[0] as number],
      collectionId: pubRewarded[1],
      rewardEnum: pubRewarded[2],
      limit: pubRewarded[3],
      claimed: pubRewarded[4]
    };
    this.hasClaimed = hasClaimed as boolean;

    const { verbAction, verb } = this.getVerbActionAndVerb(this.publicationRewarded.actionType);
    this.verbAction = verbAction;
    this.verb = verb;

    return {
      hasClaimed,
      collectionId: this.publicationRewarded.collectionId
    };
  }

  getActionModuleConfig(): ActionModuleConfig {
    return {
      displayName: `Earn points for ${this.verbAction}`,
      description: `The creator of this publication is rewarding loyalty points for ${this.verbAction}`,
      address: {
        mumbai: REWARD_ENGAGEMENT_TESTNET_ADDRESS,
        polygon: REWARD_ENGAGEMENT_MAINNET_ADDRESS
      },
      metadata: this.metadata
    };
  }

  getModuleInitDataSchema() {
    return MODULE_INIT_DATA_SCHEMA;
  }

  encodeModuleInitData(data: ModuleInitDataSchema): string {
    const rewardLimit = data.rewardLimit?.toString() || '0';
    return encodeData(
      JSON.parse(this.metadata!.metadata.initializeCalldataABI),
      [data.collectionId, data.rewardEnum.toString(), rewardLimit, data.actionType.toString()]
    );
  }

  getModuleActDataSchema() {
    return MODULE_ACT_DATA_SCHEMA;
  }

  encodeModuleActData(data: ModuleActDataSchema): string {
    // not using api as the input is dependent on actionType
    return this.getPublicationActionParams(data.contentURI).actionModuleData;
  }

  getActButtonLabel(): string {
    if (this.isProfileAdmin) return `Rewarded`;
    if (this.hasClaimed) return `Earned`;

    return "Earn points";
  }

  getVerbActionAndVerb(actionType: string) {
    let verbAction = "NULL";
    let verb = "NULL";

    if (actionType === "MIRROR") {
      verbAction = "mirroring";
      verb = "Mirror";
    } else if (actionType === "QUOTE") {
      verbAction = "quoting";
      verb = "Quote";
    } else if (actionType === "COMMENT") {
      verbAction = "commenting";
      verb = "Comment";
    }

    return { verbAction, verb };
  }

  // `contentURI` only needed for comment / quote
  getPublicationActionParams(contentURI?: string | null): any {
    const pointedProfileId = this.profileId;
    const pointedPubId = this.pubId
    const actorProfileId = this.authenticatedProfileId!;
    const actionType = this.publicationRewarded!.actionType!;

    let encodedActionParams: any; // the encoded struct for comment|mirror|quote

    if (actionType === "MIRROR") {
      const mirrorParams = {
        profileId: actorProfileId,
        metadataURI: "", // TODO
        pointedProfileId,
        pointedPubId,
        referrerProfileIds: [],
        referrerPubIds: [],
        referenceModuleData: "0x"
      };
      encodedActionParams = encodeAbi(
        ['(uint256 profileId, string metadataURI, uint16 pointedProfileId, uint8 pointedPubId, uint256[] referrerProfileIds, uint256[] referrerPubIds, bytes referenceModuleData)'],
        [mirrorParams]
      );
    } else if (actionType === "COMMENT") {
      const commentParams = {
        profileId: actorProfileId,
        contentURI,
        pointedProfileId,
        pointedPubId,
        referrerProfileIds: [],
        referrerPubIds: [],
        referenceModuleData: "0x",
        actionModules: [],
        actionModulesInitDatas: [],
        referenceModule: zeroAddress,
        referenceModuleInitData: "0x"
      };
      encodedActionParams = encodeAbi(
        ['(uint256 profileId, string contentURI, uint16 pointedProfileId, uint8 pointedPubId, uint256[] referrerProfileIds, uint256[] referrerPubIds, bytes referenceModuleData, address[] actionModules, bytes[] actionModulesInitDatas, address referenceModule, bytes referenceModuleInitData)'],
        [commentParams]
      );
    } else { // actionType === "QUOTE"
      const quoteParams = {
        profileId: actorProfileId,
        contentURI,
        pointedProfileId,
        pointedPubId,
        referrerProfileIds: [],
        referrerPubIds: [],
        referenceModuleData: "0x",
        actionModules: [],
        actionModulesInitDatas: [],
        referenceModule: zeroAddress,
        referenceModuleInitData: "0x"
      };
      encodedActionParams = encodeAbi(
        ['(uint256 profileId, string contentURI, uint16 pointedProfileId, uint8 pointedPubId, uint256[] referrerProfileIds, uint256[] referrerPubIds, bytes referenceModuleData, address[] actionModules, bytes[] actionModulesInitDatas, address referenceModule, bytes referenceModuleInitData)'],
        [quoteParams]
      );
    }

    return {
      publicationActedProfileId: pointedProfileId,
      publicationActedId: pointedPubId,
      actorProfileId,
      referrerProfileIds: [],
      referrerPubIds: [],
      referrerPubTypes: [],
      actionModuleAddress: this.address,
      actionModuleData: encodedActionParams,
    };
  }
}


export {
  REWARD_ENGAGEMENT_TESTNET_ADDRESS,
  REWARD_ENGAGEMENT_MAINNET_ADDRESS,
  RewardEngagementAction,
  RewardActionType
};