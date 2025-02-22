import { polygon, anvil } from 'wagmi/chains'
import ANVIL_FORGE_ADDRESS from "./anvil/forge"
import ANVIL_TOKEN_ADDRESS from "./anvil/token"

const isProd = import.meta.env.MODE === 'production'

export const SUPPORTED_CHAINS = isProd ? [polygon] : [polygon, anvil]
export const DEFAULT_CHAIN = polygon

export const getContractAddress = (addresses: Record<number, string>) => {
  // In production, only return Polygon address
  if (isProd) {
    return {
      [polygon.id]: addresses[polygon.id]
    }
  }
  // In development, return all addresses
  return addresses
}

// Contract addresses
export const TOKEN_ADDRESSES = getContractAddress({
  [polygon.id]: '0x805688F28CaF4A6D4ADC48748c5d24B33F1e0Ed0',
  [anvil.id]: ANVIL_TOKEN_ADDRESS,
})

export const FORGE_ADDRESSES = getContractAddress({
  [polygon.id]: '0x021652cd346a59beDB1A30ed7391ECFfDFA31366',
  [anvil.id]: ANVIL_FORGE_ADDRESS,
})
