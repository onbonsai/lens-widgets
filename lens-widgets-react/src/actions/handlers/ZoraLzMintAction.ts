import { z } from "zod";
import { Abi, createPublicClient, http, zeroAddress } from 'viem';
import {
  Chain,
  polygon,
  polygonMumbai,
  base,
  baseGoerli,
  zora,
  zoraTestnet,
  goerli,
  mainnet,
  optimism
} from 'viem/chains';
import { Environment, encodeData } from "@lens-protocol/client";
import HandlerBase, { ActionModuleConfig, DefaultFetchActionModuleDataParams } from "./HandlerBase";
import ZoraLzMintActionAbi from "./../abis/ZoraLzMintAction.json";
import IERC1155Abi from "./../abis/IERC1155.json";
import ZoraLzCreatorAbi from "./../abis/ZoraLzCreator.json";
import { fetchTokenWithMetadata } from "./../utils/zora";

const ZORA_LZ_MINT_TESTNET_ADDRESS = "0x55991a42e8FEb9DFAC9Fcc172f133D36AC2282A2";
const ZORA_LZ_MINT_MAINNET_ADDRESS = "0x5f377e3e9BE56Ff72588323Df6a4ecd5cEedc56A";

const MODULE_INIT_DATA_SCHEMA = z.object({
  remoteContract: z.string().optional().nullable(),
  remoteTokenId: z.string().optional().nullable(),
  remoteLzChainId: z.number().optional().nullable(),
  salePriceEthWei: z.string().optional().nullable(),
  maxTokensPerAddress: z.number().optional().nullable(),
  estimatedNativeFee: z.string(),
  uri: z.string(),
});

const MODULE_ACT_DATA_SCHEMA = z.object({
  currency: z.string(),
  quantity: z.number(),
  quotedAmountIn: z.string(),
  uniFee: z.number().optional().nullable(),
});

type ModuleInitDataSchema = z.infer<typeof MODULE_INIT_DATA_SCHEMA>;
type ModuleActDataSchema = z.infer<typeof MODULE_ACT_DATA_SCHEMA>;
export type RemoteMintData = {
  zoraCreator: string; // the default ERC1155 contract on the remote chain
  remoteContract1155: string; // the existing ERC1155 contract
  remoteTokenId: BigInt; // the existing ERC1155 tokenId
  salePrice: BigInt; // the cost in wei on the remote chain
  maxTokensPerAddress: BigInt; // the max tokens mintable per address
  lzChainId: number; // the remote lz chain id
  uri: string; // the nft uri
};
export type QuoteData = {
  quotedAmountIn: BigInt,
  nativeForDst: BigInt,
  estimatedNativeFee: BigInt
};

// supported lz chain ids
const LZ_CHAIN_ID_TO_CHAIN = {
  10109: polygonMumbai,
  10160: baseGoerli,
  109: polygon,
  184: base,
  10195: zoraTestnet,
  195: zora,
  10121: goerli,
  101: mainnet,
  111: optimism
};

const DEFAULT_QTY = 1;
const DEFAULT_UNI_FEE = 500;

enum RelayAction {
  CREATE_TOKEN,
  MINT_TOKEN
}

class ZoraLzMintAction extends HandlerBase {
  public remoteMintData?: RemoteMintData;
  public remoteChain?: Chain;
  public remoteTokenAddress?: string;
  public remoteTokenId?: string;
  public zoraURL?: string;
  public remoteBalanceOf?: BigInt;
  public hasMinted?: boolean;

  constructor(
    _environment: Environment,
    profileId: string,
    publicationId: string,
    authenticatedProfileId?: string,
    rpcURLs?: { [chainId: number]: string }
  ) {
    super(_environment, profileId, publicationId, authenticatedProfileId, rpcURLs);
    this.mintableNFT = true; // render mint nft card
  }

