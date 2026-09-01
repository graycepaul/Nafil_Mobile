/** Marketplace category lists, icons, and price-display formatting. */

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
