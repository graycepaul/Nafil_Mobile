/**
 * Placeholder data for the marketplace/wallet/dues screens.
 *
 * These features are being designed UI-first before the backend exists.
 * There's no `listings`, `wallet_transactions`, or `dues` table yet. Every
 * screen that reads this owns its own local state seeded from these
 * constants, so approving the UI doesn't require any schema to already
 * exist. Swap this file out for real Supabase queries once the backend
 * lands; the shapes below are written to look like what those rows will be.
 */

export type ListingCategory = 'Furniture' | 'Electronics' | 'Home Services' | 'Food' | 'Fashion' | 'Other';

export const LISTING_CATEGORIES: ListingCategory[] = [
  'Furniture',
  'Electronics',
  'Home Services',
  'Food',
  'Fashion',
  'Other',
];

export const CATEGORY_ICON: Record<ListingCategory, string> = {
  Furniture: 'bed-outline',
  Electronics: 'phone-portrait-outline',
  'Home Services': 'construct-outline',
  Food: 'restaurant-outline',
  Fashion: 'shirt-outline',
  Other: 'pricetag-outline',
};

export interface MarketplaceListing {
  id: string;
  title: string;
  price: number;
  category: ListingCategory;
  description: string;
  sellerName: string;
  sellerType: 'resident' | 'vendor';
  sellerUnit?: string;
  postedAt: string;
}

export const MOCK_LISTINGS: MarketplaceListing[] = [
  {
    id: '1',
    title: '3-seater fabric sofa',
    price: 85000,
    category: 'Furniture',
    description:
      "Barely used, moving out of the estate and it won't fit the new place. Grey fabric, no stains or tears. Pickup only.",
    sellerName: 'Damilola',
    sellerType: 'resident',
    sellerUnit: 'B12',
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: '2',
    title: 'Generator servicing & repairs',
    price: 5000,
    category: 'Home Services',
    description:
      'Certified technician offering same-day generator servicing, oil changes, and fault diagnosis within the estate.',
    sellerName: 'PowerFix Services',
    sellerType: 'vendor',
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: '3',
    title: 'iPhone 13, 128GB',
    price: 420000,
    category: 'Electronics',
    description: 'Good condition, battery health 87%. Comes with original box and charger.',
    sellerName: 'Ani Precious',
    sellerType: 'resident',
    sellerUnit: 'A4',
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: '4',
    title: 'Homemade small chops (per tray)',
    price: 12000,
    category: 'Food',
    description: 'Puff-puff, spring rolls, samosa. Order a day ahead for events and gatherings.',
    sellerName: "Temitope's Kitchen",
    sellerType: 'vendor',
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
];

export interface WalletTransaction {
  id: string;
  label: string;
  amount: number;
  status: 'completed' | 'pending';
  date: string;
}

export const MOCK_WALLET_BALANCE = 45000;

export const MOCK_WALLET_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 't1',
    label: 'Wallet top-up · Card',
    amount: 50000,
    status: 'completed',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: 't2',
    label: 'Estate dues · August',
    amount: -5000,
    status: 'completed',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
];

export interface DueItem {
  id: string;
  label: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'due' | 'overdue';
}

export const MOCK_DUE_ITEMS: DueItem[] = [
  {
    id: 'due-1',
    label: 'September 2026 service charge',
    amount: 15000,
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6).toISOString(),
    status: 'due',
  },
  {
    id: 'due-2',
    label: 'Security levy · Q3',
    amount: 8000,
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6).toISOString(),
    status: 'due',
  },
  {
    id: 'due-3',
    label: 'August 2026 service charge',
    amount: 15000,
    dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString(),
    status: 'overdue',
  },
  {
    id: 'due-4',
    label: 'July 2026 service charge',
    amount: 15000,
    dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 55).toISOString(),
    status: 'paid',
  },
];

