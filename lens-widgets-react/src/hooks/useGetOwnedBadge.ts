import { useQuery } from '@tanstack/react-query';
import { createClient } from 'urql';
import { MADFI_GENESIS_BADGE_ID, MADFI_SUBGRPAH_URL_TESTNET, MADFI_SUBGRAPH_URL } from './../actions/utils/madfi';

const FETCH_MADFI_TOKEN = `
  query getMadSbtTokenByCollectionIdAndOwner($collectionId: String!, $owner: String!) {
    madSbtTokens(where: { collection_: { collectionId: $collectionId }, owner: $owner }, first: 1) {
      tokenId
      rewardPoints
      createdAt
    }
  }
`;

// id: addressLowercase-profileIdDecimal
const FETCH_MADFI_CREATOR = `
  query getCreatedMadCollection($id: String!) {
    madCreator(id: $id) {
      activeMadSBT {
        collectionId
      }
    }
  }
`;

// MadFi Social Club Badges: https://docs.madfi.xyz/what-is-madfi/onchain-loyalty
export const fetchMadSbtTokenByCollectionIdAndOwner = async (
  isProduction: boolean,
  collectionId: string,
  owner: string
) => {
  const url = isProduction ? MADFI_SUBGRAPH_URL : MADFI_SUBGRPAH_URL_TESTNET;
  const client = createClient({ url });
  const { data } = await client.query(FETCH_MADFI_TOKEN, { collectionId, owner }).toPromise();

  return data?.madSbtTokens?.length ? data.madSbtTokens[0] : null;
}

export const fetchMadCreator = async (
  isProduction: boolean,
  owner: string,
  profileId: string,
): Promise<{ activeMadSBT: { collectionId: string } }> => {
  const url = isProduction ? MADFI_SUBGRAPH_URL : MADFI_SUBGRPAH_URL_TESTNET;
  const client = createClient({ url });
  let profileIdDecimal = profileId.includes("0x") ? parseInt(profileId, 16).toString() : profileId;
  const id = `${owner.toLocaleLowerCase()}-${profileIdDecimal}`;
  const { data } = await client.query(FETCH_MADFI_CREATOR, { id }).toPromise();

  return data?.madCreator;
}

export const useGetOwnedMadFiBadge = (isProduction: boolean, sponsor?: any, address?: string) => {
  // was using onchainIdentity but getting nuked; future has spent/earned $ in the protocol, etc
  // const [verified, setVerified] = useState();

  const result = useQuery({
    queryKey: ['owned-madfi-badge', address],
    queryFn: () => fetchMadSbtTokenByCollectionIdAndOwner(isProduction, MADFI_GENESIS_BADGE_ID, address!),
    enabled: !!address
  });

  return {
    isLoading: result?.isLoading,
    badge: result?.data,
    ownsBadge: !!result?.data,
    verified: sponsor,
  };
}

export const useGetOwnedBadge = (isProduction: boolean, collectionId?: string, address?: string) => {
  const result = useQuery({
    queryKey: ['owned-badge', collectionId],
    queryFn: () => fetchMadSbtTokenByCollectionIdAndOwner(isProduction, collectionId!, address!),
    enabled: !!address && !!collectionId
  });

  return {
    isLoading: result?.isLoading,
    badge: result?.data,
  };
}

export const useGetMadCreator = (isProduction: boolean, address?:string, profileId?: string) => {
  return useQuery({
    queryKey: ['mad-creator', address, profileId],
    queryFn: () => fetchMadCreator(isProduction, address!, profileId!),
    enabled: !!address && !!profileId
  });
}