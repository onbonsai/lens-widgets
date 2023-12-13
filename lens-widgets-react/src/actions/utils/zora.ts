import { createClient } from 'urql';

const API_URL = 'https://api.zora.co/graphql';
const STATIC_IMAGES_URL = "https://hey-assets.b-cdn.net/images" // ty hey

const CHAIN_ID_TO_NETWORK_INPUT = {
  84531: { network: 'BASE', chain: 'BASE_GOERLI' },
  8453: { network: 'BASE', chain: 'BASE_MAINNET' },
};

const FETCH_TOKEN = `
  query FetchToken($address: String!, $tokenId: String!, $network: NetworkInput!) {
    token(token:{address: $address, tokenId: $tokenId}, network: $network) {
      token {
        metadata
      }
    }
  }
`;

export const fetchTokenWithMetadata = async (address: string, tokenId: string, chainId: string) => {
  const client = createClient({ url: API_URL });

  const { data } = await client.query(FETCH_TOKEN, {
    address,
    tokenId,
    network: CHAIN_ID_TO_NETWORK_INPUT[chainId]
  }).toPromise();

  return data?.token?.token?.metadata;
};

export const getChainInfo = (chain: number): { logo: string; name: string } => {
  switch (chain) {
    case 1:
    case 5:
      return {
        logo: `${STATIC_IMAGES_URL}/chains/ethereum.svg`,
        name: chain === 1 ? 'Ethereum' : 'Goerli'
      };
    case 10:
    case 420:
      return {
        logo: `${STATIC_IMAGES_URL}/chains/optimism.svg`,
        name: chain === 10 ? 'Optimism' : 'Optimism Testnet'
      };
    case 7777777:
    case 999:
      return {
        logo: `${STATIC_IMAGES_URL}/chains/zora.svg`,
        name: chain === 7777777 ? 'Zora' : 'Zora Testnet'
      };
    case 8453:
    case 84531:
      return {
        logo: `${STATIC_IMAGES_URL}/chains/base.svg`,
        name: chain === 8453 ? 'Base' : 'Base Testnet'
      };
    case 424:
      return {
        logo: `${STATIC_IMAGES_URL}/chains/pgn.svg`,
        name: 'PGN Network'
      };
    default:
      return {
        logo: `${STATIC_IMAGES_URL}/chains/ethereum.svg`,
        name: 'Ethereum'
      };
  }
};
