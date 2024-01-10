import { useState, useEffect } from 'react';
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