import { useMemo, useState } from "react";
import { ProfileFragment } from "@lens-protocol/client";
import {  WalletClient } from "viem";
import { RewardEngagementAction } from "@madfi/lens-oa-client";
import { Toast } from "../../types";
import useIsProfileManager from "../../hooks/useIsProfileManager";
import { enableProfileManagerGasless } from "../../services/profileManager";
import { polygonScanUrl } from "../../utils";

const RewardEngagementModal = ({
  handler,
  publicationBy,
  walletClient,
  isDarkTheme,
  countOpenActions,
  toast,
  appDomainWhitelistedGasless,
}: {
  handler: RewardEngagementAction,
  publicationBy: ProfileFragment,
  walletClient: WalletClient,
  isDarkTheme: boolean,
  countOpenActions: number,
  toast?: Toast,
  appDomainWhitelistedGasless?: boolean
}) => {
  const [enablingRewards, setEnablingRewards] = useState(false);
  const [hasClaimed, _] = useState(handler.hasClaimed || false);
  const { data: isProfileManager, refetch: fetchIsProfileManager } = useIsProfileManager(
    handler.lensClient,
    handler.authenticatedProfileId,
    handler.address,
  );

  const actionModuleMetadata: { displayName?: string, description?: string } = useMemo(() => {
    const { displayName, description } = handler.getActionModuleConfig();
    return { displayName, description };
  }, [handler]);

  const enableProfileManager = async () => {
    setEnablingRewards(true);

    let toastId;
    try {
      toastId = toast?.loading("Approving rewards module...");

      if (appDomainWhitelistedGasless) {
        await enableProfileManagerGasless(handler.lensClient, walletClient, handler.address);
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

      toast?.success(`Done! You can now claim rewards from rewarded publications`, { duration: 5_000, id: toastId });
    } catch (error) {
      console.log(error);
      toast?.error("Error approving rewards module", { id: toastId });
    }

    setEnablingRewards(false);
  };

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
          {!isProfileManager && handler.authenticatedProfileId && !handler.isProfileAdmin && (
            <>
              <div className="flex justify-center">
                <div className="text-lg text-center font-medium">
                  You must enable the
                  <a
                    href={polygonScanUrl({ isPolygon: handler.isPolygon!, address: handler.address })}
                    className="link link-hover ml-1"
                    target="_blank"
                  >
                    Rewards Open Action
                  </a>
                  {" "}as a
                  <a
                    href="https://docs.lens.xyz/v2/docs/profile-manager"
                    className="link link-hover ml-1"
                    target="_blank"
                  >
                    profile manager. This allows the action module to post your comment/mirror/quote in the same transaction you get points.
                  </a>
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
            </>
          )}
        </div>
        {handler.isProfileAdmin && (
          <div className="flex flex-col justify-center items-center">
            <h2 className="text-lg text-center justify-center items-center font-owners font-light mt-2">
              Engagement is being rewarded 🎉
            </h2>
          </div>
        )}
        {hasClaimed && (
          <div className="flex flex-col justify-center items-center">
            <h2 className="text-lg text-center justify-center items-center font-owners font-light mt-2">
              Points claimed 🎉
            </h2>
          </div>
        )}
      </div>
    </div>
  );
}

export default RewardEngagementModal;