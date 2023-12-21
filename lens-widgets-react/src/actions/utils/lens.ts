import { TransactionReceipt, WalletClient } from "viem";
import { OnchainReferrer, RelaySuccessFragment, LensClient } from "@lens-protocol/client";
import { omit } from "lodash/object";
import HandlerBase from "../handlers/HandlerBase";
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
    publicationActedId: handler.pubId,
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

// NOTE: this assume the given `actionModule` has `metadata.sponsoredApproved` = true
// NOTE: this assumes that the passed in `lensClient` is authenticated (see: https://docs.lens.xyz/docs/login)
// NOTE: this assumes the app is whitelisted to use gasless
export const actWithSignedTypedata = async (
  lensClient: LensClient,
  walletClient: WalletClient,
  publicationId: string,
  actionModule: `0x${string}`,
  actionModuleData: string,
  referrers?: OnchainReferrer[]
): Promise<any> => {
  try {
    const typedDataResult = await lensClient.publication.actions.createActOnTypedData({
      actOn: {
        unknownOpenAction: {
          address: actionModule,
          data: actionModuleData
        }
      },
      for: publicationId,
      referrers: referrers || []
    });

    const { id, typedData } = typedDataResult.unwrap();

    const [account] = await walletClient.getAddresses();
    console.log(typedData);
    const signedTypedData = await walletClient.signTypedData({
      account,
      domain: omit(typedData.domain, "__typename"),
      types: omit(typedData.types, "__typename"),
      primaryType: "Act",
      message: omit(typedData.value, "__typename"),
    });

    const broadcastResult = await lensClient.transaction.broadcastOnchain({ id, signature: signedTypedData });
    const broadcastResultValue = broadcastResult.unwrap();

    if (broadcastResultValue.__typename === "RelayError") throw new Error("RelayError");

    return (broadcastResultValue as RelaySuccessFragment).txId;
  } catch (error) {
    console.log(error);
  }
}