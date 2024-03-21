import { useMemo } from "react";
import { PostFragment } from "@lens-protocol/client";
import { WalletClient } from "viem";
import Modal from "./Modal";
import {
  ActionHandler,
  ZoraLzMintAction,
  SimpleCollectionMintAction,
  RewardEngagementAction,
  PublicationBountyAction
} from "@madfi/lens-oa-client";
import ZoraLzMintActionModal from "./modals/ZoraLzMintActionModal";
import SimpleCollectionMintActionModal from "./modals/SimpleCollectionMintActionModal";
import RewardEngagementActionModal from "./modals/RewardEngagementModal";
import PublicationBountyActionModal from "./modals/PublicationBountyActionModal";
import { Toast } from "../types";

interface ActModalProps {
  handler: ActionHandler;
  openActModal: boolean;
  setOpenActModal: (b: boolean) => void;
  style: { backgroundColor: string; color: string }
  publication: PostFragment;
  walletClient: WalletClient;
  isDarkTheme: boolean;
  countOpenActions: number;
  toast?: Toast;
  appDomainWhitelistedGasless?: boolean;
  onActButtonClick?: (e, actionModuleHandler?: ActionHandler) => void,
  handlePinMetadata?: (content: string, files: any[]) => Promise<string> // to upload post content on bounties
  signless?: boolean; // whether the authenticated profile has enabled signless
};

const ActModal = ({
  handler,
  openActModal,
  setOpenActModal,
  style,
  publication,
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
          handler={handler as ZoraLzMintAction}
          publicationBy={publication.by}
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
          handler={handler as SimpleCollectionMintAction}
          publicationBy={publication.by}
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
          handler={handler as RewardEngagementAction}
          publicationBy={publication.by}
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
          handler={handler as PublicationBountyAction}
          publicationBy={publication.by}
          // @ts-expect-error: publication
          publicationContent={publication.metadata.content}
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