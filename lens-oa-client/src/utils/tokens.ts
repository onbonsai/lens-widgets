import { Abi, PublicClient } from "viem";
import IERC20Abi from "../abis/IERC20.json";

export const fetchToken = async (
  publicClient: PublicClient,
  tokenAddress: `0x${string}`
): Promise<{ symbol: string, decimals: number }> => {
  const [symbol, decimals] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress,
      abi: IERC20Abi as unknown as Abi,
      functionName: "symbol"
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: IERC20Abi as unknown as Abi,
      functionName: "decimals"
    })
  ]);

  return {
    symbol: symbol as string,
    decimals: decimals as number
  };
};