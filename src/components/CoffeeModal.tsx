import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { useCoffee } from '../hooks/useCoffee'; // Remove .js extension in TS files

interface Props {
  ownerAddress: string;
}

export const CoffeeModal = ({ ownerAddress }: Props) => {
  const [amount, setAmount] = useState(0.1);
  const [tokenType, setTokenType] = useState<'SOL' | 'USDT'>('SOL');
  const [isLoading, setIsLoading] = useState(false);
  
  // FIX: Destructure the correct function name from the hook
  const { sendDonation } = useCoffee();

  const handleSend = async () => {
    if (amount <= 0) return alert("Enter a valid amount");
    
    setIsLoading(true);
    try {
      // FIX: Pass the required 'type' argument
      await sendDonation(ownerAddress, amount, tokenType);
      alert(`${tokenType} Donation sent successfully!`);
    } catch (e) {
      console.error(e);
      alert("Transaction failed. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-md font-bold transition-colors">
        Buy me a Coffee
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-xl w-80 shadow-2xl border border-gray-100">
          <Dialog.Title className="text-xl font-bold text-gray-900">Support Creator</Dialog.Title>
          <Dialog.Description className="text-sm text-gray-500 mt-1">
            Send a tip directly to the creator's wallet.
          </Dialog.Description>

          <div className="mt-6 space-y-4">
            {/* Token Selector */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              {(['SOL', 'USDT'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setTokenType(type)}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                    tokenType === type ? 'bg-white shadow-sm text-black' : 'text-gray-500'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Amount Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase">Amount</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-2.5 text-gray-400 font-medium">
                  {tokenType}
                </span>
              </div>
            </div>

            {/* Action Button */}
            <button 
              onClick={handleSend}
              disabled={isLoading}
              className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
                isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-gray-800 active:scale-95'
              }`}
            >
              {isLoading ? 'Processing...' : `Send ${amount} ${tokenType}`}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};