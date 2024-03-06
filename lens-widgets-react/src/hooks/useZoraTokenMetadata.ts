import { useState, useEffect } from 'react';
import { zeroAddress } from "viem";
import { fetchTokenWithMetadata } from '../../packages/lens-oa-client/actions/utils/zora';

export const useZoraTokenMetadata = (
  tokenAddress?: `0x${string}`,
  tokenId?: string,
  chainId?: number
) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tokenMetadata, setTokenMetadata] = useState();

  const fetchToken = async () => {
    const metadata = await fetchTokenWithMetadata(tokenAddress!, tokenId!, chainId!);
    setTokenMetadata(metadata);
    setIsLoading(false);
  };

  useEffect(() => {
    if ((tokenAddress && tokenAddress !== zeroAddress) && tokenId && chainId) {
      setIsLoading(true);
      fetchToken();
    }
  }, [tokenAddress, tokenId, chainId]);

  return {
    isLoading,
    tokenMetadata
  };
}