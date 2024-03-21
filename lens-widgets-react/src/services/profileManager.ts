import { createClient } from 'urql';
import { omit } from "lodash/object";
import { RelaySuccessFragment, LensClient } from "@lens-protocol/client";
import { TESTNET_API_URL, MAINNET_API_URL } from "@madfi/lens-oa-client";

const GET_PROFILE_MANAGERS = `
  query profileManagers($profileId: ProfileId!) {
    profileManagers(request: { for: $profileId }) {
      items {
        address
      }
    }
  }
`;

const MUTATE_CHANGE_PROFILE_MANAGER = `
  mutation createChangeProfileManagersTypedData($options: TypedDataOptions, $request: ChangeProfileManagersRequest!) {
    createChangeProfileManagersTypedData(options: $options, request: $request) {
      id
      expiresAt
      typedData {
        types {
          ChangeDelegatedExecutorsConfig {
            name
            type
          }
        }
        domain {
          name
          chainId
          version
          verifyingContract
        }
        value {
          nonce
          deadline
          delegatorProfileId
          delegatedExecutors
          approvals
          configNumber
          switchToGivenConfig
        }
      }
    }
  }
`;

export const enableProfileManagerGasless = async (lensClient: LensClient, walletClient: any, contractAddress: string) => {
  const accessTokenResult = await lensClient.authentication.getAccessToken();
  const accessToken = accessTokenResult.unwrap();
  if (!accessToken) throw new Error("Must sign-in with Lens");

  const url = lensClient.config.environment.name === 'production' ? MAINNET_API_URL : TESTNET_API_URL;
  const client = createClient({ url, fetchOptions: { headers: { "x-access-token": accessToken } } });
  const { data } = await client.mutation(
    MUTATE_CHANGE_PROFILE_MANAGER,
    { request: { changeManagers: { address: contractAddress, action: "ADD" } } }
  ).toPromise();

  const typedData = data?.createChangeProfileManagersTypedData?.typedData;
  if (!typedData) throw new Error('No typed data');
  const [account] = await walletClient.getAddresses();
  const signedTypedData = await walletClient.signTypedData({
    account,
    domain: omit(typedData.domain, "__typename"),
    types: omit(typedData.types, "__typename"),
    primaryType: "ChangeDelegatedExecutorsConfig",
    message: omit(typedData.value, "__typename"),
  });
  const broadcastResult = await lensClient.transaction.broadcastOnchain({
    id: data?.createChangeProfileManagersTypedData.id,
    signature: signedTypedData,
  });
  const broadcastResultValue = broadcastResult.unwrap();

  if (broadcastResultValue.__typename === "RelayError") throw new Error("RelayError");

  const txId = (broadcastResultValue as RelaySuccessFragment).txId;
  console.log(`txId: ${txId}`);
};

export const getProfileManagers = async (lensClient: LensClient, profileId: string) => {
  try {
    const url = lensClient.config.environment.name === 'production' ? MAINNET_API_URL : TESTNET_API_URL;
    const client = createClient({ url });
    const { data } = await client.query(GET_PROFILE_MANAGERS, { profileId }).toPromise();

    return data?.profileManagers?.items?.map(({ address }) => address) || [];
  } catch (error) {
    console.log(error);
  }
};
