import { Request, Response } from 'express';
import { RefreshSession } from './refreshSession.model.js';
import { AppError } from '../../utils/AppError.js';

/**
 * Get all active sessions for the authenticated user.
 */
export const getMySessions = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const sessions = await RefreshSession.find({
    userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .select('_id createdAt expiresAt')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: sessions.map(s => ({
      id: s._id,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    })),
  });
};

/**
 * Revoke a specific session belonging to the authenticated user.
 */
export const revokeSession = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const sessionId = req.params.id;

  const session = await RefreshSession.findOne({
    _id: sessionId,
    userId,
    revokedAt: null,
  });

  if (!session) {
    // Return 404 to avoid leaking whether session exists for other users
    throw AppError.notFound('Session not found or already revoked');
  }

  session.revokedAt = new Date();
  await session.save();

  res.status(200).json({
    success: true,
    data: { message: 'Session revoked successfully' },
  });
};
