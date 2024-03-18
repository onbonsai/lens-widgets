import { z } from "zod";
import { parseUnits } from "viem";
import { Environment, encodeData } from "@lens-protocol/client";
import HandlerBase, { ActionModuleConfig, DefaultFetchActionModuleDataParams } from "./HandlerBase";

const TIP_ACTION_TESTNET_ADDRESS = "0x6111e258a6d00d805DcF1249900895c7aA0cD186";
const TIP_ACTION_MAINNET_ADDRESS = "0x22cb67432C101a9b6fE0F9ab542c8ADD5DD48153";

const MODULE_INIT_DATA_SCHEMA = z.object({
  receiver: z.string(),
});

const MODULE_ACT_DATA_SCHEMA = z.object({
  currency: z.string(),
  tipAmountEther: z.string(),
  currencyDecimals: z.number().optional().nullable(),
});

type ModuleInitDataSchema = z.infer<typeof MODULE_INIT_DATA_SCHEMA>;
type ModuleActDataSchema = z.infer<typeof MODULE_ACT_DATA_SCHEMA>;

class TipAction extends HandlerBase {
  public isProfileAdmin?: boolean;

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
    return {};
  }

  getActionModuleConfig(): ActionModuleConfig {
    return {
      displayName: `Tip`,
      description: `Send a tip`,
      address: {
        mumbai: TIP_ACTION_TESTNET_ADDRESS,
        polygon: TIP_ACTION_MAINNET_ADDRESS
      },
      metadata: this.metadata
    };
  }

  getModuleInitDataSchema() {
    return MODULE_INIT_DATA_SCHEMA;
  }

  encodeModuleInitData(data: ModuleInitDataSchema): string {
    return encodeData(
      JSON.parse(this.metadata!.metadata.initializeCalldataABI),
      [data.receiver]
    );
  }

  getModuleActDataSchema() {
    return MODULE_ACT_DATA_SCHEMA;
  }

  encodeModuleActData(data: ModuleActDataSchema): string {
    const decimals = data.currencyDecimals || 18;
    const amount = parseUnits(data.tipAmountEther, decimals);

    return encodeData(
      JSON.parse(this.metadata!.metadata.processCalldataABI),
      [data.currency, amount.toString()]
    );
  }

  getActButtonLabel(): string {
    return "Tip";
  }
}


export {
  TIP_ACTION_TESTNET_ADDRESS,
  TIP_ACTION_MAINNET_ADDRESS,
  TipAction,
};
