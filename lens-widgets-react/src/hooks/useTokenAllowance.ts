import { useState, useEffect } from 'react';
import { Abi, PublicClient, WalletClient, zeroAddress } from 'viem';
import IERC20Abi from "@madfi/lens-oa-client/dist/abis/IERC20.json";

export default (
  publicClient: PublicClient,
  walletClient?: WalletClient,
  tokenAddress?: `0x${string}`,
  spender?: `0x${string}`,
) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [allowance, setAllowance] = useState<BigInt>(BigInt(0));

  const fetchAllowance = async () => {
    const [address] = await walletClient!.getAddresses();
    const _allowance = await publicClient.readContract({
      address: tokenAddress!,
      abi: IERC20Abi as unknown as Abi,
      functionName: "allowance",
      args: [address!, spender!],
    });
    setAllowance(_allowance as BigInt);
    setIsLoading(false);
  };

  useEffect(() => {
    if ((tokenAddress && tokenAddress !== zeroAddress) && walletClient) {
      setIsLoading(true);
      fetchAllowance();
    }
  }, [tokenAddress, walletClient]);

  return {
    isLoading,
    allowance,
    refetch: fetchAllowance,
  };
}