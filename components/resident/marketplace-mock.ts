/**
 * Marketplace category/display helpers, plus placeholder data still backing
 * the wallet and dues screens (see `Listing` in `types/database.ts` for the
 * real, backend-wired shape marketplace screens now query).
 *
 * There's no `wallet_transactions` or `dues` table yet, so `WalletTransaction`
 * and `DueItem` below stay mock for now: every screen that reads them owns
 * its own local state seeded from these constants.
 */

import { formatNaira } from '../../lib/format';
import type { Listing } from '../../types/database';

export type ListingCategory =
  | 'Furniture'
  | 'Electronics'
  | 'Food'
  | 'Fashion'
  | 'Home Services'
  | 'Beauty & Grooming'
  | 'Tutoring'
  | 'Other';

export const GOOD_CATEGORIES: ListingCategory[] = ['Furniture', 'Electronics', 'Food', 'Fashion', 'Other'];

export const SERVICE_CATEGORIES: ListingCategory[] = ['Home Services', 'Beauty & Grooming', 'Tutoring', 'Other'];

/** Every category across both types, for the browse screen's chip filter. */
export const LISTING_CATEGORIES: ListingCategory[] = [...GOOD_CATEGORIES, ...SERVICE_CATEGORIES].filter(
  (category, index, all) => all.indexOf(category) === index
);

export const CATEGORY_ICON: Record<ListingCategory, string> = {
  Furniture: 'bed-outline',
  Electronics: 'phone-portrait-outline',
  Food: 'restaurant-outline',
  Fashion: 'shirt-outline',
  'Home Services': 'construct-outline',
  'Beauty & Grooming': 'cut-outline',
  Tutoring: 'book-outline',
  Other: 'pricetag-outline',
};

/** "₦5,000.00" for a flat price, "₦5,000.00 - ₦15,000.00" for a service price range. */
export function formatListingPrice(listing: Pick<Listing, 'price' | 'price_max'>): string {
  if (listing.price_max && listing.price_max > listing.price) {
    return `${formatNaira(listing.price)} - ${formatNaira(listing.price_max)}`;
  }
  return formatNaira(listing.price);
}

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

