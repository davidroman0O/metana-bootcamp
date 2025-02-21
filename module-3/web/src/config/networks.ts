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
  [polygon.id]: '0x40f72956B507123Fe624394e1cF3Dc96D4727f4E',
  [anvil.id]: ANVIL_TOKEN_ADDRESS,
})

export const FORGE_ADDRESSES = getContractAddress({
  [polygon.id]: '0x4B4CBEb364D26CC4aE6048BAB79A5C9961e4EC72',
  [anvil.id]: ANVIL_FORGE_ADDRESS,
})
