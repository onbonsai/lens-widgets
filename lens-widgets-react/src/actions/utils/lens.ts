import HandlerBase from "../handlers/HandlerBase";
import { TransactionReceipt, WalletClient } from "viem";
import ILensHubAbi from './../abis/ILensHub.json'; // NOTE: only has `#act` and `#actWithSig`

const TESTNET_LENS_HUB_PROXY = "0x4fbffF20302F3326B20052ab9C217C44F6480900";
const MAINNET_LENS_HUB_PROXY = "0xDb46d1Dc155634FbC732f92E853b10B288AD5a1d";

// sends the `#act` tx onchain to the LensHub
export const actOnchain = async (
  walletClient: WalletClient,
  handler: HandlerBase,
  actionModuleData: string,
  overrides?: { gasLimit: number }
): Promise<TransactionReceipt> => {
  const address = handler.isPolygon ? MAINNET_LENS_HUB_PROXY : TESTNET_LENS_HUB_PROXY;

  const processActionParams = {
    publicationActedProfileId: handler.profileId,
    publicationActedId: handler.publicationId,
    actorProfileId: handler.authenticatedProfileId,
    referrerProfileIds: [], // TODO: need cohesive system for referrers
    referrerPubIds: [],
    referrerPubTypes: [],
    actionModuleAddress: handler.address,
    actionModuleData,
  };

  const hash = await walletClient.writeContract({
    address,
    abi: ILensHubAbi,
    functionName: "act",
    args: [processActionParams],
    // @ts-ignore
    overrides,
  });

  console.log(`tx: ${hash}`);
  return handler.publicClient.waitForTransactionReceipt({ hash });
};
