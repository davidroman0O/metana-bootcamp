import {
  getBalance,
  getNonce,
  getGasPrice,
  estimateGas,
  sendRawTransaction
} from '../lib/wallet';
import { SEPOLIA_CONFIG } from '../config';

global.fetch = jest.fn();

// Helper to setup fetch mock with success response
function mockFetchSuccess(result: any) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ jsonrpc: '2.0', id: 1, result }),
  });
}

// Helper to setup fetch mock with error response
function mockFetchError(errorMessage: string, errorCode: number = -32000) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ 
      jsonrpc: '2.0', 
      id: 1, 
      error: { code: errorCode, message: errorMessage } 
    }),
  });
}

// Helper to setup fetch that throws network error
function mockFetchNetworkError(errorMessage: string) {
  (global.fetch as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));
}

describe('Wallet RPC Functions', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  const TEST_ADDRESS = '0x89181cdb372d47d6ac4fd762522c4288962abc29';
  
  it('should correctly fetch balance', async () => {
    // Mock a balance response of 1 ETH (in wei)
    mockFetchSuccess('0xde0b6b3a7640000'); // 1 ETH = 10^18 wei

    const balance = await getBalance(TEST_ADDRESS);
    
    // Verify fetch was called with the right parameters
    expect(global.fetch).toHaveBeenCalledWith(
      SEPOLIA_CONFIG.rpcUrl,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('eth_getBalance'),
      })
    );
    
    // Check the parsed result
    expect(balance).toBe(BigInt('1000000000000000000')); // 1 ETH in wei
  });
  
  it('should correctly fetch nonce', async () => {
    // Mock a nonce response
    mockFetchSuccess('0x5'); // Nonce 5
    
    const nonce = await getNonce(TEST_ADDRESS);
    
    // Verify fetch was called with the right parameters
    expect(global.fetch).toHaveBeenCalledWith(
      SEPOLIA_CONFIG.rpcUrl,
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('eth_getTransactionCount'),
      })
    );
    
    // Check the parsed result
    expect(nonce).toBe(5);
  });
  
  it('should correctly fetch gas price', async () => {
    // Mock a gas price response of 20 Gwei
    mockFetchSuccess('0x4a817c800'); // 20 Gwei in wei (20 * 10^9)
    
    const gasPrice = await getGasPrice();
    
    // Verify fetch was called with the right parameters
    expect(global.fetch).toHaveBeenCalledWith(
      SEPOLIA_CONFIG.rpcUrl,
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('eth_gasPrice'),
      })
    );
    
    // Check the parsed result
    expect(gasPrice).toBe(BigInt('20000000000')); // 20 Gwei in wei
  });
  
  it('should correctly estimate gas', async () => {
    // Mock a gas estimate response
    mockFetchSuccess('0x5208'); // 21000 gas
    
    const estimatedGas = await estimateGas({
      from: TEST_ADDRESS,
      to: TEST_ADDRESS,
      value: '0x' + BigInt(10000000000000).toString(16), // 0.00001 ETH
      data: '0x',
    });
    
    // Verify fetch was called with the right parameters
    expect(global.fetch).toHaveBeenCalledWith(
      SEPOLIA_CONFIG.rpcUrl,
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('eth_estimateGas'),
      })
    );
    
    // Check the parsed result
    expect(estimatedGas).toBe(BigInt(21000));
  });
  
  it('should correctly send raw transaction', async () => {
    // Mock a transaction hash response
    const mockTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    mockFetchSuccess(mockTxHash);
    
    const txHash = await sendRawTransaction('0x1234567890abcdef'); // Dummy serialized tx
    
    // Verify fetch was called with the right parameters
    expect(global.fetch).toHaveBeenCalledWith(
      SEPOLIA_CONFIG.rpcUrl,
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('eth_sendRawTransaction'),
      })
    );
    
    // Check the result is the transaction hash
    expect(txHash).toBe(mockTxHash);
  });
  
  it('should handle RPC errors correctly', async () => {
    // Mock an RPC error response
    mockFetchError('Insufficient funds for gas * price + value');
    
    // Expect the function to throw an error
    await expect(sendRawTransaction('0x1234567890abcdef')).rejects.toThrow(
      'RPC request failed: Insufficient funds for gas * price + value'
    );
  });
  
  it('should handle network errors correctly', async () => {
    // Mock a network error
    mockFetchNetworkError('Network connection error');
    
    // Expect the function to throw an error
    await expect(getBalance(TEST_ADDRESS)).rejects.toThrow(
      'RPC request failed: Network connection error'
    );
  });
  
  it('should handle invalid address inputs', async () => {
    // Test with an invalid address format
    await expect(getBalance('not-an-address')).rejects.toThrow(
      'Invalid Ethereum address format'
    );
    
    // Verify fetch was NOT called
    expect(global.fetch).not.toHaveBeenCalled();
  });
}); 