import 'dotenv/config';
import { connectDB, disconnectDB } from '../config/db.js';
import { register, login, refresh, logout } from '../modules/auth/auth.service.js';
import { getUserProfile } from '../modules/users/user.service.js';
import { User } from '../modules/users/user.model.js';
import { RefreshSession } from '../modules/auth/refreshSession.model.js';
import { AppError } from '../utils/AppError.js';

async function runTests() {
  await connectDB();
  
  console.log('\n--- Cleaning up previous test data ---');
  await User.deleteMany({ email: 'test@example.com' });
  
  const testEmail = 'test@example.com';
  const testPassword = 'securePassword123';
  let refreshToken = '';
  let userId = '';

  try {
    // 1. Register
    console.log('\n1. Testing Registration...');
    const regResult = await register({
      name: 'Test User',
      email: testEmail,
      password: testPassword,
      role: 'seeker'
    });
    console.log('✅ Registration successful:', regResult);

    // 2. Login
    console.log('\n2. Testing Login...');
    const loginResult = await login({
      email: testEmail,
      password: testPassword
    });
    refreshToken = loginResult.refreshToken;
    userId = loginResult.user.id;
    console.log('✅ Login successful. Access Token & Refresh Token received.');
    
    // 3. Current User
    console.log('\n3. Testing Get Current User...');
    const profile = await getUserProfile(userId);
    console.log('✅ Profile retrieved successfully:', profile);
    
    // 4. Refresh
    console.log('\n4. Testing Refresh Token...');
    const refreshResult = await refresh(refreshToken);
    console.log('✅ Refresh successful. New access & refresh tokens generated.');
    
    // 5. Logout
    console.log('\n5. Testing Logout...');
    await logout(refreshResult.refreshToken);
    const sessionCount = await RefreshSession.countDocuments({ 
      userId, 
      revokedAt: null 
    });
    if (sessionCount === 0) {
      console.log('✅ Logout successful. Refresh session revoked.');
    } else {
      console.log('❌ Logout failed. Active session still exists.');
    }

  } catch (error) {
    if (error instanceof AppError) {
      console.error('❌ Test failed with AppError:', error.message);
    } else {
      console.error('❌ Test failed with unexpected error:', error);
    }
  } finally {
    // Clean up
    await User.deleteMany({ email: testEmail });
    await RefreshSession.deleteMany({ userId });
    await disconnectDB();
  }
}

runTests();
