import { useMemo, useState } from "react";
import { ProfileFragment } from "@lens-protocol/client";
import { WalletClient, formatUnits, parseUnits } from "viem";
import { PublicationBountyAction } from "@madfi/lens-oa-client/src/handlers/PublicationBountyAction";
import { MADFI_URL, MADFI_URL_TESTNET, BOUNTIES_TESTNET_ADDRESS, BOUNTIES_MAINNET_ADDRESS } from "@madfi/lens-oa-client/src/utils/madfi";
import { actOnchain, actWithSignedTypedata, actSignless } from "@madfi/lens-oa-client";
import { Toast } from "../../types";
import useIsProfileManager from "../../hooks/useIsProfileManager";
import { enableProfileManagerGasless } from "../../services/profileManager";
import { GenericUploader } from "../GenericUploader";
import { polygonScanUrl } from "../../utils";

const PublicationBountyActionModal = ({
  handler,
  publicationBy,
  publicationContent,
  walletClient,
  isDarkTheme,
  countOpenActions,
  toast,
  appDomainWhitelistedGasless,
  onActButtonClick,
  handlePinMetadata,
  signless,
}: {
  handler: PublicationBountyAction,
  publicationBy: ProfileFragment,
  publicationContent: string,
  walletClient: WalletClient,
  isDarkTheme: boolean,
  countOpenActions: number,
  toast?: Toast,
  appDomainWhitelistedGasless?: boolean
  onActButtonClick?: (e, actionModuleHandler?: PublicationBountyAction) => void,
  handlePinMetadata?: (content: string, files: any[]) => Promise<string>,
  signless?: boolean;
}) => {
  const bounty = handler.publicationBounty!.bounty;
  const paymentToken = handler.paymentToken;
  const activeBid = handler.activeBid;

  const [enablingRewards, setEnablingRewards] = useState(false);
  const [hasBid, setHasBid] = useState(!!activeBid || false);
  const [content, setContent] = useState("");
  const [bid, setBid] = useState("");
  const [revShare, setRevShare] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const bountiesAddress = handler.isPolygon ? BOUNTIES_MAINNET_ADDRESS : BOUNTIES_TESTNET_ADDRESS;
  const {
    data: isProfileManager,
    isLoading: isLoadingProfileManager,
    refetch: fetchIsProfileManager
  } = useIsProfileManager(handler.lensClient, handler.authenticatedProfileId, bountiesAddress);

  const getParsedBidCount = () => {
    let bidCount = 0;
    if (!!publicationContent) {
      const matches = publicationContent.match(/(\b(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b)\s*(?:posts|bids|creators|profiles)/i);
      if (matches) {
        const numberWord = matches[1].toLowerCase();
        const wordToNumber = {
          "one": 1,
          "two": 2,
          "three": 3,
          "four": 4,
          "five": 5,
          "six": 6,
          "seven": 7,
          "eight": 8,
          "nine": 9,
          "ten": 10
        };
        bidCount = wordToNumber[numberWord] || parseInt(numberWord);
      }
    }

    return bidCount;
  };

  const actionModuleMetadata: { displayName?: string, description?: string } = useMemo(() => {
    const { displayName, description } = handler.getActionModuleConfig();
    return { displayName, description };
  }, [handler]);

  const bidAmountOrNull = useMemo(() => {
    return hasBid && activeBid?.approved
      ? `${parseFloat(formatUnits(BigInt(activeBid.bidAmount), paymentToken!.decimals)).toFixed(2)} ${paymentToken!.symbol}`
      : null;
  }, [hasBid]);

  const bountyAmount = useMemo(() => {
    return bounty && paymentToken
      ? parseFloat(formatUnits(BigInt(bounty.budget), paymentToken!.decimals)).toFixed(2)
      : '0';
  }, [bounty, paymentToken]);

  const suggestedBidAmount = useMemo(() => {
    const parsedBidCount = getParsedBidCount();

    console.log(`bountyAmount: ${bountyAmount}`)

    const amount = parseFloat(bountyAmount);
    let suggestedAmount = amount;

    if (amount > 20) {
      suggestedAmount = amount * 0.2; // 20% of the bountyAmount
    }

    console.log(`suggestedAmount: ${suggestedAmount}`)

    const approvedBids = handler.publicationBounty?.bids.filter(bid => bid.approved);

    // best estimate here if we can parse out the bid count and know how many were approved
    if (parsedBidCount) {
      const approvedBidCount = approvedBids?.length || 0;
      suggestedAmount = amount / (parsedBidCount - approvedBidCount);
    } else if (approvedBids && approvedBids.length > 0) {
      const totalApprovedBidAmount = approvedBids.reduce((total, bid) => total + parseFloat(formatUnits(BigInt(bid.bidAmount), paymentToken!.decimals)), 0);

      const averageApprovedBidAmount = totalApprovedBidAmount / approvedBids.length;

      // If the average approved bid amount is greater than the suggested amount, use the average instead
      if (averageApprovedBidAmount > suggestedAmount) {
        suggestedAmount = averageApprovedBidAmount;
      }
    }

    return suggestedAmount.toFixed(2);
  }, [bountyAmount, handler.publicationBounty?.bids, publicationContent]);

  const enableProfileManager = async () => {
    setEnablingRewards(true);

    let toastId;
    try {
      toastId = toast?.loading("Approving bounties...");

      if (appDomainWhitelistedGasless) {
        await enableProfileManagerGasless(handler.lensClient, walletClient, bountiesAddress);
      } else {
        throw new Error('Only gasless experience supported for now');
      }

      const checkIsProfileManager = async () => {
        while (true) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          const check = await fetchIsProfileManager();
          if (check.data) break;
        }
      };

      await checkIsProfileManager();

      toast?.success(`Done! You can now submit your bid`, { duration: 5_000, id: toastId });
    } catch (error) {
      console.log(error);
      toast?.error("Error approving profile manager", { id: toastId });
    }

    setEnablingRewards(false);
  };

  const handleAct = async (event) => {
    event.preventDefault();

    if (!handlePinMetadata) {
      if (!toast) throw new Error('Missing prop function handlePinMetadata; unable to pin metadata');
      toast?.error('Unable to pin metadata')
    } else {
      let toastId;
      setIsSubmitting(true);

      try {
        const contentURI = await handlePinMetadata(content, files.map(({ file }) => file));
        if (!contentURI) throw new Error('Missing contentURI');

        toastId = toast?.loading('Submitting bid');
        await walletClient.switchChain({ id: handler.chain.id });

        const encodedActionModuleData = handler.encodeModuleActData({
          bidAmount: parseUnits(bid, paymentToken!.decimals).toString(),
          contentURI,
          revShare: revShare ? parseInt(revShare) : 0,
          // TODO: next level is to reward engagement on this
          // rewardActionModuleInitData: undefined
        });
        const metadata = handler.getActionModuleConfig().metadata;
        const useGasless = appDomainWhitelistedGasless && (!handler.isPolygon || metadata?.sponsoredApproved);
        const useSignless = signless && (!handler.isPolygon || metadata?.signlessApproved);

        let txReceipt;
        if (useSignless) {
          const txHash = await actSignless(
            handler.lensClient,
            handler.publicationId!,
            handler.address,
            encodedActionModuleData
          );
          if (!txHash) throw new Error('missing txHash');
          txReceipt = await handler.publicClient.waitForTransactionReceipt({ hash: txHash });
        } else if (useGasless) {
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
        toast?.success('Submitted!', { id: toastId });
        setHasBid(true);

      } catch (error) {
        console.log(error);
        toast?.error('Failed', { id: toastId });
      }
    }

    setIsSubmitting(false);
  }

  return (
    <div className="flex flex-col w-full mt-8">
      <h2 className="text-3xl uppercase text-center font-owners font-bold">
        Bounty is {bounty.open ? 'Active' : 'Closed'}
      </h2>
      <h2 className="text-lg text-center font-owners font-light mt-2 w-3/4 mx-auto">
        {handler.isProfileAdmin ? `${handler.publicationBounty?.bids.length} total bids` : actionModuleMetadata.description}
      </h2>
      <div className="flex flex-col w-full items-center justify-center md:pb-4">
        {!isLoadingProfileManager && !isProfileManager && handler.authenticatedProfileId && !handler.isProfileAdmin && (
          <div className="flex flex-col space-y-2 justify-center mt-8">
            <div className="flex justify-center">
              <div className="text-lg text-center font-medium">
                You must enable the
                <a
                  href={polygonScanUrl({ isPolygon: handler.isPolygon!, address: bountiesAddress })}
                  className="link link-hover ml-1"
                  target="_blank"
                >
                  Bounties Contract
                </a>
                 {" "}as a
                <a
                  href="https://docs.lens.xyz/v2/docs/profile-manager"
                  className="link link-hover ml-1"
                  target="_blank"
                >
                  profile manager
                </a>
                {" "}to submit your post in the same transaction you get paid.
              </div>
            </div>
            <div className="flex justify-center pt-4">
              <button
                className={`md:px-12 px-12 py-2 ${isDarkTheme ? 'bg-white text-black' : 'bg-black text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}
                onClick={enableProfileManager}
                disabled={enablingRewards}>
                Enable
              </button>
            </div>
          </div>
        )}
        {handler.isProfileAdmin && (
          <div className="flex flex-col justify-center items-center">
            <h2 className="text-lg text-center justify-center items-center font-owners font-light mt-2">
              <a
                href={`${handler.isPolygon ? MADFI_URL : MADFI_URL_TESTNET}/bounties/lens/${handler.publicationId}`}
                className="link link-hover ml-1"
                target="_blank"
              >
                View and approve bids here
              </a>
            </h2>
          </div>
        )}
        {hasBid && (
          <div className="flex flex-col justify-center items-center">
            <h2 className="text-lg text-center justify-center items-center font-owners font-light mt-2">
              {!activeBid?.approved && 'Pending approval...'}
              {activeBid?.approved && (
                <span>Approved! You earned {bidAmountOrNull}.
                  <a
                    href={polygonScanUrl({ isPolygon: handler.isPolygon!, tx: activeBid!.approvedTxHash })}
                    className="link link-hover ml-1"
                  >
                    View transaction.
                  </a>
                </span>
              )}
            </h2>
          </div>
        )}
        {/* Form */}
        {!isLoadingProfileManager && isProfileManager && !handler.isProfileAdmin && !hasBid && (
          <div
            onSubmit={handleAct}
            className="p-4 mx-auto max-w-fit min-w-[50%] space-y-2"
          >
            <div className="flex flex-col w-full items-center justify-center md:pb-12">
              <div className="md:max-w-3/4 w-full grid grid-cols-6 gap-4">
                {/* TEXT INPUTS */}
                {["description", "bid", "revShare"].map((item) => {
                  const field = item as keyof typeof fields;
                  const fields = {
                    description: {
                      label: "Post body",
                      placeholder: "Enter your post...",
                      type: "textarea",
                      colSpan: "6",
                      value: content,
                      onChange: (e) => setContent(e.target.value)
                    },
                    bid: {
                      label: `Bid Amount (up to ${suggestedBidAmount} ${paymentToken?.symbol})`,
                      placeholder: suggestedBidAmount,
                      type: "number",
                      colSpan: "3",
                      value: bid,
                      onChange: (e) => setBid(e.target.value)
                    }
                  };
                  return (
                    <div key={field} className={`col-span-${fields[field].colSpan} gap-2`}>
                      <label htmlFor={field} className="text-sm min-w-[25%] text-secondary">
                        {fields[field].label}
                      </label>
                      {fields[field].type === "textarea" ? (
                        <textarea
                          rows={3}
                          placeholder={fields[field].placeholder as string}
                          className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm mt-2"
                          disabled={isSubmitting}
                          value={fields[field].value}
                          onChange={fields[field].onChange}
                        />
                      ) : (
                        <input
                          type={fields[field].type}
                          placeholder={fields[field].placeholder as string}
                            className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent pr-12 shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm mt-2"
                          disabled={isSubmitting}
                          value={fields[field].value}
                          onChange={fields[field].onChange}
                        />
                      )}
                    </div>
                  );
                })}
                {/* Files */}
                <div className="col-span-6">
                  <label className="text-sm min-w-[25%] text-secondary">
                    Media (up to 3 files)
                  </label>
                  <div className="mt-2">
                    <GenericUploader files={files} setFiles={setFiles} isDarkTheme={isDarkTheme} />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <button
                className={`md:px-12 px-12 py-2 ${isDarkTheme ? 'bg-white text-black' : 'bg-black text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}
                onClick={handleAct}
                disabled={isSubmitting || !(content && bid)}>
                Submit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicationBountyActionModal;