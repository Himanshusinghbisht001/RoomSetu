export interface ReviewUser {
  _id: string;
  name: string;
  role: string;
}

export interface Review {
  id: string;
  roomId: string;
  user: ReviewUser;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewSummary {
  averageRating: number;
  reviewCount: number;
}

export interface ReviewListResponse {
  success: boolean;
  data: Review[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateReviewInput {
  rating: number;
  comment: string;
}

export interface UpdateReviewInput {
  rating?: number;
  comment?: string;
}
