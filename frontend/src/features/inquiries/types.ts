export type InquiryStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Cancelled';

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
  message?: string;
}
