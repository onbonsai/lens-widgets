import { z } from "zod"
import { parseUnits, zeroAddress, Abi, TransactionReceipt } from "viem"
import { Environment, encodeData } from "@lens-protocol/client"
import HandlerBase, { ActionModuleConfig, DefaultFetchActionModuleDataParams } from "./HandlerBase"
import RewardsSwapAbi from "../abis/RewardsSwap.json"
import IERC20Abi from "../abis/IERC20.json"
import { MADFI_SUBGRAPH_URL, MADFI_SUBGRPAH_URL_TESTNET } from "../utils/madfi"
import { getUniV3Route } from "../utils/uniswap"

const REWARDS_SWAP_TESTNET_ADDRESS = "0xFaa69aB20B6eA0b4aC819ae2B80FeF2863aeaFdf"
const REWARDS_SWAP_MAINNET_ADDRESS = "0xFaa69aB20B6eA0b4aC819ae2B80FeF2863aeaFdf"

// NOTE: for now only handle these tokens as the inputs
const INPUT_TOKENS = {
  MAINNET: {
    WMATIC: {
      address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      name: "Wrapped Matic",
      decimals: 18,
    },
    USDC: { address: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", name: "USDC", decimals: 6 },
    USDT: { address: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", name: "Tether", decimals: 6 },
    DAI: { address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", name: "DAI", decimals: 18 },
    WETH: {
      address: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
      name: "Wrapped ETH",
      decimals: 18,
    },
  },
  TESTNET: {
    WMATIC: {
      address: "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",
      name: "Wrapped Matic",
      decimals: 18,
    },
    USDC: { address: "0x0FA8781a83E46826621b3BC094Ea2A0212e71B23", name: "USDC", decimals: 6 },
    USDT: { address: "0x0FA8781a83E46826621b3BC094Ea2A0212e71B23", name: "Tether", decimals: 6 },
    DAI: { address: "0x0FA8781a83E46826621b3BC094Ea2A0212e71B23", name: "DAI", decimals: 18 },
    WETH: {
      address: "0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa",
      name: "Wrapped ETH",
      decimals: 18,
    },
  },
}

const MODULE_INIT_DATA_SCHEMA = z.object({
  isDirectPromotion: z.boolean().default(false),
  sharedRewardPercent: z.number(),
  recipient: z.string(),
  rewardsPoolId: z.number(),
  sharedClientPercent: z.number(),
  token: z.string(),
})

const MODULE_ACT_DATA_SCHEMA = z.object({
  path: z.array(z.string()),
  amountIn: z.string(),
  amountOutMinimum: z.string(),
  clientAddress: z.string(),
})

type ModuleInitDataSchema = z.infer<typeof MODULE_INIT_DATA_SCHEMA>
type ModuleActDataSchema = z.infer<typeof MODULE_ACT_DATA_SCHEMA>

class RewardsSwapAction extends HandlerBase {
  private swapAddress: `0x${string}`
  private inputTokens: any
  private subgraphUrl: string

  constructor(
    _environment: Environment,
    profileId: string,
    publicationId: string,
    authenticatedProfileId?: string,
    rpcURLs?: { [chainId: number]: string }
  ) {
    super(_environment, profileId, publicationId, authenticatedProfileId, rpcURLs)

    if (this.isPolygon) {
      this.swapAddress = REWARDS_SWAP_MAINNET_ADDRESS
      this.inputTokens = INPUT_TOKENS.MAINNET
      this.subgraphUrl = MADFI_SUBGRAPH_URL
    } else {
      this.swapAddress = REWARDS_SWAP_TESTNET_ADDRESS
      this.inputTokens = INPUT_TOKENS.TESTNET
      this.subgraphUrl = MADFI_SUBGRPAH_URL_TESTNET
    }

    this.mintableNFT = true
  }

  async fetchActionModuleData(data: DefaultFetchActionModuleDataParams): Promise<any> {
    this.authenticatedProfileId = data.authenticatedProfileId // in case it wasn't set before
    // @ts-expect-error: type
    this.metadata = await this.lensClient.modules.fetchMetadata({ implementation: this.address })

    return {
      userTokenBalances: await this.getActiveRewardsPools(),
      rewardsPools: await this.getUserTokenBalances(data.connectedWalletAddress),
    }
  }

  async getActiveRewardsPools(): Promise<any> {
    const query = `{
      rewardPools(where:{
        rewardsRemaining_gt:0
      }) {
        rewardsPoolId
        token
        rewardsAmount
        percentReward
        cap
        collectionId
        rewardsPaid
        rewardsRemaining
      }
    }`
    const response = await fetch(this.subgraphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch active rewards pools: ${response.statusText}`)
    }

    const { data } = await response.json()
    return data.rewardPools
  }

  async getUserTokenBalances(address: string): Promise<any> {
    const [wMatic, usdc, usdt, weth] = await Promise.all([
      this.publicClient.readContract({
        address: this.inputTokens.WMATIC.address,
        abi: IERC20Abi as unknown as Abi,
        functionName: "balanceOf",
        args: [address],
      }),
      this.publicClient.readContract({
        address: this.inputTokens.USDC.address,
        abi: IERC20Abi as unknown as Abi,
        functionName: "balanceOf",
        args: [address],
      }),
      this.publicClient.readContract({
        address: this.inputTokens.USDT.address,
        abi: IERC20Abi as unknown as Abi,
        functionName: "balanceOf",
        args: [address],
      }),
      this.publicClient.readContract({
        address: this.inputTokens.WETH.address,
        abi: IERC20Abi as unknown as Abi,
        functionName: "balanceOf",
        args: [address],
      }),
    ])
    return [
      { ...this.inputTokens.WMATIC, balance: wMatic },
      { ...this.inputTokens.USDC, balance: usdc },
      { ...this.inputTokens.USDT, balance: usdt },
      { ...this.inputTokens.WETH, balance: weth },
    ]
  }

  async getRoute(
    recipient: string,
    inputToken: string,
    outputToken: string,
    amountIn: string
  ): Promise<any> {
    if (!this.rpcURLs?.[this.chain.id]) throw new Error("No RPC URL for chain")
    return await getUniV3Route(
      this.chain,
      this.rpcURLs[this.chain.id],
      inputToken,
      outputToken,
      amountIn,
      recipient
    )
  }

  getActionModuleConfig(): ActionModuleConfig {
    return {
      displayName: "Rewards Swap",
      description: "Earn rewards and swap tokens right in the feed",
      address: {
        mumbai: REWARDS_SWAP_TESTNET_ADDRESS,
        polygon: REWARDS_SWAP_MAINNET_ADDRESS,
      },
      metadata: this.metadata,
    }
  }

  getModuleInitDataSchema() {
    return MODULE_INIT_DATA_SCHEMA
  }

  encodeModuleInitData(data: ModuleInitDataSchema): string {
    if (
      data.sharedRewardPercent > 100_00 ||
      data.sharedClientPercent > 100_00 ||
      data.sharedRewardPercent < 0 ||
      data.sharedClientPercent < 0
    ) {
      throw new Error("shared amounts must be between 0 and 100 in basis points (10,000)")
    }

    if (!data.isDirectPromotion && data.rewardsPoolId === 0) {
      throw new Error("rewardsPoolId must be provided when not direct promotion")
    }

    return encodeData(JSON.parse(this.metadata!.metadata.initializeCalldataABI), [
      data.isDirectPromotion,
      (data.sharedRewardPercent || 0).toString(),
      data.recipient,
      data.rewardsPoolId.toString(),
      (data.sharedClientPercent || 0).toString(),
      data.token,
    ])
  }

  getModuleActDataSchema() {
    return MODULE_ACT_DATA_SCHEMA
  }

  encodeModuleActData(data: ModuleActDataSchema): string {
    return encodeData(JSON.parse(this.metadata!.metadata.processCalldataABI), [
      data.path,
      data.amountIn,
      data.amountOutMinimum,
      data.clientAddress,
    ])
  }

  getActButtonLabel(): string {
    return "Swap"
  }
}

export { REWARDS_SWAP_TESTNET_ADDRESS, REWARDS_SWAP_MAINNET_ADDRESS, RewardsSwapAction }
