import { formatUnits } from 'viem';

// Common ERC20 token decimals
export const TOKEN_DECIMALS: Record<string, number> = {
  'USDT': 6,
  'USDC': 6,
  'WETH': 18,
  'DAI': 18,
  'BNB': 18,
  'SHIB': 18,
  'UNI': 18,
  'LINK': 18,
  'MATIC': 18,
  'AAVE': 18,
  'MKR': 18,
  'CRO': 8,
  'BUSD': 18,
  'TUSD': 18,
  // Add more tokens as needed
};

// Format token amounts considering their decimals
export function formatTokenAmount(amount: bigint, tokenSymbol: string): number {
  const decimals = TOKEN_DECIMALS[tokenSymbol] || 18;
  return parseFloat(formatUnits(amount, decimals));
}

// Format large numbers with K, M, B suffixes
export function formatLargeNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + 'B';
  } else if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + 'M';
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(2) + 'K';
  } else if (num === 0) {
    return '0';
  } else if (num < 0.0001) {
    return num.toExponential(4);
  } else {
    return num.toFixed(Math.min(4, getSignificantDecimalPlaces(num)));
  }
}

// Get the number of significant decimal places based on the magnitude of the number
function getSignificantDecimalPlaces(num: number): number {
  if (num === 0) return 0;
  
  // Find the first significant digit
  let magnitude = num;
  while (magnitude < 1) {
    magnitude *= 10;
  }
  
  // Return a precision that shows at least 4 significant digits
  return Math.max(0, 4 - Math.floor(Math.log10(magnitude)) - 1);
}

// Custom function to determine unit based on amount
export function determineUnit(amount: number): string {
  if (amount < 0.000001) {
    return 'wei';
  } else if (amount < 0.001) {
    return 'gwei';
  } else {
    return 'eth';
  }
}