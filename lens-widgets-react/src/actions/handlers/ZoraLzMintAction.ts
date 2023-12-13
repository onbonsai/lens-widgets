import { z } from "zod";
import { Abi, createPublicClient, http, encodeFunctionData, formatEther } from 'viem';
import { polygon, polygonMumbai, base, baseGoerli, Chain, zora, zoraTestnet } from 'viem/chains'
import { Environment, production } from "@lens-protocol/client";
import HandlerBase, { ActionModuleConfig, DefaultFetchActionModuleDataParams } from "./HandlerBase";
import { encodeAbi } from "../utils/viem";
import ZoraLzMintActionAbi from "./../abis/ZoraLzMintAction.json";
import IERC1155Abi from "./../abis/IERC1155.json";
import ZoraLzCreatorAbi from "./../abis/ZoraLzCreator.json";
import { MADFI_API_BASE_URL, DEFAULT_MADFI_API_KEY } from "./../utils/madfi";
import { fetchTokenWithMetadata } from "./../utils/zora";

const ZORA_LZ_MINT_TESTNET_ADDRESS = "0x8915Ccd5ACb14334FD744bA8C538A662e3D4dcf2";
const ZORA_LZ_MINT_MAINNET_ADDRESS = "";

const MODULE_INIT_DATA_SCHEMA = z.object({
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
  zoraCreator: string; // the ERC1155 contract on the remote chain
  lzChainId: number; // the remote lz chain id
  salePrice: BigInt; // the cost in wei on the remote chain
  maxTokensPerAddress: BigInt; // the max tokens mintable per address
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
  public apiKey?: string; // MadFi API key

  constructor(_environment: Environment, profileId: string, publicationId: string, authenticatedProfileId?: string) {
    super(_environment, profileId, publicationId, authenticatedProfileId);
    this.apiKey = DEFAULT_MADFI_API_KEY; // will be undefined unless the root app sets in env
    this.mintableNFT = true; // render mint nft card
  }

  async fetchActionModuleData(data: DefaultFetchActionModuleDataParams): Promise<any> {
    this.authenticatedProfileId = data.authenticatedProfileId; // in case it wasn't set before

    // fetch data from the contract
    const _remoteMintData = await this.publicClient.readContract({
      address: this.address! as `0x${string}`,
      abi: ZoraLzMintActionAbi as unknown as Abi,
      functionName: "remoteMints",
      args: [this.profileId, this.publicationId],
    }) as RemoteMintData;
    const remoteMintData = {
      zoraCreator: _remoteMintData[0],
      lzChainId: _remoteMintData[1],
      salePrice: _remoteMintData[2],
      maxTokensPerAddress: _remoteMintData[3],
      uri: _remoteMintData[4],
    };

    // fetch data on remote chain zora creator
    const remoteChain = LZ_CHAIN_ID_TO_CHAIN[remoteMintData.lzChainId];
    const remoteRpcUrl = remoteChain.rpcUrls.default.http[0]; // TODO: set/accept remoteRpcUrls
    const remoteClient = createPublicClient({ chain: remoteChain, transport: http(remoteRpcUrl) });
    const [remoteTokenId, madContract1155] = await Promise.all([
      remoteClient.readContract({
        address: remoteMintData.zoraCreator as `0x${string}`,
        abi: ZoraLzCreatorAbi as unknown as Abi,
        functionName: "publicationTokens",
        args: [this.profileId, this.publicationId],
      }),
      remoteClient.readContract({
        address: remoteMintData.zoraCreator as `0x${string}`,
        abi: ZoraLzCreatorAbi as unknown as Abi,
        functionName: "madContract1155"
      }),
    ]);
    const remoteBalanceOf = await remoteClient.readContract({
      address: madContract1155 as `0x${string}`,
      abi: IERC1155Abi as unknown as Abi,
      functionName: "balanceOf",
      args: [data.connectedWalletAddress, remoteTokenId],
    }) as BigInt;

    this.remoteMintData = remoteMintData;
    this.remoteChain = remoteChain;
    this.remoteBalanceOf = remoteBalanceOf;
    this.hasMinted = BigInt(this.remoteBalanceOf.toString()) > BigInt(0);
    this.remoteTokenAddress = madContract1155 as string;
    this.remoteTokenId = (remoteTokenId as BigInt).toString();
    const metadata = await fetchTokenWithMetadata(
      this.remoteTokenAddress,
      this.remoteTokenId,
      remoteChain.id
    );
    this.mintableNFTMetadata = { ...metadata, chainId: remoteChain.id };

    this._setURLs(this.remoteChain!, this.remoteTokenAddress, this.remoteTokenId);

    return { remoteMintData, remoteTokenId, remoteBalanceOf };
  }

  getActionModuleConfig(): ActionModuleConfig {
    return {
      metadata: {
        name: "ZoraLzMintAction",
        displayName: `Crosschain Zora Mint`,
        description: 'Mint this crosschain Zora NFT'
      },
      address: {
        mumbai: ZORA_LZ_MINT_TESTNET_ADDRESS,
        polygon: ZORA_LZ_MINT_MAINNET_ADDRESS
      },
      actButtonStateLabels: {
        pre: "Mint",
        post: "Minted"
      },
      abi: ZoraLzMintActionAbi as unknown as Abi
    }
  }

  getModuleInitDataSchema() {
    return MODULE_INIT_DATA_SCHEMA;
  }

  encodeModuleInitData(data: ModuleInitDataSchema): string {
    const remoteLzChainId = data.remoteLzChainId || 0; // use default remote chain
    const salePriceEthWei = data.salePriceEthWei || 0; // free mint
    const maxTokensPerAddress = data.maxTokensPerAddress || 0; // unlimited mints

    return encodeAbi(
      ['uint16', 'uint96', 'uint64', 'uint256', 'string'],
      [remoteLzChainId, salePriceEthWei, maxTokensPerAddress, data.estimatedNativeFee, data.uri]
    );
  }

  getModuleActDataSchema() {
    return MODULE_ACT_DATA_SCHEMA;
  }

  encodeModuleActData(data: ModuleActDataSchema): string {
    const quantity = data.quantity || DEFAULT_QTY;
    const uniFee = data.uniFee || DEFAULT_UNI_FEE;

    return encodeAbi(
      ['address', 'uint256', 'uint256', 'uint24'],
      [data.currency, quantity, data.quotedAmountIn, uniFee]
    );
  }

  getActButtonLabel(): string {
    if (this.hasMinted) return "Minted";

    return "Mint"
  }

  // set the api key for use with the madfi api (get swap quote)
  setApiKey(key: string): void {
    this.apiKey = key;
  }

  // call the madfi api to simulate the non-view funtion, which returns the quote to pay for the relay + destination
  // sale price, when swapping `currency` for WMATIC
  // NOTE: this will throw an error if the api key was not set via `this.setApiKey`
  // NOTE: this swap is not necessary when the `currency` is wmatic
  async quoteAmountForPaymentSwap(
    from: string,
    currency: string,
    estimatedNativeFee: BigInt,
    routerFee: number
  ): Promise<BigInt> {
    const apiKey = this.apiKey || DEFAULT_MADFI_API_KEY;
    if (!apiKey) throw new Error('Missing MadFi api key');

    const inputData = encodeFunctionData({
      abi: ZoraLzMintActionAbi,
      functionName: 'quoteAmountForPaymentSwap',
      args: [currency, estimatedNativeFee, routerFee]
    });

    const payload = {
      save: false,
      save_if_fails: false,
      simulation_type: "quick",
      network_id: this.chain.id.toString(),
      from,
      to: this.address,
      input: inputData,
      gas: 450000,
      gas_price: 0,
      value: 0
    };

    const response = await fetch(`${MADFI_API_BASE_URL}/simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    const { output } = await response.json();

    return BigInt(output);
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
      args: [this.profileId, this.publicationId, quantity],
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
      pubId: BigInt(this.publicationId),
      profileOwner,
      uri: uri || "",
      salePrice: salePrice || 0,
      maxTokens: maxTokens || 0,
      quantity,
      nativeForDst,
      // TODO: remove these after next deploymnet
      paymentCurrency: this.weth,
      fee: DEFAULT_UNI_FEE,
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