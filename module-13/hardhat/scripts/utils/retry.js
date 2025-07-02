async function withRetry(asyncFn, options = {}) {
  const {
    maxRetries = 5,
    initialDelay = 1000,
    onRetry = () => {}
  } = options;
  
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      return await asyncFn();
    } catch (error) {
      attempts++;
      if (attempts >= maxRetries) {
        console.error(`❌ Function failed after ${maxRetries} attempts.`, error.message);
        throw error;
      }
      const delay = initialDelay * (2 ** (attempts - 1));
      onRetry(attempts, error);
      console.log(`   ...retrying in ${delay / 1000}s`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

module.exports = { withRetry };
