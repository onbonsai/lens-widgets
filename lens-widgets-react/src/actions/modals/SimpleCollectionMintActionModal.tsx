import { useMemo, useState } from "react";
import { ProfileFragment } from "@lens-protocol/client";
import { Abi, WalletClient, formatUnits } from "viem";
import { SimpleCollectionMintAction } from "../handlers/SimpleCollectionMintAction";
import IERC20Abi from "./../abis/IERC20.json";
import useTokenBalance from "../../hooks/useTokenBalance";
import useTokenAllowance from "../../hooks/useTokenAllowance";
import useToken from "../../hooks/useToken";
import { Toast } from "../../types";
import { actOnchain, actWithSignedTypedata } from "../utils/lens";
import { OpenseaLogo } from "../../icons/logos/Opensea";

const SimpleCollectionMintActionModal = ({
  handler,
  publicationBy,
  walletClient,
  isDarkTheme,
  countOpenActions,
  toast,
  appDomainWhitelistedGasless,
}: {
  handler: SimpleCollectionMintAction,
  publicationBy: ProfileFragment,
  walletClient: WalletClient,
  isDarkTheme: boolean,
  countOpenActions: number,
  toast?: Toast,
  appDomainWhitelistedGasless?: boolean
}) => {
  const [isApproving, setIsApproving] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [hasMinted, setHasMinted] = useState(handler.hasMinted || false);
  const [freshTokenId, setFreshTokenId] = useState<BigInt | undefined>();
  const totalMinted = handler.publicationCollectConfig?.currentCollects; // TODO: consider using collection data for total
  const currency = handler.publicationCollectConfig?.currency;

  const {
    isLoading: isLoadingBalance,
    balance
  } = useTokenBalance(handler.publicClient, walletClient, currency);
  const {
    isLoading: isLoadingAllowance,
    allowance,
    refetch: refetchAllowance
  } = useTokenAllowance(handler.publicClient, walletClient, currency, handler.address);
  const {
    isLoading: isLoadingCurrency,
    token: tokenData
  } = useToken(handler.publicClient, currency);

  const formattedCost = useMemo(() => {
    if (!handler.isFreeMint && !isLoadingCurrency && tokenData?.decimals) {
      return parseFloat(
        formatUnits(BigInt(handler.publicationCollectConfig!.amount.toString()), tokenData!.decimals)
      ).toFixed(5);
    }
  }, [handler, currency, isLoadingCurrency, tokenData]);

  const formattedBalance = useMemo(() => {
    if (!isLoadingBalance && !isLoadingCurrency && tokenData?.decimals) {
      return parseFloat(formatUnits(BigInt(balance.toString()), tokenData!.decimals)).toFixed(5);
    }
  }, [isLoadingBalance, balance, isLoadingCurrency, tokenData]);

  const insufficientBalance = useMemo(() => {
    if (!handler.isFreeMint && !isLoadingBalance) {
      return balance < handler.publicationCollectConfig!.amount;
    }
  }, [handler, balance]);

  const insufficientAllowance = useMemo(() => {
    if (!handler.isFreeMint && !isLoadingAllowance) {
      return allowance < handler.publicationCollectConfig!.amount;
    }
  }, [handler, isLoadingAllowance, allowance]);

  const actionModuleMetadata: { displayName?: string, description?: string } = useMemo(() => {
    const { displayName, description } = handler.getActionModuleConfig();
    return { displayName, description };
  }, [handler]);

  const handleAct = async () => {
    setIsMinting(true);
    let toastId;
    try {
      if (toast) toastId = toast.loading('Minting');
      await walletClient.switchChain({ id: handler.chain.id });
      const encodedActionModuleData = handler.encodeModuleActData({
        currency: currency!,
        amount: handler.publicationCollectConfig!.amount.toString(),
      });
      const metadata = handler.getActionModuleConfig().metadata;
      const useGasless = appDomainWhitelistedGasless && (!handler.isPolygon || metadata?.sponsoredApproved);
      let txReceipt;
      if (useGasless) {
        const txHash = await actWithSignedTypedata(
          handler.lensClient,
          walletClient,
          handler.publicationId!,
          handler.address,
          encodedActionModuleData
        );
        txReceipt = await handler.publicClient.waitForTransactionReceipt({ hash: txHash });
      } else {
        txReceipt = await actOnchain(
          walletClient,
          handler,
          encodedActionModuleData,
          { gasLimit: 500_000 }
        );
      }

      if (txReceipt.status !== "success") throw new Error("tx reverted");
      setFreshTokenId(handler.getResultingTokenId(txReceipt));
      setHasMinted(true);
      if (toast) toastId = toast.success('Minted!', { id: toastId });
    } catch (error) {
      console.log(error);
      if (toast) toastId = toast.error('Failed', { id: toastId });
    }
    setIsMinting(false);
  }

  const handleApprove = async () => {
    setIsApproving(true);
    let toastId;
    try {
      if (toast) toastId = toast.loading('Approving token transfer');
      await walletClient.switchChain({ id: handler.chain.id });

      const [address] = await walletClient.getAddresses();
      const hash = await walletClient.writeContract({
        chain: handler.chain,
        account: address,
        address: currency!,
        abi: IERC20Abi as Abi,
        functionName: "approve",
        args: [handler.address, handler.publicationCollectConfig!.amount],
      });
      console.log(`tx: ${hash}`);
      await handler.publicClient.waitForTransactionReceipt({ hash });
      if (toast) toast.success('Approved', { id: toastId });
      refetchAllowance();
    } catch (error) {
      console.log(error);
      if (toast) toast.error('Failed', { id: toastId });
    }
    setIsApproving(false);
  }

  return (
    <div className="flex flex-col w-full mt-8">
      <h2 className="text-3xl uppercase text-center font-owners font-bold">
        {actionModuleMetadata.displayName}
      </h2>
      <h2 className="text-lg text-center font-owners font-light mt-2">
        {actionModuleMetadata.description}
      </h2>
      <div className="flex flex-col w-full items-center justify-center md:pb-4">
        <div className="flex flex-col space-y-2 justify-center mt-8">
          <div className="mb-4">
            <div className="mb-4 flex items-center gap-x-2">
              <div className="flex items-center space-x-2">
                <img
                  alt="0x01a6"
                  className="h-5 w-5 rounded-full border bg-gray-200 dark:border-gray-700"
                  height="20"
                  src={publicationBy.metadata?.picture?.__typename === 'NftImage' ?
                    publicationBy.metadata.picture?.image.optimized?.uri : publicationBy.metadata?.picture?.optimized?.uri}
                  width="20"
                />
                <div className="flex max-w-full flex-wrap items-center">
                  <div className="mr-2 max-w-[75%] truncate">{publicationBy.metadata?.displayName}</div>
                  <span className="ld-text-gray-500 text-sm">[@{publicationBy.handle?.localName}]</span>
                </div>
              </div>
            </div>
          </div>
          {!hasMinted && (
            <div className="flex flex-col space-y-2 justify-center w-[350px] items-center">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-20">Cost</div>
                  <div className="flex-grow flex items-center relative">
                    {
                      !handler.isFreeMint
                        ? <div className="space-x-1.5">
                            <b>{`${formattedCost} ${tokenData?.symbol}`}</b>
                          </div>
                        : <div className="space-x-1.5">
                            <b>Free</b>
                          </div>
                    }
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-20">Minted</div>
                  <div className="space-x-1.5">
                    <b>{totalMinted?.toString()}</b>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {!hasMinted && (
          <div className="flex flex-col space-y-2 justify-center mt-12">
            {!isLoadingAllowance && insufficientAllowance && (
              <button
                className={`md:px-12 px-12 py-2 ${isDarkTheme ? 'bg-white text-black' : 'bg-black text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}
                onClick={handleApprove}
                disabled={insufficientBalance || isApproving}
              >
                Approve
              </button>
            )}
            {!isLoadingAllowance && !insufficientAllowance && (
              <button
                className={`md:px-12 px-12 py-2 ${isDarkTheme ? 'bg-white text-black' : 'bg-black text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}
                onClick={handleAct}
                disabled={insufficientBalance || isMinting}
              >
                {handler.isFreeMint ? 'Free mint' : 'Mint'}
              </button>
            )}
            {!isLoadingBalance && insufficientBalance && <span className="text-sm text-center font-light mt-4">Insufficient balance: {formattedBalance}</span>}
            {!handler.isFreeMint && !isLoadingBalance && !insufficientBalance && <span className="text-sm text-center font-light mt-4">Balance: {formattedBalance}</span>}
          </div>
        )}
        {hasMinted && (
          <div className="flex flex-col justify-center items-center">
            <h2 className="text-lg text-center justify-center items-center font-owners font-light mt-2">
              Welcome to the Social Club 🎉 Your badge NFT has been minted
              {freshTokenId && (
                <div className="flex justify-center items-center mt-4">
                  <a href={handler.mintableNFTURLs?.opensea} target="_blank" rel="noopener noreferrer">
                    <button className={`flex items-center space-x-2 px-4 rounded-xl py-2 ${isDarkTheme ? 'bg-white text-black' : 'bg-black text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                      <OpenseaLogo />
                      <span>View on Opensea</span>
                    </button>
                  </a>
                </div>
              )}
            </h2>
          </div>
        )}
      </div>
    </div>
  );
}

export default SimpleCollectionMintActionModal;