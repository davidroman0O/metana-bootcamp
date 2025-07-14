// Formatting utilities for the admin dashboard

export const formatCHIPS = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  
  // Convert from wei to CHIPS (18 decimals)
  const chips = num / 1e18;
  
  if (chips >= 1e6) {
    return `${(chips / 1e6).toFixed(2)}M`;
  } else if (chips >= 1e3) {
    return `${(chips / 1e3).toFixed(2)}K`;
  } else if (chips >= 1) {
    return chips.toFixed(2);
  } else if (chips >= 0.01) {
    return chips.toFixed(4);
  } else {
    return chips.toExponential(2);
  }
};

export const formatETH = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  
  // Convert from wei to ETH (18 decimals)
  const eth = num / 1e18;
  
  if (eth >= 1) {
    return eth.toFixed(4);
  } else if (eth >= 0.001) {
    return eth.toFixed(6);
  } else {
    return eth.toExponential(2);
  }
};

export const formatUSD = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatPercentage = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0%';
  
  return `${num.toFixed(2)}%`;
};

export const formatNumber = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  
  return new Intl.NumberFormat('en-US').format(num);
};

export const formatTimestamp = (timestamp: string | number): string => {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
  if (isNaN(ts)) return 'N/A';
  
  const date = new Date(ts * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}y ago`;
};

export const formatAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};