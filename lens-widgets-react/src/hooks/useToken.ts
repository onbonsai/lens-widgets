import { useState, useEffect } from 'react';
import { Abi, PublicClient, zeroAddress } from 'viem';
import IERC20Abi from "../actions/abis/IERC20.json";

export default (
  publicClient: PublicClient,
  tokenAddress?: `0x${string}`
) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [token, setToken] = useState<{ symbol: string; decimals: number } | undefined>();

  const fetchToken = async () => {
    const [symbol, decimals] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress!,
        abi: IERC20Abi as unknown as Abi,
        functionName: "symbol"
      }),
      publicClient.readContract({
        address: tokenAddress!,
        abi: IERC20Abi as unknown as Abi,
        functionName: "decimals"
      })
    ]);
    console.log(`symbol: ${symbol}, decimals:${decimals}`);

    setToken({
      symbol: symbol as string,
      decimals: decimals as number
    });
    setIsLoading(false);
  };

  useEffect(() => {
    if ((tokenAddress && tokenAddress !== zeroAddress)) {
      setIsLoading(true);
      fetchToken();
    }
  }, [tokenAddress]);

  return {
    isLoading,
    token,
  };
}