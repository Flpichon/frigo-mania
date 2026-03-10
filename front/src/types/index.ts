export type ProductStatus = "ok" | "expiring_soon" | "expired";
export type DisposalReason = "consumed" | "thrown" | "expired_product" | "entry_error";

export interface Product {
  _id: string;
  name: string;
  brand?: string;
  category?: string;
  barcode: string;
  expirationDate: string; // ISO string
  nutritionFacts?: Record<string, unknown>;
  householdId: string;
  addedByUserId: string;
  disposalReason?: DisposalReason | null;
  isRemoved: boolean;
  removedAt?: string | null;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ScanResult {
  name: string;
  brand?: string;
  category?: string;
  barcode: string;
  nutritionFacts?: Record<string, unknown>;
  productSource: "open_food_facts" | "manual";
  expirationDate: string | null;
  expirationDateConfidence: "high" | "low" | "none";
  requiresManualReview: boolean;
}

export interface HouseholdMember {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface Household {
  _id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  createdAt: string;
}

export type ReportPeriod = "weekly" | "monthly";

export interface ReportSummary {
  period: ReportPeriod;
  from: string;
  to: string;
  consumed: number;
  thrown: number;
  total: number;
  wasteRate: number;
}

export interface TopWastedItem {
  name: string;
  count: number;
}

export interface TopWastedReport {
  period: ReportPeriod;
  from: string;
  to: string;
  items: TopWastedItem[];
}

