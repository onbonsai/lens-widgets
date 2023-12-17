import { useMemo } from "react";
import { ProfileFragment } from "@lens-protocol/client";
import { WalletClient } from "viem";
import Modal from "./Modal";
import HandlerBase from "../actions/handlers/HandlerBase";
import ZoraLzMintActionModal from "./../actions/modals/ZoraLzMintActionModal";
import SimpleCollectionMintActionModal from "../actions/modals/SimpleCollectionMintActionModal";
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