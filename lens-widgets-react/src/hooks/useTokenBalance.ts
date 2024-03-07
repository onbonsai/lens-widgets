import { useState, useEffect } from 'react';
import { Abi, PublicClient, WalletClient, zeroAddress } from 'viem';
import IERC20Abi from "@madfi/lens-oa-client/dist/abis/IERC20.json";

export default (
  publicClient: PublicClient,
  walletClient?: WalletClient,
  tokenAddress?: `0x${string}`
) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [balance, setBalance] = useState<BigInt>(BigInt(0));

  useEffect(() => {
    const fetchBalance = async () => {
      const [address] = await walletClient!.getAddresses();
      const _balance = await publicClient.readContract({
        address: tokenAddress!,
        abi: IERC20Abi as unknown as Abi,
        functionName: "balanceOf",
        args: [address!],
      });
      setBalance(_balance as BigInt);
      setIsLoading(false);
    };

    if ((tokenAddress && tokenAddress !== zeroAddress) && walletClient) {
      setIsLoading(true);
      fetchBalance();
    }
  }, [tokenAddress, walletClient]);

  return {
    isLoading,
    balance,
  };
}