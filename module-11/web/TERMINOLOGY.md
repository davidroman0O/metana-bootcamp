Initially, I built a simple wallet using just a private key. During a code review, my instructor pointed out that what I actually needed was an "HD wallet." I thought that meant a "word-based wallet" (mnemonic), but it turns out that's only part of the story. So I did some digging to understand the core concepts.

### 1. **HD Wallets (Hierarchical Deterministic Wallets) – BIP-32**

**What it is**: A wallet that can deterministically generate a tree of keypairs from a single seed using paths like `m/44'/0'/0'/0/0`.
Each key can be derived without storing them all, and you can derive public keys from extended public keys (xpub).

**Use case**: Back up once (the seed) → restore everything.

**Specs / Resources**:

* [BIP-32 spec on Bitcoin Wiki](https://en.bitcoin.it/wiki/BIP_0032)
* [Ledger Academy: HD wallets](https://www.ledger.com/academy/crypto/what-are-hierarchical-deterministic-hd-wallets)

### 2. **Mnemonic Phrases – BIP-39**

**What it is**: A human-readable way to represent a binary seed using 12/18/24 words. These words are mapped to entropy + checksum.
It’s how most wallets let you “back up” your wallet.

**Mnemonic → Seed → Master Private Key → All your keys**

**Use case**: Easy paper backup (write down 12 or 24 words). Common in Ledger, MetaMask, Trezor, etc.

**Specs / Tools**:

* [BIP-39 spec on GitHub](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
* [Ledger Academy: BIP-39 mnemonic](https://www.ledger.com/academy/bip-39-the-low-key-guardian-of-your-crypto-freedom)
* [Ian Coleman’s BIP39 generator and explorer](https://iancoleman.io/bip39/)

### 3. **Standard Derivation Paths – BIP-44**

**What it is**: A standard path format for HD wallets to manage multiple coins and accounts, like:

```
m / purpose' / coin_type' / account' / change / address_index
e.g. m/44'/0'/0'/0/0 (BTC)
```

**Use case**: Allows wallets to work consistently across software/hardware.

**Specs**:

* [BIP-44 spec](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)

### 4. **Combining All Three**

**Mnemonic (BIP-39)** → **Seed** → **HD Wallet Tree (BIP-32)** → **Paths (BIP-44)**

Most wallets (Ledger, Trezor, MetaMask, etc.) use this full stack:

* BIP-39 for recovery phrase
* BIP-32 for HD key derivation
* BIP-44 to organize keys by account and coin

**General explainer**:

* [Vault12: BIP-32, 39, 44](https://vault12.com/learn/crypto-security-basics/what-is-bip39/)
* [Medium deep dive with examples](https://yemmyharry.medium.com/bip-32-39-and-44-hierarchical-deterministic-wallets-and-mnemonic-phrases-e6938ed1a4de)
