export type UserRole = 'resident' | 'security' | 'admin' | 'super_admin';
export type VisitorPassStatus = 'pending' | 'used' | 'expired' | 'revoked';
export type VisitorLogMethod = 'qr' | 'code' | 'manual';
export type IssueStatus = 'open' | 'in_progress' | 'resolved';
export type AnnouncementSeverity = 'info' | 'emergency';
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';
export type StaffInviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';
export type HouseholdMemberStatus = 'active' | 'revoked' | 'pending_review';
export type HouseholdReviewFrequency = 'monthly' | 'quarterly' | 'semiannual' | 'yearly';
export type ScheduledVisitStatus = 'pending' | 'arrived' | 'expired' | 'cancelled';

export interface Estate {
  id: string;
  name: string;
  address: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  estate_id: string | null;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  unit_no: string | null;
  avatar_url: string | null;
  approved: boolean;
  resident_code: string | null;
  created_at: string;
}

export interface EstateJoinRequest {
  id: string;
  profile_id: string;
  estate_id: string;
  unit_no: string;
  status: JoinRequestStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

/** Shape returned by the admin queue's join-request query, with the resident's name/phone joined in. */
export interface JoinRequestWithApplicant extends EstateJoinRequest {
  applicant: Pick<Profile, 'full_name' | 'phone' | 'avatar_url'> | null;
}

export interface StaffInvite {
  id: string;
  estate_id: string;
  role: 'security' | 'admin';
  email: string;
  code: string;
  status: StaffInviteStatus;
  invited_by: string;
  created_at: string;
  expires_at: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  reviewed_at: string | null;
  accepted_profile_id: string | null;
}

export interface VisitorPass {
  id: string;
  estate_id: string;
  resident_id: string;
  visitor_name: string;
  visitor_phone: string | null;
  vehicle_plate: string | null;
  code: string;
  status: VisitorPassStatus;
  valid_from: string;
  valid_until: string;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  estate_id: string;
  resident_id: string;
  full_name: string;
  relationship: string;
  phone: string | null;
  avatar_url: string | null;
  code: string;
  status: HouseholdMemberStatus;
  review_frequency: HouseholdReviewFrequency | null;
  next_review_at: string | null;
  last_scanned_at: string | null;
  created_at: string;
}

export interface ScheduledVisit {
  id: string;
  estate_id: string;
  resident_id: string;
  visitor_name: string;
  visitor_phone: string | null;
  description: string | null;
  scheduled_for: string;
  status: ScheduledVisitStatus;
  created_at: string;
}

export interface VisitorLog {
  id: string;
  estate_id: string;
  pass_id: string | null;
  security_id: string;
  visitor_name: string;
  vehicle_plate: string | null;
  method: VisitorLogMethod;
  checked_in_at: string;
  checked_out_at: string | null;
  notes: string | null;
}

export interface Issue {
  id: string;
  estate_id: string;
  resident_id: string;
  category: string;
  description: string;
  photo_urls: string[];
  status: IssueStatus;
  created_at: string;
  resolved_at: string | null;
}

export type AlertCategory = 'missing_child' | 'security_breach' | 'epidemic' | 'other';

export interface Announcement {
  id: string;
  estate_id: string;
  author_id: string;
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  category: AlertCategory | null;
  created_at: string;
}

export interface PushToken {
  id: string;
  profile_id: string;
  token: string;
  platform: string | null;
  created_at: string;
}

export type NotificationType =
  | 'announcement'
  | 'emergency'
  | 'issue_status'
  | 'visitor_pass_used'
  | 'join_request_approved'
  | 'staff_invite_accepted'
  | 'household_member_scanned'
  | 'issue_reported'
  | 'order_placed'
  | 'order_completed'
  | 'transfer_confirmed'
  | 'transfer_rejected';

export interface Notification {
  id: string;
  profile_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export type ListingType = 'good' | 'service';
export type ListingStatus = 'active' | 'sold' | 'removed';

export interface Listing {
  id: string;
  estate_id: string;
  seller_id: string;
  type: ListingType;
  title: string;
  description: string;
  category: string;
  price: number;
  /** Services only, for a "starting from" range. Null for goods and flat-rate services. */
  price_max: number | null;
  photo_urls: string[];
  /** Goods only. */
  pickup: boolean;
  pickup_address: string | null;
  home_delivery: boolean;
  delivery_fee: number;
  /** Services only. */
  whatsapp: string | null;
  status: ListingStatus;
  created_at: string;
}

/** Shape returned by the marketplace's own queries, with the seller's display info joined in. */
export interface ListingWithSeller extends Listing {
  seller: Pick<Profile, 'full_name' | 'unit_no'> | null;
}

export type WalletTransactionStatus = 'completed' | 'pending';

export interface Wallet {
  profile_id: string;
  balance: number;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  profile_id: string;
  label: string;
  amount: number;
  status: WalletTransactionStatus;
  created_at: string;
}

export type DueStatus = 'due' | 'overdue' | 'paid';

export interface Due {
  id: string;
  estate_id: string;
  profile_id: string;
  label: string;
  amount: number;
  due_date: string;
  status: DueStatus;
  created_at: string;
}

export type OrderStatus = 'pending_transfer' | 'paid' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  estate_id: string;
  listing_id: string;
  seller_id: string;
  buyer_id: string;
  amount: number;
  payment_method: string;
  status: OrderStatus;
  created_at: string;
  completed_at: string | null;
}

/** Shape returned by the Store screen's orders query, with listing/buyer info joined in. */
export interface OrderWithContext extends Order {
  listing: Pick<Listing, 'title'> | null;
  buyer: Pick<Profile, 'full_name' | 'unit_no'> | null;
}

export type TransferPurpose = 'wallet_topup' | 'dues' | 'marketplace_order';
export type TransferStatus = 'pending' | 'confirmed' | 'rejected';

export interface Transfer {
  id: string;
  estate_id: string;
  profile_id: string;
  purpose: TransferPurpose;
  reference_id: string | null;
  amount: number;
  label: string;
  status: TransferStatus;
  created_at: string;
  confirmed_at: string | null;
  confirmed_by: string | null;
}

/** Shape returned by the admin transfer queue, with the submitter's info joined in. */
export interface TransferWithSubmitter extends Transfer {
  submitter: Pick<Profile, 'full_name' | 'unit_no'> | null;
  estate: { name: string } | null;
}
