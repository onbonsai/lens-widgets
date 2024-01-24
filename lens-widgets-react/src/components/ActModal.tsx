import { useMemo } from "react";
import { ProfileFragment } from "@lens-protocol/client";
import { WalletClient } from "viem";
import Modal from "./Modal";
import HandlerBase from "../actions/handlers/HandlerBase";
import ZoraLzMintActionModal from "./../actions/modals/ZoraLzMintActionModal";
import SimpleCollectionMintActionModal from "../actions/modals/SimpleCollectionMintActionModal";
import RewardEngagementActionModal from "../actions/modals/RewardEngagementModal";
import PublicationBountyActionModal from "../actions/modals/PublicationBountyActionModal";
import { Toast } from "../types";

interface ActModalProps {
  handler: HandlerBase;
  openActModal: boolean;
  setOpenActModal: (b: boolean) => void;
  style: { backgroundColor: string; color: string }
  publicationBy: ProfileFragment;
  walletClient: WalletClient;
  isDarkTheme: boolean;
  countOpenActions: number;
  toast?: Toast;
  appDomainWhitelistedGasless?: boolean;
  onActButtonClick?: (e, actionModuleHandler?: HandlerBase) => void,
  handlePinMetadata?: (content: string, files: any[]) => Promise<string> // to upload post content on bounties
  signless?: boolean; // whether the authenticated profile has enabled signless
};

const ActModal = ({
  handler,
  openActModal,
  setOpenActModal,
  style,
  publicationBy,
  walletClient,
  isDarkTheme,
  countOpenActions,
  toast,
  appDomainWhitelistedGasless,
  onActButtonClick,
  handlePinMetadata,
  signless,
}: ActModalProps) => {
  const handlerModal = useMemo(() => {
    const { metadata } = handler.getActionModuleConfig();

    // TODO: make this more dynamic in registry
    // open your handler modal
    if (metadata?.metadata?.name === "ZoraLzMintActionV1") {
      return (
        <ZoraLzMintActionModal
          // @ts-expect-error: casted correctly in the modal
          handler={handler}
          publicationBy={publicationBy}
          walletClient={walletClient}
          isDarkTheme={isDarkTheme}
          countOpenActions={countOpenActions}
          toast={toast}
          appDomainWhitelistedGasless={appDomainWhitelistedGasless}
        />
      );
    } else if (metadata?.metadata?.name === "SimpleCollectionMintAction") {
      return (
        <SimpleCollectionMintActionModal
          // @ts-expect-error: casted correctly in the modal
          handler={handler}
          publicationBy={publicationBy}
          walletClient={walletClient}
          isDarkTheme={isDarkTheme}
          countOpenActions={countOpenActions}
          toast={toast}
          appDomainWhitelistedGasless={appDomainWhitelistedGasless}
        />
      );
    } else if (metadata?.metadata?.name === "RewardEngagementAction") {
      return (
        <RewardEngagementActionModal
          // @ts-expect-error: casted correctly in the modal
          handler={handler}
          publicationBy={publicationBy}
          walletClient={walletClient}
          isDarkTheme={isDarkTheme}
          countOpenActions={countOpenActions}
          toast={toast}
          appDomainWhitelistedGasless={appDomainWhitelistedGasless}
        />
      );
    } else if (metadata?.metadata?.name === "PublicationBountyAction") {
      return (
        <PublicationBountyActionModal
          // @ts-expect-error: casted correctly in the modal
          handler={handler}
          publicationBy={publicationBy}
          walletClient={walletClient}
          isDarkTheme={isDarkTheme}
          countOpenActions={countOpenActions}
          toast={toast}
          appDomainWhitelistedGasless={appDomainWhitelistedGasless}
          onActButtonClick={onActButtonClick}
          handlePinMetadata={handlePinMetadata}
          signless={signless}
        />
      );
    }

    return null;
  }, [handler])

  return (
    <Modal
      onClose={() => setOpenActModal(false)}
      open={openActModal}
      style={style}
    >
      {handlerModal}
    </Modal>
  )
}

export default ActModal;