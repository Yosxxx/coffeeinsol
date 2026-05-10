import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { useCoffee, type TipAsset, type UseCoffeeConfig } from '../hooks/useCoffee.js';

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
  devnet:         'https://solscan.io/tx',   // append ?cluster=devnet
  localnet:       'https://solscan.io/tx',   // append ?cluster=custom
};

const solscanUrl = (sig: string, cluster: UseCoffeeConfig['cluster']) => {
  const base = `${SOLSCAN_BASE[cluster]}/${sig}`;
  if (cluster === 'devnet') return `${base}?cluster=devnet`;
  if (cluster === 'localnet') return `${base}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`;
  return base;
};

export const CoffeeButton = ({ ownerAddress, cluster, usdtMint, label = 'Buy me a Coffee' }: Props) => {
  const { sendDonation, connected, usdtAvailable } = useCoffee({ cluster, usdtMint });

  const [asset, setAsset] = useState<TipAsset>('SOL');
  const [amount, setAmount] = useState<number>(0.1);
  const [state, setState] = useState<ModalState>('form');
  const [txSignature, setTxSignature] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [open, setOpen] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setState('form');
      setErrorMsg('');
      setTxSignature('');
    }
  };

  const handleAssetChange = (next: TipAsset) => {
    setAsset(next);
    setAmount(PRESET_AMOUNTS[next][0]);
  };

  const handleSend = async () => {
    setState('loading');
    try {
      const { signature } = await sendDonation(ownerAddress, amount, asset);
      setTxSignature(signature);
      setState('success');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Transaction failed');
      setState('error');
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
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl w-[22rem] max-w-[calc(100vw-2rem)] p-6 border border-gray-100 focus:outline-none">

          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <Dialog.Title className="text-lg font-bold text-gray-900">Support the Creator</Dialog.Title>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.color}`}>
                  {badge.text}
                </span>
              </div>
              <Dialog.Description className="text-xs text-gray-400 mt-0.5">
                Tips go directly to their wallet on Solana.
              </Dialog.Description>
            </div>
            <Dialog.Close className="text-gray-300 hover:text-gray-600 transition-colors text-xl leading-none mt-0.5">
              ✕
            </Dialog.Close>
          </div>

          {/* Form / loading state */}
          {(state === 'form' || state === 'loading') && (
            <div className="space-y-4">
              {!connected && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Connect your wallet using the wallet button on this page, then come back here.
                </div>
              )}

              {/* Asset toggle */}
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
                  disabled={state === 'loading' || !usdtAvailable}
                  title={!usdtAvailable ? `No USDT mint configured for ${cluster}` : undefined}
                  className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                    asset === 'USDT' ? 'bg-white shadow text-gray-900'
                    : !usdtAvailable ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  USDT{!usdtAvailable && ' ✕'}
                </button>
              </div>

              {/* USDT unavailable hint */}
              {!usdtAvailable && (
                <p className="text-[11px] text-gray-400 -mt-2">
                  Pass a <code className="bg-gray-100 px-1 rounded">usdtMint</code> prop to enable USDT on {cluster}.
                </p>
              )}

              {/* Preset amounts */}
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

              {/* Custom amount input */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">
                  Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    disabled={state === 'loading'}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-14 text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all disabled:opacity-50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold pointer-events-none">
                    {asset}
                  </span>
                </div>
              </div>

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={state === 'loading' || !connected || amount <= 0}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-gray-900 text-white hover:bg-gray-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {state === 'loading' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing…
                  </span>
                ) : (
                  `Send ${amount} ${asset}`
                )}
              </button>

              <p className="text-center text-xs text-gray-300">
                99% to creator · 1% protocol fee
              </p>
            </div>
          )}

          {/* Success state */}
          {state === 'success' && (
            <div className="text-center space-y-4">
              <div className="text-4xl">☕</div>
              <div>
                <p className="font-bold text-gray-900">Thank you!</p>
                <p className="text-sm text-gray-500 mt-1">Your tip was sent successfully.</p>
              </div>
              <a
                href={solscanUrl(txSignature, cluster)}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-yellow-600 hover:underline truncate"
              >
                View on Solscan ↗
              </a>
              <button
                onClick={() => handleOpenChange(false)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {/* Error state */}
          {state === 'error' && (
            <div className="text-center space-y-4">
              <div className="text-4xl">⚠️</div>
              <div>
                <p className="font-bold text-gray-900">Something went wrong</p>
                <p className="text-xs text-gray-400 mt-1 break-words">{errorMsg}</p>
              </div>
              <button
                onClick={() => setState('form')}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 transition-colors"
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
