import { useState, useEffect } from 'react';
import { WalletClient } from 'viem';
import { Environment, PostFragment, CommentBaseFragment } from "@lens-protocol/client";
import { fetchActionModuleHandlers } from './../actions';
import HandlerBase from "./../actions/handlers/HandlerBase";

type PubWithModules = PostFragment | CommentBaseFragment;

export default (
  environment: Environment,
  publication?: PubWithModules,
  authenticatedProfileId?: string,
  walletClient?: WalletClient,
  focusedOpenActionModuleName?: string
) => {
  const [handler, setHandler] = useState<HandlerBase | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionModuleStateData, setActionModuleStateData] = useState({});

  const { openActionModules } = publication || {};

  useEffect(() => {
    if (environment && publication?.id && openActionModules?.length) {
      const [profileId, pubId] = publication.id.split("-");

      // @ts-expect-error we check `openActionModules` array length in `fetchActionModuleHandlers`
      const actionModulesHandlers = fetchActionModuleHandlers(environment, openActionModules);

      if (!actionModulesHandlers.length) return;

      // always take the first supported open action, unless a focus name is specified
      if (actionModulesHandlers.length == 1 || !focusedOpenActionModuleName) {
        const ActionModuleHandler = actionModulesHandlers[0].handler;

        setHandler(new ActionModuleHandler(environment, profileId, pubId, authenticatedProfileId));
      } else if (focusedOpenActionModuleName) {
        const focusedHandler = actionModulesHandlers.find((handler) => handler.name === focusedOpenActionModuleName);
        if (focusedHandler) {
          const ActionModuleHandler = focusedHandler.handler;

          setHandler(new ActionModuleHandler(environment, profileId, pubId, authenticatedProfileId));
        }
      }
    }
  }, [environment, publication]);

  useEffect(() => {
    const fetchData = async () => {
      const [address] = await walletClient!.getAddresses();
      const data = await handler!.fetchActionModuleData({
        connectedWalletAddress: address!,
        authenticatedProfileId: authenticatedProfileId!
      });
      setActionModuleStateData(data);
      setIsLoading(false);
    }

    if (handler && walletClient && authenticatedProfileId) {
      setIsLoading(true);
      fetchData();
    }
  }, [handler, walletClient, authenticatedProfileId]);

  return {
    isActionModuleSupported: !!handler,
    actionModuleHandler: handler,
    isLoading,
    actionModuleStateData,
  };
}