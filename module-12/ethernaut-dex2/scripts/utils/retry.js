/**
 * Utility function to retry async operations with delay
 * 
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms between retries (default: 1000)
 * @param {Function} options.onRetry - Callback on retry
 * @returns {Promise} Result of the async function
 */
async function withRetry(fn, options = {}) {
  const maxRetries = options.maxRetries || 3;
  const initialDelay = options.initialDelay || 1000;
  const onRetry = options.onRetry || (() => {});
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Only log retry attempts after the first attempt
        console.log(`Retry attempt ${attempt}/${maxRetries}...`);
        onRetry(attempt, lastError);
      }
      
      // Execute the function
      return await fn();
      
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        // If we've reached the max retries, throw the error
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(1.5, attempt);
      console.log(`Operation failed. Retrying in ${delay}ms...`);
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

module.exports = {
  withRetry
}; 