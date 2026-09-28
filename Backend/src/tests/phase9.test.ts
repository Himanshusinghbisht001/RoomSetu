import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { User } from '../modules/users/user.model.js';
import { EmailVerification } from '../modules/auth/emailVerification.model.js';
import * as emailService from '../services/email.service.js';
import { vi } from 'vitest';

const app = createApp();

const TEST_DB_URI = process.env['MONGODB_TEST_URI'] ?? null;
const DB_AVAILABLE = TEST_DB_URI !== null;

describe.skipIf(!DB_AVAILABLE)('Phase 9: Email Verification / OTP Integration Tests', () => {
  beforeAll(async () => {
    await mongoose.connect(TEST_DB_URI as string);
    // Mock the email service so we don't actually send emails
    vi.spyOn(emailService, 'isOtpEmailConfigured').mockReturnValue(true);
    vi.spyOn(emailService, 'sendVerificationOTP').mockResolvedValue(undefined);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await mongoose.disconnect();
  });

  afterEach(async () => {
    await User.deleteMany({ email: /@phase9test\.com$/ });
    await EmailVerification.deleteMany({});
  });

  it('1. Registration creates user with emailVerified=false and generates OTP', async () => {
    const email = 'user1@phase9test.com';
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'User One',
      email,
      password: 'Password123!',
      role: 'seeker',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const user = await User.findOne({ email });
    expect(user).toBeDefined();
    expect(user!.emailVerified).toBe(false);

    // 2. OTP is generated
    const verification = await EmailVerification.findOne({ userId: user!._id });
    expect(verification).toBeDefined();
    
    // 3. OTP is hashed (length of SHA-256 hex string is 64)
    expect(verification!.otpHash.length).toBe(64);
    
    // 17. OTP hash is never returned to frontend
    expect(res.body.data.otpHash).toBeUndefined();
    expect(res.body.data.otp).toBeUndefined();
  });

  it('12. Unverified user cannot login normally', async () => {
    const email = 'user2@phase9test.com';
    await request(app).post('/api/v1/auth/register').send({
      name: 'User Two',
      email,
      password: 'Password123!',
      role: 'seeker',
    });

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email,
      password: 'Password123!',
    });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error.message).toContain('verify your email');
  });

  it('4. Correct OTP verifies email and 13. Verified user can login', async () => {
    const email = 'user3@phase9test.com';
    await request(app).post('/api/v1/auth/register').send({
      name: 'User Three',
      email,
      password: 'Password123!',
      role: 'seeker',
    });

    // We can't know the plain OTP since it's hashed and not returned.
    // So we will just manually update the hash in DB to match a known OTP "123456"
    const user = await User.findOne({ email });
    const { hashOTP } = await import('../utils/otp.js');
    await EmailVerification.updateOne(
      { userId: user!._id },
      { otpHash: hashOTP('123456') }
    );

    const verifyRes = await request(app).post('/api/v1/auth/verify-email').send({
      email,
      otp: '123456'
    });

    expect(verifyRes.status).toBe(200);

    const updatedUser = await User.findOne({ email });
    expect(updatedUser!.emailVerified).toBe(true);
    
    // 9. OTP cannot be reused (it is deleted)
    const verification = await EmailVerification.findOne({ userId: user!._id });
    expect(verification).toBeNull();

    // Now user can login
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email,
      password: 'Password123!',
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toBeDefined();
  });

  it('5. Wrong OTP is rejected and 6. increments attempts', async () => {
    const email = 'user4@phase9test.com';
    await request(app).post('/api/v1/auth/register').send({
      name: 'User Four',
      email,
      password: 'Password123!',
      role: 'seeker',
    });

    const user = await User.findOne({ email });

    const verifyRes = await request(app).post('/api/v1/auth/verify-email').send({
      email,
      otp: '000000' // wrong OTP
    });

    expect(verifyRes.status).toBe(400);
    expect(verifyRes.body.error.message).toBe('Invalid verification code');

    const verification = await EmailVerification.findOne({ userId: user!._id });
    expect(verification!.attempts).toBe(1);
  });

  it('7. 5 failed attempts blocks the OTP', async () => {
    const email = 'user5@phase9test.com';
    await request(app).post('/api/v1/auth/register').send({
      name: 'User Five',
      email,
      password: 'Password123!',
      role: 'seeker',
    });

    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/v1/auth/verify-email').send({
        email,
        otp: '000000'
      });
    }

    // 6th attempt should return a specific error that it's blocked/too many attempts
    const verifyRes = await request(app).post('/api/v1/auth/verify-email').send({
      email,
      otp: '000000'
    });

    expect(verifyRes.status).toBe(400);
    expect(verifyRes.body.error.message).toContain('No verification code found'); // Since it is deleted after 5 attempts
  });

  it('8. Expired OTP rejected', async () => {
    const email = 'user6@phase9test.com';
    await request(app).post('/api/v1/auth/register').send({
      name: 'User Six',
      email,
      password: 'Password123!',
      role: 'seeker',
    });

    const user = await User.findOne({ email });
    const { hashOTP } = await import('../utils/otp.js');
    await EmailVerification.updateOne(
      { userId: user!._id },
      { 
        otpHash: hashOTP('123456'),
        expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
      }
    );

    const verifyRes = await request(app).post('/api/v1/auth/verify-email').send({
      email,
      otp: '123456'
    });

    expect(verifyRes.status).toBe(400);
    expect(verifyRes.body.error.message).toContain('Verification code has expired');
  });

  it('11. Resend cooldown works and 10. New OTP invalidates old OTP', async () => {
    const email = 'user7@phase9test.com';
    await request(app).post('/api/v1/auth/register').send({
      name: 'User Seven',
      email,
      password: 'Password123!',
      role: 'seeker',
    });

    // Immediate resend should fail due to cooldown
    const resendRes1 = await request(app).post('/api/v1/auth/resend-verification').send({ email });
    expect(resendRes1.status).toBe(400);
    expect(resendRes1.body.error.message).toContain('Please wait 60 seconds');

    // Manually bypass cooldown for testing by updating lastSentAt
    const user = await User.findOne({ email });
    await EmailVerification.updateOne(
      { userId: user!._id },
      { lastSentAt: new Date(Date.now() - 61000) }
    );

    // Resend again
    const resendRes2 = await request(app).post('/api/v1/auth/resend-verification').send({ email });
    expect(resendRes2.status).toBe(200);
    expect(resendRes2.body.success).toBe(true);

    // Ensure only 1 OTP exists in the DB for this user (old one invalidated)
    const count = await EmailVerification.countDocuments({ userId: user!._id });
    expect(count).toBe(1);
  });
});
