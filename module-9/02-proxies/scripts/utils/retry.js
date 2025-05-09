/**
 * Retry utility for handling connection timeouts
 * Retries a function multiple times with increasing delay
 */

/**
 * Executes a function with retry logic
 * @param {Function} fn - The async function to execute
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 2000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {Function} options.onRetry - Called before each retry (receives retry count and error)
 * @returns {Promise<any>} - Result of the function
 */
async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 2000,
    maxDelay = 10000,
    onRetry = null,
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        console.error(`\n❌ All ${maxRetries} retry attempts failed!`);
        throw error;
      }
      
      // Calculate delay with exponential backoff (2^attempt * initialDelay)
      const delay = Math.min(2 ** attempt * initialDelay, maxDelay);
      
      // Log the retry
      console.warn(`\n⚠️ Attempt ${attempt + 1}/${maxRetries} failed: ${error.message}`);
      console.warn(`   Retrying in ${delay / 1000} seconds...`);
      
      // Call onRetry callback if provided
      if (onRetry && typeof onRetry === 'function') {
        onRetry(attempt + 1, error);
      }
      
      // Wait before the next retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

module.exports = {
  withRetry
}; 