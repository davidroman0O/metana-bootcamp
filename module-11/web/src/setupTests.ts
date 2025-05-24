import crypto from 'crypto';

// Polyfill for crypto.getRandomValues 
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      const buffer = crypto.randomBytes(arr.length);
      arr.set(buffer);
      return arr;
    }
  },
  writable: true
}); 