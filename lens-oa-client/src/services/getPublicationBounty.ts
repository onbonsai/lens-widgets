import { createClient } from 'urql';
import { MADFI_SUBGRPAH_URL_TESTNET, MADFI_SUBGRAPH_URL } from '../utils/madfi';

const FETCH_PUBLICATION_BOUNTY = `
  query getPublicationBounty($profileId: String!, $pubId: String!) {
    publicationBounties(where:{pubId:$pubId, profileId:$profileId}, first:1) {
      bounty {
        bountyId
        budget
        sponsor
        token
        sponsorCollectionId
        open
      }
      bids {
        profileId
        bidAmount
        approved
        approvedTxHash
      }
    }
  }
`;

// MadFi Content Bounties: https://docs.madfi.xyz/what-is-madfi/content-bounties
// Smart Post: https://docs.madfi.xyz/protocol-overview/smart-posts/publication-bounty
export const fetchPublicationBounty = async (
  isProduction: boolean,
  profileId: string,
  pubId: string
) => {
  const url = isProduction ? MADFI_SUBGRAPH_URL : MADFI_SUBGRPAH_URL_TESTNET;
  const client = createClient({ url });
  const { data } = await client.query(FETCH_PUBLICATION_BOUNTY, { profileId, pubId }).toPromise();

  return data?.publicationBounties?.length ? data.publicationBounties[0] : null;
}
