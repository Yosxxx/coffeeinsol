import {
  Transaction,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getMint,
} from '@solana/spl-token';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { type Cluster, DEFAULT_USDT_MINT, PROTOCOL_FEE_RECIPIENT } from '../config.js';

export type TipAsset = 'SOL' | 'USDT';
export type DonationStatus = 'idle' | 'loading' | 'success' | 'error';
export interface DonationResult { signature: string }

export interface UseCoffeeConfig {
  cluster: Cluster;
  /**
   * SPL token mint to use as USDT. Required on devnet/localnet since there
   * is no canonical USDT mint on those clusters. Ignored on mainnet-beta
   * unless you explicitly want to override.
   */
  usdtMint?: string;
}

const FEE_RECIPIENT = new PublicKey(PROTOCOL_FEE_RECIPIENT);

const buildSolTx = (sender: PublicKey, owner: PublicKey, lamports: bigint): Transaction => {
  const fee = lamports / 100n;
  const ownerAmount = lamports - fee;
  return new Transaction().add(
    SystemProgram.transfer({ fromPubkey: sender, toPubkey: owner, lamports: Number(ownerAmount) }),
    SystemProgram.transfer({ fromPubkey: sender, toPubkey: FEE_RECIPIENT, lamports: Number(fee) }),
  );
};

const buildUsdtTx = async (
  connection: ReturnType<typeof useConnection>['connection'],
  sender: PublicKey,
  owner: PublicKey,
  amount: number,
  usdtMintAddress: string,
): Promise<Transaction> => {
  const USDT_MINT = new PublicKey(usdtMintAddress);
  const mintInfo = await getMint(connection, USDT_MINT);
  const { decimals } = mintInfo;

  const total = BigInt(Math.floor(amount * 10 ** decimals));
  const fee = total / 100n;
  const ownerAmount = total - fee;

  const senderAta = await getAssociatedTokenAddress(USDT_MINT, sender);
  const ownerAta = await getAssociatedTokenAddress(USDT_MINT, owner);
  const feeAta = await getAssociatedTokenAddress(USDT_MINT, FEE_RECIPIENT);

  const tx = new Transaction();
  const [ownerAtaInfo, feeAtaInfo] = await Promise.all([
    connection.getAccountInfo(ownerAta),
    connection.getAccountInfo(feeAta),
  ]);

  if (!ownerAtaInfo)
    tx.add(createAssociatedTokenAccountInstruction(sender, ownerAta, owner, USDT_MINT));
  if (!feeAtaInfo)
    tx.add(createAssociatedTokenAccountInstruction(sender, feeAta, FEE_RECIPIENT, USDT_MINT));

  tx.add(
    createTransferCheckedInstruction(senderAta, USDT_MINT, ownerAta, sender, ownerAmount, decimals),
    createTransferCheckedInstruction(senderAta, USDT_MINT, feeAta, sender, fee, decimals),
  );
  return tx;
};

export const useCoffee = (config: UseCoffeeConfig) => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  // Resolve which mint to use: explicit override wins, then cluster default
  const resolvedUsdtMint = config.usdtMint ?? DEFAULT_USDT_MINT[config.cluster];
  const usdtAvailable = !!resolvedUsdtMint;

  const sendDonation = async (
    ownerAddress: string,
    amount: number,
    asset: TipAsset,
  ): Promise<DonationResult> => {
    if (!publicKey) throw new Error('Wallet not connected');
    if (amount <= 0) throw new Error('Amount must be greater than 0');
    if (asset === 'USDT' && !resolvedUsdtMint)
      throw new Error(`No USDT mint configured for cluster "${config.cluster}". Pass a usdtMint prop.`);

    const owner = new PublicKey(ownerAddress);
    const tx =
      asset === 'SOL'
        ? buildSolTx(publicKey, owner, BigInt(Math.floor(amount * LAMPORTS_PER_SOL)))
        : await buildUsdtTx(connection, publicKey, owner, amount, resolvedUsdtMint!);

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    const signature = await sendTransaction(tx, connection);
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
    return { signature };
  };

  return { sendDonation, connected, publicKey, usdtAvailable, cluster: config.cluster };
};