  async fetchActionModuleData(data: DefaultFetchActionModuleDataParams): Promise<any> {
    this.authenticatedProfileId = data.authenticatedProfileId; // in case it wasn't set before
    // @ts-expect-error: type
    this.metadata = await this.lensClient.modules.fetchMetadata({ implementation: this.address });

    try {
      // fetch data from the contract
      const _remoteMintData = await this.publicClient.readContract({
        address: this.address! as `0x${string}`,
        abi: ZoraLzMintActionAbi as unknown as Abi,
        functionName: "remoteMints",
        args: [this.profileId, this.pubId],
      }) as RemoteMintData;
      const remoteMintData = {
        zoraCreator: _remoteMintData[0],
        remoteContract1155: _remoteMintData[1],
        remoteTokenId: _remoteMintData[2],
        salePrice: _remoteMintData[3],
        maxTokensPerAddress: _remoteMintData[4],
        lzChainId: _remoteMintData[5],
        uri: _remoteMintData[6]
      };

      // fetch data on remote chain zora creator
      const remoteChain = LZ_CHAIN_ID_TO_CHAIN[remoteMintData.lzChainId];
      const remoteRpcUrl = this.rpcURLs && this.rpcURLs[remoteChain.id]
        ? this.rpcURLs[this.chain.id]
        : remoteChain.rpcUrls.default.http[0];
      const remoteClient = createPublicClient({ chain: remoteChain, transport: http(remoteRpcUrl) });

      let remoteContract;
      let remoteTokenId;
      if (remoteMintData.remoteContract1155 == zeroAddress) {
        const [_remoteTokenId, madContract1155] = await Promise.all([
          remoteClient.readContract({
            address: remoteMintData.zoraCreator as `0x${string}`,
            abi: ZoraLzCreatorAbi as unknown as Abi,
            functionName: "publicationTokens",
            args: [this.profileId, this.pubId],
          }),
          remoteClient.readContract({
            address: remoteMintData.zoraCreator as `0x${string}`,
            abi: ZoraLzCreatorAbi as unknown as Abi,
            functionName: "madContract1155"
          }),
        ]);
        remoteContract = madContract1155 as string;
        remoteTokenId = _remoteTokenId;
      } else {
        remoteContract = remoteMintData.remoteContract1155;
        remoteTokenId = remoteMintData.remoteTokenId;
        // get the latest sale price
        const salesConfig = await remoteClient.readContract({
          address: remoteMintData.zoraCreator as `0x${string}`,
          abi: ZoraLzCreatorAbi as unknown as Abi,
          functionName: "getSalesConfig",
          args: [remoteContract, remoteTokenId],
        }) as unknown[];
        const latestSalePrice = salesConfig[3] as BigInt;
        if (remoteMintData.salePrice < latestSalePrice) {
          console.log(`sales price changed for: ${remoteContract}/${remoteTokenId}; no longer mintable from here`);
          this.panicked = true;
          return; // not setting the mintable nft
        }
      }

      const remoteBalanceOf = await remoteClient.readContract({
        address: remoteContract as `0x${string}`,
        abi: IERC1155Abi as unknown as Abi,
        functionName: "balanceOf",
        args: [data.connectedWalletAddress, remoteTokenId],
      }) as BigInt;

      this.remoteMintData = remoteMintData;
      this.remoteChain = remoteChain;
      this.remoteBalanceOf = remoteBalanceOf;
      this.hasMinted = BigInt(this.remoteBalanceOf.toString()) > BigInt(0);
      this.remoteTokenAddress = remoteContract as string;
      this.remoteTokenId = (remoteTokenId as BigInt).toString();
      const metadata = await fetchTokenWithMetadata(
        this.remoteTokenAddress,
        this.remoteTokenId,
        remoteChain.id
      );
      this.mintableNFTMetadata = { ...metadata, chainId: remoteChain.id };

      this._setURLs(this.remoteChain!, this.remoteTokenAddress, this.remoteTokenId);

      return { remoteMintData, remoteTokenId, remoteBalanceOf };
    } catch (error) {
      console.log(error);
    }
  }

  getActionModuleConfig(): ActionModuleConfig {
    return {
      displayName: `Cross-chain Zora Mint`,
      description: 'Mint this Zora NFT on another chain',
      address: {
        mumbai: ZORA_LZ_MINT_TESTNET_ADDRESS,
        polygon: ZORA_LZ_MINT_MAINNET_ADDRESS
      },
      metadata: this.metadata
    }
  }

  getModuleInitDataSchema() {
    return MODULE_INIT_DATA_SCHEMA;
  }

  encodeModuleInitData(data: ModuleInitDataSchema): string {
    const remoteContract = data.remoteContract || zeroAddress;
    const remoteTokenId = data.remoteTokenId || '0';
    const remoteLzChainId = data.remoteLzChainId || 0; // use default remote chain
    const salePriceEthWei = data.salePriceEthWei || 0; // free mint
    const maxTokensPerAddress = data.maxTokensPerAddress || 0; // unlimited mints

    return encodeData(
      JSON.parse(this.metadata!.metadata.initializeCalldataABI),
      [
        remoteContract,
        remoteTokenId,
        data.estimatedNativeFee,
        salePriceEthWei.toString(),
        maxTokensPerAddress.toString(),
        remoteLzChainId.toString(), data.uri
      ]
    );
  }

