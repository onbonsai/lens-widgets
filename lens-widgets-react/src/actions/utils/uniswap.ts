import { Token, CurrencyAmount, TradeType, Percent } from "@uniswap/sdk-core"
import { AlphaRouter, SwapType } from "@uniswap/smart-order-router"
import { ethers } from "ethers"

export async function getUniV3Route(
  chainId,
  rpcUrl: string,
  inputTokenAddress: string,
  outputTokenAddress: string,
  amountIn: string,
  recipient: string
): Promise<any> {
  // Create a provider (using ethers.js)
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl)

  // Create instances of the input and output tokens
  const inputToken = new Token(chainId, inputTokenAddress, 18) // Assuming 18 decimals, replace accordingly
  const outputToken = new Token(chainId, outputTokenAddress, 18) // Assuming 18 decimals, replace accordingly

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
