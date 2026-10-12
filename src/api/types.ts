export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ---------- Auth ----------
export interface UserSession {
  id: number
  name: string
  lastName: string
  accessToken: string
  roles: string[]
}

// ---------- Bookings ----------
export interface BookingSummary {
  id: string
  user_id: number
  booking_status_id: number
  created_at: string
  payment_id: number | null
}

// ---------- Redemption codes ----------
export interface RedemptionCode {
  id: string
  code: string
  value: number
  createdAt: string
  expiresAt: string | null
  redeemedAt: string | null
  redeemedByExternalId: number | null
  comment: string | null
  createdBy: number | null
}

export interface RedemptionCodeFilters {
  code?: string
  comment?: string
  isRedeemed?: boolean
  isExpired?: boolean
  startDate?: string
  endDate?: string
}

// ---------- Wallets ----------
export interface Wallet {
  id: string
  balance: number
  createdAt: string
  updatedAt: string
  userId: string
  userName?: string
  userLastname?: string
}

export interface BalanceBreakdown {
  total: number
  giftcard: number
  credit: number
  refund: number
  review: number
  totalDeposited: number
  totalRefunded: number
  totalWithdrawn: number
  activeGiftcards: number
  activePromotionalCredits: number
}

export type WalletCreditType = 'GIFTCARD' | 'PROMOTIONAL_CREDIT' | 'REFUND_CREDIT' | 'REVIEW_CREDIT'

export interface PromotionalSegment {
  id: string
  name: string
  description: string
}

export interface BulkPromotionalCreditsResult {
  success: boolean
  totalUsers: number
  assigned: number
  failed: number
  errors: { userId: number; error: string }[]
}

// ---------- Transactions ----------
export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'REDEMPTION' | 'REFUND'

export interface PromotionalCredit {
  id: string
  usedAmount: number
  availableAmount: number
  originalAmount: number
  isExpired: boolean
  campaignName: string
  expiresAt: string | null
}

export interface Transaction {
  id: string
  amount: number
  type: TransactionType
  description: string
  createdAt: string
  userId: string
  walletId: string
  redemptionCode: string | null
  bookingId: number | null
  walletUpdatedAt: string | null
  walletBalance: number | null
  externalUserId: number | null
  comment: string | null
  expiresAt: string | null
  promotionalCredit: PromotionalCredit | null
}

export interface TransactionFilters {
  type?: TransactionType
  startDate?: string
  endDate?: string
  externalUserId?: number
  description?: string
  comment?: string
}

// ---------- Referrals (programa de referidos) ----------
export type ReferralStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'CANCELED'

export interface Referral {
  id: string
  referrerId: number
  referredId: number
  code: string
  status: ReferralStatus
  createdAt: string
  completedAt: string | null
  expiresAt: string | null
  rewardGranted: boolean
  totalRewards: number
  updatedAt: string | null
}

export interface ReferralFilters {
  status?: string
  referrerId?: number
  referredId?: number
  code?: string
  startDate?: string
  endDate?: string
}

export interface ReferralCode {
  id: string
  code: string
  isActive: boolean
}

export interface ReferralStats {
  totalReferralCodes: number
  totalReferrals: number
  completedReferrals: number
  pendingReferrals: number
  expiredReferrals: number
  conversionRate: number
  totalRewardsValue: number
  topReferrers: { userId: number; totalReferrals: number }[]
}

export interface UserReferralStats {
  userId: number
  code: string
  isActive: boolean
  totalReferrals: number
  completedReferrals: number
  pendingReferrals: number
  expiredReferrals: number
  totalRewardsEarned: number
  lastReferralDate: string | null
}

export interface Reward {
  id: string
  userId: number
  referralId: string
  referrerId: number
  referredId: number
  rewardType: 'REFERRER_REWARD' | 'REFERRED_REWARD'
  rewardValue: number
  status: 'PENDING' | 'APPLIED' | 'EXPIRED'
  createdAt: string
  expiresAt: string | null
  appliedAt: string | null
}

export interface ReferralConfig {
  id: string
  referrerRewardValue: number
  referredRewardValue: number
  referralExpirationDays: number
  creditExpirationDays: number
  maxReferralsPerUser: number | null
  maxRewardPerMonth: number | null
  isActive: boolean
  invitationMessage: string | null
  storeUrl: string | null
  createdAt: string
  updatedAt: string | null
}

export type ReferralConfigUpdate = Partial<
  Omit<ReferralConfig, 'id' | 'createdAt' | 'updatedAt'>
>

// ---------- Beliter referrals ----------
export type BeliterReferralStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'CANCELED'
export type BeliterPayoutStatus = 'PENDING' | 'PAID' | 'CANCELED'

export interface BeliterReferral {
  id: string
  status: BeliterReferralStatus
  referrerExternalId: number
  referredExternalId: number
  code: string
  createdAt: string
  completedAt: string | null
  expiresAt: string | null
  commissionExpiresAt: string | null
  payout: { amount: number; status: BeliterPayoutStatus } | null
}

export interface BeliterPayout {
  id: string
  referrerExternalId: number
  referredExternalId: number
  amount: number
  status: BeliterPayoutStatus
  createdAt: string
  paidAt: string | null
  paidBy: string | null
  notes: string | null
}

export interface BeliterPayoutSummary {
  referrerExternalId: number
  pendingCount: number
  totalAmount: number
}

export interface BeliterConfig {
  id: string
  referrerPayoutAmount: number
  referredSalonLevelId: number
  referredCommissionDurationDays: number
  referralExpirationDays: number
  maxReferralsPerUser: number | null
  invitationMessage: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type BeliterConfigUpdate = Omit<BeliterConfig, 'id' | 'createdAt' | 'updatedAt'>

export interface BeliterStats {
  totalReferrals: number
  completedReferrals: number
  pendingReferrals: number
  expiredReferrals: number
  conversionRate: number
  totalPayoutsAmount: number
  pendingPayoutsAmount: number
}

export interface BeliterReferralFilters {
  status?: string
  referrerId?: number
  referredId?: number
  code?: string
  startDate?: string
  endDate?: string
}
