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
  [polygon.id]: '0x78d1bEE160a5B00aCB4CfFD8F1dFB4FD00A09287',
  [anvil.id]: ANVIL_TOKEN_ADDRESS,
})

export const FORGE_ADDRESSES = getContractAddress({
  [polygon.id]: '0x50B4701eC8E0795f1BA5701e5ACC6172FbAcE04B',
  [anvil.id]: ANVIL_FORGE_ADDRESS,
})
