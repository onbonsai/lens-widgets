import { z } from "zod";
import { Abi, zeroAddress } from 'viem';
import { Environment, encodeData } from "@lens-protocol/client";
import HandlerBase, { ActionModuleConfig, DefaultFetchActionModuleDataParams } from "./HandlerBase";
import { fetchPublicationBounty } from "../services/getPublicationBounty";
import IERC20Abi from "../abis/IERC20.json";

const BOUNTY_ACTION_TESTNET_ADDRESS = "0x46F6e501BCE4784a82304C56388f871dCeB708AE";
const BOUNTY_ACTION_MAINNET_ADDRESS = "0x6587ee890bd85426ED3509AbC5215311C5397D43";

const MODULE_INIT_DATA_SCHEMA = z.object({
  paymentToken: z.string(),
  bountyAmount: z.string(),
  sponsorCollectionId: z.string().optional().nullable(),
});

const MODULE_ACT_DATA_SCHEMA = z.object({
  clientAddress: z.string().optional().nullable(),
  bidAmount: z.string(),
  contentURI: z.string(),
  revShare: z.number().optional().nullable(),
  bidderCollectionId: z.string().nullable().optional(),
  rewardActionModuleInitData: z.string().nullable().optional()
});

type ModuleInitDataSchema = z.infer<typeof MODULE_INIT_DATA_SCHEMA>;
type ModuleActDataSchema = z.infer<typeof MODULE_ACT_DATA_SCHEMA>;
export type Bounty = {
  bountyId: string;
  budget: string;
  amount: string;
  sponsor: `0x${string}`;
  token: `0x${string}`;
  sponsorCollectionId: string;
  open: boolean;
};
export type Bid = {
  profileId: string;
  bidAmount: string;
  approved: boolean;
  approvedTxHash: string;
};
export type PublicationBounty = {
  bounty: Bounty;
  bids: Bid[];
};

class PublicationBountyAction extends HandlerBase {
  public isProfileAdmin?: boolean;
  public connectedWalletAddress?: string;
  public publicationBounty?: PublicationBounty;
  public activeBid?: Bid | null;
  public paymentToken?: { symbol: string; decimals: number };

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

    this.connectedWalletAddress = data.connectedWalletAddress;
    this.isProfileAdmin = data.authenticatedProfileId === this.profileId;

    this.publicationBounty = await fetchPublicationBounty(
      this.isPolygon!,
      parseInt(this.profileId, 16).toString(),
      parseInt(this.pubId, 16).toString()
    );
    if (this.publicationBounty) {
      this.paymentToken = await this.fetchToken(this.publicationBounty!.bounty.token);

      const actorProfileId = parseInt(this.authenticatedProfileId, 16).toString();
      this.activeBid = this.publicationBounty?.bids.find(({ profileId }) => profileId == actorProfileId);
    } else {
      this.panicked = true;
    }

    return { activeBid: this.activeBid, publicationBounty: this.publicationBounty };
  }

  getActionModuleConfig(): ActionModuleConfig {
    return {
      displayName: `Submit a bid`,
      description: `If your bid is selected by the sponsor, your content will automatically be posted and you will be paid`,
      address: {
        mumbai: BOUNTY_ACTION_TESTNET_ADDRESS,
        polygon: BOUNTY_ACTION_MAINNET_ADDRESS
      },
      metadata: this.metadata
    };
  }

  getModuleInitDataSchema() {
    return MODULE_INIT_DATA_SCHEMA;
  }

  encodeModuleInitData(data: ModuleInitDataSchema): string {
    const sponsorCollectionId = data.sponsorCollectionId || '0';
    return encodeData(
      JSON.parse(this.metadata!.metadata.initializeCalldataABI),
      [data.paymentToken, data.bountyAmount, sponsorCollectionId]
    );
  }

  getModuleActDataSchema() {
    return MODULE_ACT_DATA_SCHEMA;
  }

  encodeModuleActData(data: ModuleActDataSchema): string {
    const clientAddress = data.clientAddress || zeroAddress;
    const revShare = data.revShare?.toString() || '0';
    const bidderCollectionId = data.bidderCollectionId || '0';
    const rewardActionModuleInitData = data.rewardActionModuleInitData || [];
    return encodeData(
      JSON.parse(this.metadata!.metadata.processCalldataABI),
      [
        clientAddress,
        data.bidAmount,
        revShare,
        bidderCollectionId,
        data.contentURI,
        rewardActionModuleInitData
      ]
    );
  }

  getActButtonLabel(): string {
    if (this.isProfileAdmin) return this.publicationBounty?.bounty.open ? 'Active' : 'Closed';
    if (!!this.activeBid) {
      return this.activeBid?.approved ? 'Bid Approved' : 'Bid Pending';
    }

    return this.publicationBounty?.bounty.open ? 'Submit Bid' : 'Closed';
  }

  fetchToken = async (tokenAddress: `0x${string}`) => {
    const [symbol, decimals] = await Promise.all([
      this.publicClient.readContract({
        address: tokenAddress,
        abi: IERC20Abi as unknown as Abi,
        functionName: "symbol"
      }),
      this.publicClient.readContract({
        address: tokenAddress,
        abi: IERC20Abi as unknown as Abi,
        functionName: "decimals"
      })
    ]);

    return {
      symbol: symbol as string,
      decimals: decimals as number
    };
  };
}


export {
  BOUNTY_ACTION_TESTNET_ADDRESS,
  BOUNTY_ACTION_MAINNET_ADDRESS,
  PublicationBountyAction,
};