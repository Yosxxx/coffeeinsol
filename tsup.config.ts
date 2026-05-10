import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', '@solana/web3.js', '@solana/wallet-adapter-react'],
  injectStyle: true, // Injects Tailwind styles into the JS bundle
});