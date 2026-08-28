import { create } from 'zustand';
import {
  MOCK_DUE_ITEMS,
  MOCK_WALLET_BALANCE,
  MOCK_WALLET_TRANSACTIONS,
  type DueItem,
  type WalletTransaction,
} from '../components/resident/marketplace-mock';

/**
 * Frontend-only stand-in for the eventual `wallets`/`wallet_transactions`/
 * `dues` tables and their Supabase queries. Lifted out of `wallet.tsx` into
 * a store (rather than screen-local `useState`) so the "See all" full
 * history screen shows the same transactions the Wallet screen just added,
 * instead of two screens drifting out of sync with their own copies of the
 * same mock data.
 */
interface WalletMockState {
  balance: number;
  transactions: WalletTransaction[];
  dueItems: DueItem[];
  adjustBalance: (delta: number) => void;
  addTransaction: (tx: Omit<WalletTransaction, 'id' | 'date'>) => void;
  markDueItemsPaid: (ids: string[]) => void;
}

export const useWalletMockStore = create<WalletMockState>((set) => ({
  balance: MOCK_WALLET_BALANCE,
  transactions: MOCK_WALLET_TRANSACTIONS,
  dueItems: MOCK_DUE_ITEMS,
  adjustBalance: (delta) => set((s) => ({ balance: s.balance + delta })),
  addTransaction: (tx) =>
    set((s) => ({
      transactions: [
        { ...tx, id: `t${Date.now()}`, date: new Date().toISOString() },
        ...s.transactions,
      ],
    })),
  markDueItemsPaid: (ids) =>
    set((s) => ({
      dueItems: s.dueItems.map((item) => (ids.includes(item.id) ? { ...item, status: 'paid' } : item)),
    })),
}));
