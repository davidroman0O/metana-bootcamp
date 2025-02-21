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
  [polygon.id]: '0xCc98b21E56b4062d4C45F3D2254688447E827b74',
  [anvil.id]: ANVIL_TOKEN_ADDRESS,
})

export const FORGE_ADDRESSES = getContractAddress({
  [polygon.id]: '0x90b4153CC409588dcdDC0c0D1CA873829a75e444',
  [anvil.id]: ANVIL_FORGE_ADDRESS,
})
