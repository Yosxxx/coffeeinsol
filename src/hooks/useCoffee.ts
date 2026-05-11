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
  createMintToInstruction,
} from '@solana/spl-token';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { type Cluster, DEFAULT_USDT_MINT, PROTOCOL_FEE_RECIPIENT, MOCK_MINT_AMOUNT } from '../config.js';

export type TipAsset = 'SOL' | 'USDT';
export type DonationStatus = 'idle' | 'loading' | 'success' | 'error';
export interface DonationResult { signature: string }

export interface UseCoffeeConfig {
  cluster: Cluster;
  usdtMint?: string;
}

const DEFAULT_FEE_RECIPIENT = new PublicKey(PROTOCOL_FEE_RECIPIENT);

/**
 * Builds a SOL transfer transaction with a split fee.
 */
const buildSolTx = (
  sender: PublicKey, 
  owner: PublicKey, 
  lamports: bigint, 
  feeRecipient: PublicKey
): Transaction => {
  const fee = lamports / 100n;
  const ownerAmount = lamports - fee;
  return new Transaction().add(
    SystemProgram.transfer({ fromPubkey: sender, toPubkey: owner, lamports: Number(ownerAmount) }),
    SystemProgram.transfer({ fromPubkey: sender, toPubkey: feeRecipient, lamports: Number(fee) }),
  );
};

/**
 * Builds a USDT transfer transaction with a split fee.
 */
const buildUsdtTx = async (
  connection: ReturnType<typeof useConnection>['connection'],
  sender: PublicKey,
  owner: PublicKey,
  amount: number,
  usdtMintAddress: string,
  feeRecipient: PublicKey
): Promise<Transaction> => {
  const USDT_MINT = new PublicKey(usdtMintAddress);
  const mintInfo = await getMint(connection, USDT_MINT);
  const { decimals } = mintInfo;

  const total = BigInt(Math.floor(amount * 10 ** decimals));
  const fee = total / 100n;
  const ownerAmount = total - fee;

  const senderAta = await getAssociatedTokenAddress(USDT_MINT, sender);
  const ownerAta = await getAssociatedTokenAddress(USDT_MINT, owner);
  const feeAta = await getAssociatedTokenAddress(USDT_MINT, feeRecipient);

  const tx = new Transaction();
  const [ownerAtaInfo, feeAtaInfo] = await Promise.all([
    connection.getAccountInfo(ownerAta),
    connection.getAccountInfo(feeAta),
  ]);

  if (!ownerAtaInfo)
    tx.add(createAssociatedTokenAccountInstruction(sender, ownerAta, owner, USDT_MINT));
  if (!feeAtaInfo)
    tx.add(createAssociatedTokenAccountInstruction(sender, feeAta, feeRecipient, USDT_MINT));

  tx.add(
    createTransferCheckedInstruction(senderAta, USDT_MINT, ownerAta, sender, ownerAmount, decimals),
    createTransferCheckedInstruction(senderAta, USDT_MINT, feeAta, sender, fee, decimals),
  );
  return tx;
};

export const useCoffee = (config: UseCoffeeConfig) => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  const resolvedUsdtMint = config.usdtMint ?? DEFAULT_USDT_MINT[config.cluster];
  const usdtAvailable = !!resolvedUsdtMint;

  /**
   * Sends a donation. Supports an optional customFeeRecipient for testnet debugging.
   */
  const sendDonation = async (
    ownerAddress: string, 
    amount: number, 
    asset: TipAsset,
    customFeeRecipient?: string
  ): Promise<DonationResult> => {
    if (!publicKey) throw new Error('Wallet not connected');
    if (amount <= 0) throw new Error('Amount must be greater than 0');
    if (asset === 'USDT' && !resolvedUsdtMint) throw new Error('USDT mint not configured');

    const owner = new PublicKey(ownerAddress);
    const feeRecipient = customFeeRecipient 
      ? new PublicKey(customFeeRecipient) 
      : DEFAULT_FEE_RECIPIENT;

    const tx = asset === 'SOL'
      ? buildSolTx(
          publicKey, 
          owner, 
          BigInt(Math.floor(amount * LAMPORTS_PER_SOL)), 
          feeRecipient
        )
      : await buildUsdtTx(
          connection, 
          publicKey, 
          owner, 
          amount, 
          resolvedUsdtMint!, 
          feeRecipient
        );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer = publicKey;

    const signature = await sendTransaction(tx, connection);
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
    return { signature };
  };

  const mintMockUsdt = async () => {
    if (config.cluster === 'mainnet-beta') throw new Error('Minting unavailable on Mainnet');
    if (!publicKey) throw new Error('Wallet not connected');
    if (!resolvedUsdtMint) throw new Error('No Mock Mint Address provided');

    const mintPubkey = new PublicKey(resolvedUsdtMint);
    const userAta = await getAssociatedTokenAddress(mintPubkey, publicKey);
    const tx = new Transaction();

    const accountInfo = await connection.getAccountInfo(userAta);
    if (!accountInfo) {
      tx.add(createAssociatedTokenAccountInstruction(publicKey, userAta, publicKey, mintPubkey));
    }

    const mintInfo = await getMint(connection, mintPubkey);
    tx.add(
      createMintToInstruction(
        mintPubkey,
        userAta,
        publicKey,
        BigInt(MOCK_MINT_AMOUNT * 10 ** mintInfo.decimals)
      )
    );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer = publicKey;

    const signature = await sendTransaction(tx, connection);
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
    return signature;
  };

  return { sendDonation, mintMockUsdt, connected, publicKey, usdtAvailable, cluster: config.cluster };
};