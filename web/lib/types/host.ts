export type HostStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface HostProfile {
  id: number;
  userId: number;
  displayName: string;
  slug: string;
  phone: string;
  website: string | null;
  cities: string;
  portfolioSize: number;
  bio: string;
  avatar: string | null;
  status: HostStatus;
  rejectionReason?: string | null;
  approvedAt: string | null;
  createdAt?: string;
}

export interface HostApplicationInput {
  displayName: string;
  phone: string;
  website?: string | null;
  cities: string;
  portfolioSize: number;
  bio: string;
  termsAccepted: boolean;
  userId?: number;
}