  getModuleActDataSchema() {
    return MODULE_ACT_DATA_SCHEMA;
  }

  encodeModuleActData(data: ModuleActDataSchema): string {
    const quantity = data.quantity || DEFAULT_QTY;
    const uniFee = data.uniFee || DEFAULT_UNI_FEE;

    return encodeData(
      JSON.parse(this.metadata!.metadata.processCalldataABI),
      [data.currency, quantity.toString(), data.quotedAmountIn, uniFee.toString()]
    );
  }

  getActButtonLabel(): string {
    if (this.hasMinted) return "Minted";
    return "Mint"
  }

  // simulates the module's non-view quote function, which returns the quote to pay for the relay + destination
  // sale price, when swapping `currency` for WMATIC
  // NOTE: this swap is not necessary when the `currency` is wmatic
  async quoteAmountForPaymentSwap(
    from: string,
    currency: string,
    estimatedNativeFee: BigInt,
    routerFee: number
  ): Promise<BigInt> {
    if (currency === this.wmatic) return estimatedNativeFee;

    const { result } = await this.publicClient.simulateContract({
      address: this.address,
      abi: ZoraLzMintActionAbi,
      functionName: 'quoteAmountForPaymentSwap',
      args: [currency, estimatedNativeFee, routerFee],
      account: from as `0x${string}`,
    });

    return BigInt(result as string);
  }

  // NOTE: `currency` should be whitelisted by lens protocol
  async getQuotesForCreatorPublication(
    from: string,
    _currency?: string,
    _quantity?: number
  ): Promise<QuoteData> {
    // get the full sales price on the destination chain
    const currency = _currency || this.weth;
    const quantity = _quantity || DEFAULT_QTY;
    const nativeForDst = await this.publicClient.readContract({
      address: this.address! as `0x${string}`,
      abi: ZoraLzMintActionAbi as unknown as Abi,
      functionName: "getDestinationSalePrice",
      args: [this.profileId, this.pubId, quantity],
    }) as BigInt;
    const estimateFeesInput = this.getEstimateFeesInput(RelayAction.MINT_TOKEN, from, BigInt(quantity), nativeForDst);
    const estimatedFees = await this.publicClient.readContract({
      address: this.address! as `0x${string}`,
      abi: ZoraLzMintActionAbi as unknown as Abi,
      functionName: "estimateLzFees",
      args: [estimateFeesInput],
    }) as [BigInt, BigInt];

    const quotedAmountIn = await this.quoteAmountForPaymentSwap(
      from,
      currency,
      estimatedFees[0],
      DEFAULT_UNI_FEE
    );

    return { quotedAmountIn, nativeForDst, estimatedNativeFee: estimatedFees[0] };
  }

  getEstimateFeesInput(
    action: RelayAction,
    profileOwner: string,
    quantity: BigInt,
    nativeForDst: BigInt,
    uri?: string,
    salePrice?: BigInt,
    maxTokens?: BigInt,
  ): any {
    return {
      lzChainId: BigInt(this.remoteMintData!.lzChainId),
      relayAction: BigInt(action),
      profileId: BigInt(this.profileId),
      pubId: BigInt(this.pubId),
      profileOwner,
      uri: uri || "",
      salePrice: salePrice || 0,
      maxTokens: maxTokens || 0,
      quantity,
      nativeForDst,
      remoteContract: this.remoteMintData!.remoteContract1155,
      remoteTokenId: this.remoteMintData!.remoteTokenId
    };
  }

  _setURLs(chain: Chain, tokenAddress: string, tokenId: string): void {
    const isMainnet = chain === base || chain === zora;
    const zoraURL = isMainnet
      ? `https://zora.co/collect/${chain === base ? 'base' : 'zora'}:${tokenAddress}/${tokenId}`
      : undefined; // testnet not really supported on their site
    const network = isMainnet
      ? (chain === base ? 'base' : 'zora')
      : (chain === baseGoerli ? 'base-goerli' : 'zora-testnet');
    const _openseaBase = `https://${!isMainnet ? 'testnets.' : ''}opensea.io`;
    const openseaURL = `${_openseaBase}/assets/${network}/${tokenAddress}/${tokenId}`;

    this.mintableNFTURLs = { opensea: openseaURL, zora: zoraURL };
  }
}

export {
  ZORA_LZ_MINT_TESTNET_ADDRESS,
  ZORA_LZ_MINT_MAINNET_ADDRESS,
  ZoraLzMintAction
};