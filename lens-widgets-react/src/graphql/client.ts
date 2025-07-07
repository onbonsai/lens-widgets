import { createClient, Client } from 'urql'
import { mainnet } from "@lens-protocol/client";

const API_URL = {
  mainnet: 'https://api.lens.xyz/graphql',
  testnet: 'https://api.testnet.lens.xyz/graphql'
}

/* creates the API client */
export const createGraphqlClient = (environment = mainnet): Client => {
  return createClient({
    url: API_URL[environment.name as keyof typeof API_URL],
  })
}
