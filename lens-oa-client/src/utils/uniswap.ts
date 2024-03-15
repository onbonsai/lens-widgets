import { Token, CurrencyAmount, TradeType, Percent } from "@uniswap/sdk-core"
import { AlphaRouter, SwapType } from "@uniswap/smart-order-router"
import { providers, Contract } from "ethers"

const erc20Abi = ["function decimals() view returns (uint8)"]

export async function getUniV3Route(
  chainId,
  rpcUrl: string,
  inputTokenAddress: string,
  outputTokenAddress: string,
  amountIn: string,
  recipient: string
): Promise<any> {
  // Create a provider (using ethers.js)
  const provider = new providers.JsonRpcProvider(rpcUrl)

  const inputTokenContract = new Contract(inputTokenAddress, erc20Abi, provider)
  const outputTokenContract = new Contract(outputTokenAddress, erc20Abi, provider)

  // Create instances of the input and output tokens
  const inputToken = new Token(chainId, inputTokenAddress, await inputTokenContract.decimals())
  const outputToken = new Token(chainId, outputTokenAddress, await outputTokenContract.decimals())

  // Create an instance of AlphaRouter
  const router = new AlphaRouter({ chainId, provider })

  // Define the amount in
  const amountInCurrencyAmount = CurrencyAmount.fromRawAmount(inputToken, amountIn)

  // Find the best route
  const route = await router.route(amountInCurrencyAmount, outputToken, TradeType.EXACT_INPUT, {
    recipient,
    slippageTolerance: new Percent(50, 10_000), // Customize your slippage tolerance
    deadline: Math.floor(Date.now() / 1000 + 1800), // Transaction deadline
    type: SwapType.SWAP_ROUTER_02,
  })

  if (!route || !route.methodParameters) {
    throw new Error("No route found")
  }

  // The route object contains the best route and the method parameters for executing the trade
  return route
}

export const getPairExists = (token1: string, token2: string, rpcUrl: string) => {
  const provider = new providers.JsonRpcProvider(rpcUrl)

  // TODO: we can call `getPool` on the uniswap factory contract to check if the pair exists
  return false
}
