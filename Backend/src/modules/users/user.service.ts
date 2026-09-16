import { User } from './user.model.js';
import { AppError } from '../../utils/AppError.js';

export const getUserProfile = async (userId: string) => {
  const user = await User.findById(userId).select('-passwordHash');
  
  if (!user) {
    throw AppError.notFound('User not found');
  }
  
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

export const exportUser = async (userId: string) => {
  const user = await User.findById(userId).select('-passwordHash -failedLoginAttempts -lockedUntil -__v');
  if (!user) {
    throw AppError.notFound('User not found');
  }

  // To avoid circular dependency, import at function level or use mongoose.model
  const RefreshSession = (await import('../auth/refreshSession.model.js')).RefreshSession;
  const Room = (await import('../rooms/room.model.js')).Room;

  const sessions = await RefreshSession.find({ userId })
    .select('-refreshTokenHash -__v')
    .lean();

  const rooms = await Room.find({ ownerId: userId })
    .select('-__v')
    .lean();

  return {
    profile: user,
    sessions,
    rooms,
  };
};

export const softDeleteUser = async (userId: string, confirmation: string) => {
  if (confirmation !== 'DELETE') {
    throw AppError.badRequest('Invalid confirmation string. Must be exactly "DELETE"');
  }

  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw AppError.notFound('User not found');
  }

  user.isDeleted = true;
  user.deletedAt = new Date();
  await user.save();

  const RefreshSession = (await import('../auth/refreshSession.model.js')).RefreshSession;
  const Room = (await import('../rooms/room.model.js')).Room;

  // Revoke all sessions
  await RefreshSession.updateMany(
    { userId, revokedAt: null },
    { revokedAt: new Date() }
  );

  // Soft delete all rooms owned by user
  await Room.updateMany(
    { ownerId: userId, isDeleted: false },
    { isDeleted: true, deletedAt: new Date() }
  );
};

