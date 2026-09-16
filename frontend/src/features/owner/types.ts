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
  ownerId: string;
  title: string;
  description: string;
  rent: number;
  location: Location;
  roomType: RoomType;
  images?: string[];
  facilities?: string[];
  suitableFor?: string[];
  contactNumber: string;
  availability: Availability;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  totalRooms: number;
  availableRooms: number;
  bookedRooms: number;
  deletedRooms: number;
}

export interface OwnerRoomQuery {
  page?: number;
  limit?: number;
  availability?: Availability;
  roomType?: RoomType;
  city?: string;
  area?: string;
  search?: string;
  sort?: 'newest' | 'oldest' | 'rent_asc' | 'rent_desc';
  includeDeleted?: boolean;
}

export interface CreateRoomPayload {
  title: string;
  description: string;
  rent: number;
  location: Location;
  roomType: RoomType;
  images?: string[];
  facilities?: string[];
  suitableFor?: string[];
  contactNumber: string;
}

export type UpdateRoomPayload = Partial<CreateRoomPayload>;
