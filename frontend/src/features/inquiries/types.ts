export type InquiryStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Cancelled';

export type InquiryPurpose =
  | 'Student'
  | 'Working Professional'
  | 'Business'
  | 'Family / Relocation'
  | 'Other';

export const PURPOSE_OPTIONS: InquiryPurpose[] = [
  'Student',
  'Working Professional',
  'Business',
  'Family / Relocation',
  'Other',
];

export interface Inquiry {
  id: string;
  roomId: {
    _id: string;
    title: string;
  } | string;
  roomOwnerId: string;
  seekerId: {
    _id: string;
    name: string;
  } | string;
  fromLocation: string;
  purpose: InquiryPurpose;
  message?: string;
  status: InquiryStatus;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedInquiries {
  success: boolean;
  data: Inquiry[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateInquiryInput {
  fromLocation: string;
  purpose: InquiryPurpose;
  message?: string;
}
