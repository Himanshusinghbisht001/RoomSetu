import { Types } from 'mongoose';
import { Inquiry, ACTIVE_STATUSES } from './inquiry.model.js';
import { Room } from '../rooms/room.model.js';
import { User } from '../users/user.model.js';
import { AppError } from '../../utils/AppError.js';
import { getIO } from '../../sockets/socket.js';
import { CreateInquiryInput, InquiryQuery } from './inquiry.schema.js';

/**
 * Create a new room interest inquiry.
 *
 * Business rules enforced:
 * 1. Room must exist and not be deleted.
 * 2. Room owner must still exist.
 * 3. Seeker cannot inquire about their own room.
 * 4. Only one active inquiry per seeker per room.
 */
export const createInquiry = async (
  roomId: string,
  seekerId: string,
  data: CreateInquiryInput,
) => {
  // 1. Find room
  const room = await Room.findById(roomId);
  if (!room || room.isDeleted) {
    throw AppError.notFound('Room not found');
  }

  // 2. Check that the room owner still exists
  const owner = await User.findById(room.ownerId);
  if (!owner || owner.isDeleted) {
    throw AppError.notFound('Room owner no longer exists');
  }

  // 3. Seeker cannot inquire about their own room
  if (room.ownerId.toString() === seekerId) {
    throw AppError.forbidden('You cannot show interest in your own room');
  }

  // 4. Check for existing active inquiry from this seeker for this room
  const existingActive = await Inquiry.findOne({
    roomId,
    seekerId,
    status: { $in: ACTIVE_STATUSES },
    isDeleted: false,
  });

  if (existingActive) {
    throw AppError.conflict('You already have an active interest request for this room');
  }

  // 5. Create the inquiry — derive roomOwnerId from the room document
  const inquiry = await Inquiry.create({
    roomId: new Types.ObjectId(roomId),
    roomOwnerId: room.ownerId,
    seekerId: new Types.ObjectId(seekerId),
    ...(data.message ? { message: data.message } : {}),
    status: 'Pending',
  });

  // 6. Fetch seeker name for the notification payload
  const seeker = await User.findById(seekerId).select('name');

  // 7. Emit Socket.io notification to the room owner
  try {
    const io = getIO();
    const ownerRoom = `user:${room.ownerId.toString()}`;
    io.to(ownerRoom).emit('room:interest:new', {
      inquiryId: inquiry._id.toString(),
      roomId: room._id.toString(),
      roomTitle: room.title,
      seekerId,
      seekerName: seeker?.name ?? 'Unknown',
      status: 'Pending',
      createdAt: inquiry.createdAt,
    });
  } catch {
    // Socket notification is best-effort — don't fail the request
  }

  return inquiry;
};

/**
 * Get inquiries received by an owner (for rooms they own).
 */
export const getReceivedInquiries = async (ownerId: string, query: InquiryQuery) => {
  const { page = 1, limit = 10 } = query;
  const skip = (page - 1) * limit;

  const filter = {
    roomOwnerId: new Types.ObjectId(ownerId),
    isDeleted: false,
  };

  const [inquiries, total] = await Promise.all([
    Inquiry.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'seekerId', select: 'name' })
      .populate({ path: 'roomId', select: 'title' })
      .lean(),
    Inquiry.countDocuments(filter),
  ]);

  return {
    inquiries,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get inquiries sent by a seeker.
 */
export const getMyInquiries = async (seekerId: string, query: InquiryQuery) => {
  const { page = 1, limit = 10 } = query;
  const skip = (page - 1) * limit;

  const filter = {
    seekerId: new Types.ObjectId(seekerId),
    isDeleted: false,
  };

  const [inquiries, total] = await Promise.all([
    Inquiry.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'roomId', select: 'title' })
      .lean(),
    Inquiry.countDocuments(filter),
  ]);

  return {
    inquiries,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Accept a pending inquiry.
 * Only the actual room owner can perform this action.
 */
export const acceptInquiry = async (inquiryId: string, ownerId: string) => {
  const inquiry = await Inquiry.findOne({ _id: inquiryId, isDeleted: false });

  if (!inquiry) {
    throw AppError.notFound('Inquiry not found');
  }

  // Verify ownership — only the room owner can accept
  if (inquiry.roomOwnerId.toString() !== ownerId) {
    throw AppError.notFound('Inquiry not found');
  }

  if (inquiry.status !== 'Pending') {
    throw AppError.conflict(`Cannot accept an inquiry that is already ${inquiry.status}`);
  }

  inquiry.status = 'Accepted';
  await inquiry.save();

  // Emit Socket.io notification to the seeker
  try {
    const io = getIO();
    const room = await Room.findById(inquiry.roomId).select('title');
    const seekerRoom = `user:${inquiry.seekerId.toString()}`;
    io.to(seekerRoom).emit('room:interest:accepted', {
      inquiryId: inquiry._id.toString(),
      roomId: inquiry.roomId.toString(),
      roomTitle: room?.title ?? 'Unknown',
      status: 'Accepted',
      updatedAt: inquiry.updatedAt,
    });
  } catch {
    // Socket notification is best-effort
  }

  return inquiry;
};

/**
 * Reject a pending inquiry.
 * Only the actual room owner can perform this action.
 */
export const rejectInquiry = async (inquiryId: string, ownerId: string) => {
  const inquiry = await Inquiry.findOne({ _id: inquiryId, isDeleted: false });

  if (!inquiry) {
    throw AppError.notFound('Inquiry not found');
  }

  // Verify ownership
  if (inquiry.roomOwnerId.toString() !== ownerId) {
    throw AppError.notFound('Inquiry not found');
  }

  if (inquiry.status !== 'Pending') {
    throw AppError.conflict(`Cannot reject an inquiry that is already ${inquiry.status}`);
  }

  inquiry.status = 'Rejected';
  await inquiry.save();

  // Emit Socket.io notification to the seeker
  try {
    const io = getIO();
    const room = await Room.findById(inquiry.roomId).select('title');
    const seekerRoom = `user:${inquiry.seekerId.toString()}`;
    io.to(seekerRoom).emit('room:interest:rejected', {
      inquiryId: inquiry._id.toString(),
      roomId: inquiry.roomId.toString(),
      roomTitle: room?.title ?? 'Unknown',
      status: 'Rejected',
      updatedAt: inquiry.updatedAt,
    });
  } catch {
    // Socket notification is best-effort
  }

  return inquiry;
};

/**
 * Cancel a pending inquiry.
 * Only the seeker who created the inquiry can perform this action.
 */
export const cancelInquiry = async (inquiryId: string, seekerId: string) => {
  const inquiry = await Inquiry.findOne({ _id: inquiryId, isDeleted: false });

  if (!inquiry) {
    throw AppError.notFound('Inquiry not found');
  }

  // Verify ownership
  if (inquiry.seekerId.toString() !== seekerId) {
    throw AppError.notFound('Inquiry not found');
  }

  if (inquiry.status !== 'Pending') {
    throw AppError.conflict(`Cannot cancel an inquiry that is already ${inquiry.status}`);
  }

  inquiry.status = 'Cancelled';
  await inquiry.save();

  return inquiry;
};
