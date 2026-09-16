export interface Location {
  country: string;
  state: string;
  city: string;
  area: string;
}

export type RoomType = 'Single' | 'Double' | 'PG';
export type Availability = 'Available' | 'Booked';

export interface Room {
  _id: string;
  title: string;
  description: string;
  rent: number;
  location: Location;
  roomType: RoomType;
  images?: string[];
  facilities?: string[];
  suitableFor?: string[];
  contactNumber?: string;
  availability: Availability;
  createdAt: string;
  updatedAt: string;
}

export interface RoomQueryParams {
  page?: number;
  limit?: number;
  availability?: Availability;
  roomType?: RoomType;
  city?: string;
  area?: string;
  search?: string;
  sort?: 'newest' | 'oldest' | 'rent_asc' | 'rent_desc';
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RoomListResponse {
  success: boolean;
  data: Room[];
  pagination: PaginationInfo;
}

export interface RoomDetailsResponse {
  success: boolean;
  data: Room;
}

export interface LocationCount {
  area: string;
  count: number;
}

export interface LocationCountResponse {
  success: boolean;
  data: LocationCount[];
}
