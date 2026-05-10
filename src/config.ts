export type Cluster = 'mainnet-beta' | 'devnet' | 'localnet';

// Canonical USDT SPL mint on Solana mainnet (Tether)
export const MAINNET_USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

// Replace with your actual protocol fee wallet before publishing
export const PROTOCOL_FEE_RECIPIENT = '4eZb1ZfuRY5mSdJB8VMnv2aDsZXxJn7Vvc56AZ7nKU4K';

// Devnet and localnet have no canonical USDT.
// Pass `usdtMint` on <CoffeeButton> to enable USDT on those clusters.
export const DEVNET_USDT_MINT = 'J2zhZB5iBsAymRHfdHC91EtPz9HnHny9N2EFF31hB2LE';

export const DEFAULT_USDT_MINT: Partial<Record<Cluster, string>> = {
  'mainnet-beta': MAINNET_USDT_MINT,
  devnet: DEVNET_USDT_MINT,
};
