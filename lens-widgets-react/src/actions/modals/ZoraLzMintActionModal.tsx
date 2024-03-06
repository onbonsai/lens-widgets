import { useEffect, useMemo, useState } from "react";
import { ProfileFragment } from "@lens-protocol/client";
import { Abi, TransactionReceipt, WalletClient, formatEther } from "viem";
import Spinner from "../../components/Spinner";
import { ZoraLzMintAction, QuoteData } from "../../../packages/lens-oa-client/src/handlers/ZoraLzMintAction";
import IERC20Abi from "../../../packages/lens-oa-client/src/abis/IERC20.json";
import useTokenBalance from "../../hooks/useTokenBalance";
import useTokenAllowance from "../../hooks/useTokenAllowance";
import { Toast } from "../../types";
import { actOnchain, actWithSignedTypedata } from "../../../packages/lens-oa-client/src/utils/lens";
import { OpenseaLogo } from "../../icons/logos/Opensea";
import { LayerZeroLogo } from "../../icons/logos/LayerZero";

const ZoraLzMintActionModal = ({
  handler,
  publicationBy,
  walletClient,
  isDarkTheme,
  countOpenActions,
  toast,
  appDomainWhitelistedGasless,
}: {
  handler: ZoraLzMintAction,
  publicationBy: ProfileFragment,
  walletClient: WalletClient,
  isDarkTheme: boolean,
  countOpenActions: number,
  toast?: Toast,
  appDomainWhitelistedGasless?: boolean,
}) => {
  const [currency, setCurrency] = useState({ address: handler.weth, symbol: "WETH"});
  const [isLoadingQuoteData, setIsLoadingQuoteData] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [quoteData, setQuoteData] = useState<QuoteData | undefined>();
  const [txHash, setTxHash] = useState("");
  const totalMinted = countOpenActions; // TODO: need to query zora instead of this proxy stat
  const estimatedRelayTime = handler.isPolygon ? '20 minutes' : '30 seconds'; // TODO: use lz relay api when released

  const {
    isLoading: isLoadingBalance,
    balance
  } = useTokenBalance(handler.publicClient, walletClient, currency.address);
  const {
    isLoading: isLoadingAllowance,
    allowance,
    refetch: refetchAllowance
  } = useTokenAllowance(handler.publicClient, walletClient, currency.address, handler.address);

  useEffect(() => {
    const fetchQuoteData = async () => {
      const [address] = await walletClient.getAddresses();
      const data = await handler.getQuotesForCreatorPublication(address, currency.address);
      setQuoteData(data);
      setIsLoadingQuoteData(false);
    };

    setIsLoadingQuoteData(true);
    fetchQuoteData();
  }, [handler, walletClient, currency]);

  const formattedCost = useMemo(() => {
    if (!isLoadingQuoteData && quoteData?.quotedAmountIn) {
      return parseFloat(formatEther(BigInt(quoteData.quotedAmountIn.toString()))).toFixed(5);
    }
  }, [quoteData, isLoadingQuoteData]);

  const formattedBalance = useMemo(() => {
    if (!isLoadingBalance) {
      return parseFloat(formatEther(BigInt(balance.toString()))).toFixed(5);
    }
  }, [quoteData, isLoadingBalance]);

  const insufficientBalance = useMemo(() => {
    if (!isLoadingQuoteData && quoteData?.quotedAmountIn && !isLoadingBalance) {
      return balance < quoteData.quotedAmountIn;
    }
  }, [quoteData, isLoadingQuoteData, isLoadingBalance, balance]);

  const insufficientAllowance = useMemo(() => {
    if (!isLoadingQuoteData && quoteData?.quotedAmountIn && !isLoadingAllowance) {
      return allowance < quoteData.quotedAmountIn;
    }
  }, [quoteData, isLoadingQuoteData, isLoadingAllowance, allowance]);

  const actionModuleMetadata: { displayName?: string, description?: string } = useMemo(() => {
    const { displayName, description } = handler.getActionModuleConfig();
    return { displayName, description };
  }, [handler]);

  const getRelayScanURL = (txHash: string): string => (
    `https://${handler.isPolygon ? '' : 'testnet.'}layerzeroscan.com/tx/${txHash}`
  );

  const handleAct = async () => {
    setIsMinting(true);
    let toastId;
    try {
      if (toast) toastId = toast.loading('Sending');
      await walletClient.switchChain({ id: handler.chain.id });
      const encodedActionModuleData = handler.encodeModuleActData({
        currency: currency.address,
        quantity: 1,
        quotedAmountIn: quoteData!.quotedAmountIn.toString()
      });

      const metadata = handler.getActionModuleConfig().metadata;
      const useGasless = appDomainWhitelistedGasless && (!handler.isPolygon || metadata?.sponsoredApproved);

      let txHash: string;
      // TODO: pass in referrers (lens clients?)
      if (useGasless) {
        txHash = await actWithSignedTypedata(
          handler.lensClient,
          walletClient,
          handler.publicationId!,
          handler.address,
          encodedActionModuleData
        );
      } else {
        const txReceipt: TransactionReceipt = await actOnchain(
          walletClient,
          handler,
          encodedActionModuleData,
          { gasLimit: 750_000 }
        );
        txHash = txReceipt.transactionHash;
      }

      if (!txHash) throw new Error('no tx hash');

      setTxHash(txHash);
      if (toast) toastId = toast.success('Sent!', { id: toastId });
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
        address: currency.address,
        abi: IERC20Abi as Abi,
        functionName: "approve",
        args: [handler.address, quoteData!.quotedAmountIn],
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
      {handler.hasMinted && (
        <h2 className="text-lg font-bold text-center font-owners mt-4">
          Already minted 🎉
        </h2>
      )}
      <div className="flex flex-col w-full items-center justify-center md:pb-4">
        <div className="flex flex-col space-y-2 justify-center mt-4">
          <div className="mb-4">
            <div className="mb-1 text-xl font-bold">{handler.mintableNFTMetadata?.name}</div>
            <div className="mb-4 flex items-center gap-x-2">
              <span>by</span>
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
          {!txHash && (
            <div className="flex flex-col space-y-2 justify-center w-[350px] items-center">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-20">Cost</div>
                  <div className="flex-grow flex items-center relative">
                    {
                      isLoadingQuoteData
                        ? <div className="pl-6"><Spinner customClasses="h-3 w-3" color={isDarkTheme ? 'white' : 'black'} /></div>
                        : <div className="space-x-1.5">
                            <b>{formattedCost}</b>
                          </div>
                    }
                    <select
                      style={{ right: '-100px' }}
                      className="border rounded p-1 w-24 absolute bg-black text-white outline-none"
                      value={currency.address}
                      onChange={(e) => {
                        const selectedCurrency = handler.currencies?.find(currency => currency.address === e.target.value);
                        if (selectedCurrency) {
                          setCurrency(selectedCurrency);
                        }
                      }}
                    >
                      {handler.currencies?.map((currency, index) => (
                        <option key={index} value={currency.address} className="bg-black text-white">
                          {currency.symbol}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-20">Minted</div>
                  <div className="space-x-1.5">
                    <b>{totalMinted}</b>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-20">Type</div>
                  <div className="space-x-1.5">
                    <b>ERC-1155</b>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-20">Chain</div>
                  <div><b>{handler.remoteChain?.name}</b></div>
                </div>
              </div>
            </div>
          )}
        </div>
        {!txHash && (
          <div className="flex flex-col space-y-2 justify-center mt-12">
            {!isLoadingAllowance && insufficientAllowance && (
              <button
                className={`md:px-12 px-12 py-2 ${isDarkTheme ? 'bg-white text-black' : 'bg-black text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}
                onClick={handleApprove}
                disabled={insufficientBalance || isApproving}
              >
                {isLoadingQuoteData ? '...' : 'Approve'}
              </button>
            )}
            {!isLoadingAllowance && !insufficientAllowance && (
              <button
                className={`md:px-12 px-12 py-2 ${isDarkTheme ? 'bg-white text-black' : 'bg-black text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}
                onClick={handleAct}
                disabled={insufficientBalance || isMinting}
              >
                {isLoadingQuoteData ? <Spinner customClasses="h-2 w-2" color={isDarkTheme ? 'black' : 'white'} /> : 'Mint'}
              </button>
            )}
            {!isLoadingBalance && insufficientBalance && <span className="text-sm text-center font-light mt-4">Insufficient balance: {formattedBalance}</span>}
            {!isLoadingBalance && !insufficientBalance && <span className="text-sm text-center font-light mt-4">Balance: {formattedBalance}</span>}
          </div>
        )}
        {txHash && (
          <div className="flex flex-col justify-center items-center">
            <h2 className="text-lg text-center font-owners font-light mt-2">
              You will receive your NFT in your wallet in ~{`${estimatedRelayTime} (check LayerZero Scan)`}
              <br/>
              View the collection or track your transaction
            </h2>
            <div className="grid grid-cols-2 justify-center mt-8">
              <a href={handler.mintableNFTURLs?.opensea} target="_blank" rel="noopener noreferrer">
                <button className={`flex items-center space-x-2 px-4 rounded-xl py-2 ${isDarkTheme ? 'bg-white text-black' : 'bg-black text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                  <OpenseaLogo />
                  <span>Opensea</span>
                </button>
              </a>
              <a href={getRelayScanURL(txHash)} target="_blank" rel="noopener noreferrer">
                <button className={`flex items-center space-x-2 px-4 rounded-xl py-2 ${isDarkTheme ? 'bg-white text-black' : 'bg-black text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                  <LayerZeroLogo isDarkTheme={isDarkTheme} />
                  <span>LayerZero Scan</span>
                </button>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ZoraLzMintActionModal;