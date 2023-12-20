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
  rpcURLs?: { [chainId: number]: string },
  focusedOpenActionModuleName?: string
) => {
  const [handler, setHandler] = useState<HandlerBase | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionModuleStateData, setActionModuleStateData] = useState({});

  useEffect(() => {
    if (environment && publication?.id && publication?.openActionModules?.length) {
      const [profileId, pubId] = publication.id.split("-");

      // @ts-expect-error we check `openActionModules` array length in `fetchActionModuleHandlers`
      const actionModulesHandlers = fetchActionModuleHandlers(environment, publication.openActionModules);

      if (!actionModulesHandlers.length) return;

      // always take the first supported open action, unless a focus name is specified
      if (actionModulesHandlers.length == 1 || !focusedOpenActionModuleName) {
        const ActionModuleHandler = actionModulesHandlers[0].handler;

        setHandler(new ActionModuleHandler(environment, profileId, pubId, authenticatedProfileId, rpcURLs));
      } else if (focusedOpenActionModuleName) {
        const focusedHandler = actionModulesHandlers.find((handler) => handler.name === focusedOpenActionModuleName);
        if (focusedHandler) {
          const ActionModuleHandler = focusedHandler.handler;

          setHandler(new ActionModuleHandler(environment, profileId, pubId, authenticatedProfileId, rpcURLs));
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