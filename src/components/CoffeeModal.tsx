import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { useCoffee, type TipAsset, type UseCoffeeConfig } from '../hooks/useCoffee.js';
import { PROTOCOL_FEE_RECIPIENT } from '../config.js';

interface Props extends UseCoffeeConfig {
  ownerAddress: string;
  label?: string;
}

const PRESET_AMOUNTS: Record<TipAsset, number[]> = {
  SOL: [0.1, 0.5, 1, 2],
  USDT: [1, 5, 10, 25],
};

const CLUSTER_LABEL: Record<UseCoffeeConfig['cluster'], { text: string; color: string }> = {
  localnet:       { text: 'localnet', color: 'bg-purple-100 text-purple-700' },
  devnet:         { text: 'devnet',   color: 'bg-blue-100   text-blue-700'   },
  'mainnet-beta': { text: 'mainnet',  color: 'bg-green-100  text-green-700'  },
};

type ModalState = 'form' | 'loading' | 'success' | 'error';

const SOLSCAN_BASE: Record<UseCoffeeConfig['cluster'], string> = {
  'mainnet-beta': 'https://solscan.io/tx',
  devnet:         'https://solscan.io/tx',
  localnet:       'https://solscan.io/tx',
};

const solscanUrl = (sig: string, cluster: UseCoffeeConfig['cluster']) => {
  const base = `${SOLSCAN_BASE[cluster]}/${sig}`;
  if (cluster === 'devnet') return `${base}?cluster=devnet`;
  if (cluster === 'localnet') return `${base}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`;
  return base;
};

export const CoffeeButton = ({ ownerAddress: initialOwner, cluster, usdtMint, label = 'Buy me a Coffee' }: Props) => {
  const { sendDonation, mintMockUsdt, connected, usdtAvailable } = useCoffee({ cluster, usdtMint });

  const [asset, setAsset] = useState<TipAsset>('SOL');
  const [amount, setAmount] = useState<number>(0.1);
  const [state, setState] = useState<ModalState>('form');
  const [txSignature, setTxSignature] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [open, setOpen] = useState(false);
  
  const [receiverWallet, setReceiverWallet] = useState(initialOwner);
  const [taxWallet, setTaxWallet] = useState(PROTOCOL_FEE_RECIPIENT);
  const [isMinting, setIsMinting] = useState(false);

  const isTestnet = cluster === 'devnet' || cluster === 'localnet';

  useEffect(() => {
    setReceiverWallet(initialOwner);
    setTaxWallet(PROTOCOL_FEE_RECIPIENT);
  }, [initialOwner, open]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setState('form');
      setErrorMsg('');
      setTxSignature('');
      setIsMinting(false);
    }
  };

  const handleAssetChange = (next: TipAsset) => {
    setAsset(next);
    setAmount(PRESET_AMOUNTS[next][0]);
  };

  const handleSend = async () => {
    setState('loading');
    try {
      // Updated to include taxWallet override for testing
      const { signature } = await sendDonation(receiverWallet, amount, asset, taxWallet);
      setTxSignature(signature);
      setState('success');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Transaction failed');
      setState('error');
    }
  };

  const handleMintMock = async () => {
    if (cluster === 'mainnet-beta') {
      setErrorMsg('Minting mock USDT is not available on mainnet.');
      setState('error');
      return;
    }
    setIsMinting(true);
    try {
      await mintMockUsdt();
      setIsMinting(false);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Minting failed');
      setState('error');
      setIsMinting(false);
    }
  };

  const badge = CLUSTER_LABEL[cluster];

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 active:scale-95 text-black font-bold rounded-lg transition-all text-sm select-none">
        ☕ {label}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl w-[22rem] max-w-[calc(100vw-2rem)] p-6 border border-gray-100 focus:outline-none max-h-[90vh] overflow-y-auto">

          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <Dialog.Title className="text-lg font-bold text-gray-900">Support the Creator</Dialog.Title>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.color}`}>
                  {badge.text}
                </span>
              </div>
              <Dialog.Description className="text-xs text-gray-400 mt-0.5">
                Direct Solana blockchain transfers.
              </Dialog.Description>
            </div>
            <Dialog.Close className="text-gray-300 hover:text-gray-600 transition-colors text-xl leading-none mt-0.5">
              ✕
            </Dialog.Close>
          </div>

          {(state === 'form' || state === 'loading') && (
            <div className="space-y-4">
              {!connected && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Connect wallet to continue.
                </div>
              )}

              {isTestnet && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Testnet Configuration</p>
                  
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Receiver Wallet</label>
                    <input 
                      className="w-full text-[11px] p-1.5 border rounded bg-white font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                      value={receiverWallet}
                      onChange={(e) => setReceiverWallet(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Tax Wallet (Fee)</label>
                    <input 
                      className="w-full text-[11px] p-1.5 border rounded bg-white font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                      value={taxWallet}
                      onChange={(e) => setTaxWallet(e.target.value)}
                    />
                  </div>

                  {asset === 'USDT' && (
                    <button
                      onClick={handleMintMock}
                      disabled={isMinting || !connected}
                      className="w-full py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {isMinting ? 'Minting Mock USDT...' : 'Mint 100 Mock USDT'}
                    </button>
                  )}
                </div>
              )}

              {!isTestnet && asset === 'USDT' && (
                <div className="text-[10px] text-red-600 bg-red-50 p-2 rounded border border-red-100">
                  Mock minting unavailable on Mainnet. Ensure you have actual USDT.
                </div>
              )}

              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                <button
                  onClick={() => handleAssetChange('SOL')}
                  disabled={state === 'loading'}
                  className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                    asset === 'SOL' ? 'bg-white shadow text-gray-900' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  SOL
                </button>
                <button
                  onClick={() => handleAssetChange('USDT')}
                  disabled={state === 'loading' || (!usdtAvailable && !isTestnet)}
                  className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                    asset === 'USDT' ? 'bg-white shadow text-gray-900'
                    : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  USDT
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {PRESET_AMOUNTS[asset].map((p) => (
                  <button
                    key={p}
                    onClick={() => setAmount(p)}
                    disabled={state === 'loading'}
                    className={`py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      amount === p
                        ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    disabled={state === 'loading'}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-14 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">{asset}</span>
                </div>
              </div>

              <button
                onClick={handleSend}
                disabled={state === 'loading' || !connected || amount <= 0}
                className="w-full py-3 rounded-xl font-bold text-sm bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 transition-all"
              >
                {state === 'loading' ? 'Processing...' : `Send ${amount} ${asset}`}
              </button>

              <p className="text-center text-[10px] text-gray-400">
                Fee: 1% to {taxWallet.slice(0, 4)}...{taxWallet.slice(-4)}
              </p>
            </div>
          )}

          {state === 'success' && (
            <div className="text-center space-y-4 py-4">
              <div className="text-4xl">✅</div>
              <p className="font-bold text-gray-900">Transfer Complete</p>
              <a
                href={solscanUrl(txSignature, cluster)}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-blue-600 hover:underline"
              >
                View Transaction ↗
              </a>
              <button
                onClick={() => handleOpenChange(false)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-100"
              >
                Close
              </button>
            </div>
          )}

          {state === 'error' && (
            <div className="text-center space-y-4 py-4">
              <div className="text-4xl">❌</div>
              <p className="font-bold text-gray-900">Error Occurred</p>
              <p className="text-xs text-red-500 break-words px-2">{errorMsg}</p>
              <button
                onClick={() => setState('form')}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-900 text-white"
              >
                Try Again
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};