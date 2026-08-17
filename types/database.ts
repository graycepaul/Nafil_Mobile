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
  | 'household_member_scanned';

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
