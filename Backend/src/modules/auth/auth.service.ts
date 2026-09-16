import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, IUser } from '../users/user.model.js';
import { RefreshSession } from './refreshSession.model.js';
import { RegisterInput, LoginInput } from './auth.schema.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';

interface TokenPayload {
  sub: string;
  role: 'seeker' | 'owner';
}

/**
 * Generate Access Token
 */
export const generateAccessToken = (user: IUser): string => {
  const payload: TokenPayload = {
    sub: user._id.toString(),
    role: user.role,
  };

  return jwt.sign({ ...payload }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
};

/**
 * Generate Refresh Token
 */
export const generateRefreshToken = (user: IUser): string => {
  const payload: TokenPayload = {
    sub: user._id.toString(),
    role: user.role,
  };

  return jwt.sign({ ...payload }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
};

/**
 * Hash a string (like a refresh token) using SHA-256 for secure DB storage
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Parse a duration string like '7d' to a Date object
 */
const parseExpiresIn = (expiresIn: string): Date => {
  const match = expiresIn.match(/^(\d+)([dhms])$/);
  if (!match) {
    // Default fallback to 7 days if parsing fails
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    return defaultDate;
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const date = new Date();
  
  switch(unit) {
    case 'd': date.setDate(date.getDate() + value); break;
    case 'h': date.setHours(date.getHours() + value); break;
    case 'm': date.setMinutes(date.getMinutes() + value); break;
    case 's': date.setSeconds(date.getSeconds() + value); break;
  }
  return date;
};

export const register = async (input: RegisterInput) => {
  // Check if user already exists
  const existingUser = await User.findOne({ email: input.email });
  if (existingUser) {
    throw AppError.conflict('Email is already registered');
  }

  // Hash password
  const salt = await bcryptjs.genSalt(10);
  const passwordHash = await bcryptjs.hash(input.password, salt);

  // Create user
  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
  });

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

export const login = async (input: LoginInput) => {
  const genericError = AppError.unauthorized('Invalid credentials');

  // Find user
  const user = await User.findOne({ email: input.email });
  if (!user || user.isDeleted) {
    throw genericError;
  }

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw genericError;
  }

  // Compare password
  const isMatch = await bcryptjs.compare(input.password, user.passwordHash);
  if (!isMatch) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= env.AUTH_MAX_FAILED_ATTEMPTS) {
      const lockDate = new Date();
      lockDate.setMinutes(lockDate.getMinutes() + env.AUTH_LOCKOUT_MINUTES);
      user.lockedUntil = lockDate;
    }
    await user.save();
    throw genericError;
  }

  // Reset lockout state on successful login
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save();
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Create RefreshSession
  const hashedToken = hashToken(refreshToken);
  const expiresAt = parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN);

  await RefreshSession.create({
    userId: user._id,
    refreshTokenHash: hashedToken,
    expiresAt,
  });

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
};

export const refresh = async (oldRefreshToken: string) => {
  try {
    // 1. Verify token signature and expiration
    const payload = jwt.verify(oldRefreshToken, env.JWT_REFRESH_SECRET) as TokenPayload;
    
    // 2. Hash it to find it in DB
    const hashedToken = hashToken(oldRefreshToken);
    
    // 3. Find active session
    const session = await RefreshSession.findOne({
      userId: payload.sub,
      refreshTokenHash: hashedToken,
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      throw new Error('Invalid or revoked session');
    }

    // 4. Find user
    const user = await User.findById(payload.sub);
    if (!user || user.isDeleted) {
      throw new Error('User not found or deleted');
    }

    // 5. Revoke old session
    session.revokedAt = new Date();
    await session.save();

    // 6. Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    
    // 7. Store new session
    const newHashedToken = hashToken(newRefreshToken);
    const expiresAt = parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN);
    
    await RefreshSession.create({
      userId: user._id,
      refreshTokenHash: newHashedToken,
      expiresAt,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }
};

export const logout = async (refreshToken: string) => {
  if (!refreshToken) return;
  
  const hashedToken = hashToken(refreshToken);
  await RefreshSession.findOneAndUpdate(
    { refreshTokenHash: hashedToken, revokedAt: null },
    { revokedAt: new Date() }
  );
};
