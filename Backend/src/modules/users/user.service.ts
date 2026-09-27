import { User } from './user.model.js';
import { AppError } from '../../utils/AppError.js';
import bcryptjs from 'bcryptjs';

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
    phoneNumber: user.phoneNumber,
    bio: user.bio,
    avatar: user.avatar,
  };
};

export const updateProfile = async (
  userId: string,
  updateData: { name?: string; phoneNumber?: string; bio?: string; avatar?: string }
) => {
  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw AppError.notFound('User not found');
  }

  if (updateData.name !== undefined) user.name = updateData.name;
  if (updateData.phoneNumber !== undefined) user.phoneNumber = updateData.phoneNumber;
  if (updateData.bio !== undefined) user.bio = updateData.bio;
  if (updateData.avatar !== undefined) user.avatar = updateData.avatar;

  await user.save();

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    phoneNumber: user.phoneNumber,
    bio: user.bio,
    avatar: user.avatar,
  };
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw AppError.notFound('User not found');
  }

  const isMatch = await bcryptjs.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw AppError.badRequest('Incorrect current password');
  }

  const salt = await bcryptjs.genSalt(10);
  user.passwordHash = await bcryptjs.hash(newPassword, salt);
  await user.save();

  const RefreshSession = (await import('../auth/refreshSession.model.js')).RefreshSession;
  // Revoke all sessions to enforce re-login across devices
  await RefreshSession.updateMany(
    { userId, revokedAt: null },
    { revokedAt: new Date() }
  );
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

