import { 
  Transaction, 
  SystemProgram, 
  PublicKey, 
  LAMPORTS_PER_SOL, 
  Connection 
} from '@solana/web3.js';
import { 
  createTransferCheckedInstruction, 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  getMint 
} from '@solana/spl-token';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

const USDT_MINT = new PublicKey("Es9vMFrzaDCSTMdWx8S59m1pB4fSw4nK6jN29z9Z6Qcq");
const FEE_RECIPIENT = new PublicKey("YOUR_FEE_WALLET_ADDRESS");

export const useCoffee = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const transferSol = async (owner: PublicKey, amount: number) => {
    const total = BigInt(Math.floor(amount * LAMPORTS_PER_SOL));
    const fee = total / 100n;
    const remains = total - fee;

    return new Transaction().add(
      SystemProgram.transfer({ fromPubkey: publicKey!, toPubkey: owner, lamports: Number(remains) }),
      SystemProgram.transfer({ fromPubkey: publicKey!, toPubkey: FEE_RECIPIENT, lamports: Number(fee) })
    );
  };

  const transferUsdt = async (owner: PublicKey, amount: number) => {
    const mintInfo = await getMint(connection, USDT_MINT);
    const decimals = mintInfo.decimals;
    const total = BigInt(Math.floor(amount * Math.pow(10, decimals)));
    const fee = total / 100n;
    const remains = total - fee;

    const ownerAta = await getAssociatedTokenAddress(USDT_MINT, owner);
    const feeAta = await getAssociatedTokenAddress(USDT_MINT, FEE_RECIPIENT);
    const senderAta = await getAssociatedTokenAddress(USDT_MINT, publicKey!);

    const tx = new Transaction();
    const info = await connection.getAccountInfo(ownerAta);
    if (!info) {
      tx.add(createAssociatedTokenAccountInstruction(publicKey!, ownerAta, owner, USDT_MINT));
    }

    tx.add(
      createTransferCheckedInstruction(senderAta, USDT_MINT, ownerAta, publicKey!, remains, decimals),
      createTransferCheckedInstruction(senderAta, USDT_MINT, feeAta, publicKey!, fee, decimals)
    );
    return tx;
  };

  const sendDonation = async (ownerAddress: string, amount: number, type: 'SOL' | 'USDT') => {
    if (!publicKey) throw new Error("Wallet not connected");
    const owner = new PublicKey(ownerAddress);
    const tx = type === 'SOL' ? await transferSol(owner, amount) : await transferUsdt(owner, amount);
    
    const sig = await sendTransaction(tx, connection);
    await connection.confirmTransaction(sig, 'confirmed');
    return sig;
  };

  return { sendDonation };
};