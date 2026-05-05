const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/auth';

// Generate a unique email for this test run
const timestamp = Date.now();
const testEmail = `test-${timestamp}@example.com`;
const testPassword = 'SecurePass123!';

let registrationOtp = null;
let instructorEmail = null;

async function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 Starting Auth API Endpoint Tests');
  console.log('='.repeat(60));

  // ============================================
  // Test 1: User Registration (STUDENT)
  // ============================================
  console.log('\n📌 Test 1: POST /api/auth/register (STUDENT)');
  try {
    const response = await axios.post(`${BASE_URL}/register`, {
      email: testEmail,
      password: testPassword,
      role: 'STUDENT',
    });

    console.log(`✅ Status: ${response.status}`);
    console.log(`   Message: ${response.data.message}`);

    if (response.data.message !== 'User registered. Please verify your email.') {
      throw new Error('Unexpected registration message');
    }
  } catch (error) {
    console.log(`❌ Registration failed:`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    process.exit(1);
  }

  // ============================================
  // Test 2: Verify OTP (Success)
  // ============================================
  console.log('\n📌 Test 2: POST /api/auth/verify-otp (Successful)');
  try {
    // Fetch OTP from database
    const { execSync } = require('child_process');
    console.log('   Fetching OTP from database...');
    const queryCmd = `docker exec lms_postgres psql -U postgres -d lms_db -t -c "SELECT otp FROM \\"User\\" WHERE email='${testEmail}'"`;
    const otpResult = execSync(queryCmd, { encoding: 'utf-8' }).trim();
    registrationOtp = otpResult.replace(/^"|"$/g, '').trim();

    if (!registrationOtp || registrationOtp.length !== 6) {
      throw new Error(`Could not retrieve valid OTP from DB. Got: "${registrationOtp}"`);
    }

    console.log(`   ✅ Retrieved OTP from DB: ${registrationOtp}`);

    const response = await axios.post(`${BASE_URL}/verify-otp`, {
      email: testEmail,
      otp: registrationOtp,
    });

    console.log(`✅ Status: ${response.status}`);
    console.log(`   Message: ${response.data.message}`);

    if (response.data.message !== 'Email verified successfully.') {
      throw new Error('Unexpected verification message');
    }
  } catch (error) {
    console.log(`❌ OTP verification failed:`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    process.exit(1);
  }

  // ============================================
  // Test 3: Verify OTP (Already Verified)
  // ============================================
  console.log('\n📌 Test 3: POST /api/auth/verify-otp (Already Verified)');
  try {
    const response = await axios.post(`${BASE_URL}/verify-otp`, {
      email: testEmail,
      otp: registrationOtp || '123456',
    });

    console.log(`✅ Status: ${response.status}`);
    console.log(`   Message: ${response.data.message}`);

    if (response.data.message !== 'Email already verified') {
      throw new Error('Expected "already verified" message');
    }
  } catch (error) {
    console.log(`❌ Test failed:`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    process.exit(1);
  }

  // ============================================
  // Test 4: Verify OTP (Invalid OTP)
  // ============================================
  console.log('\n📌 Test 4: POST /api/auth/verify-otp (Invalid OTP)');
  try {
    const invalidEmail = `invalid-${Date.now()}@example.com`;
    await axios.post(`${BASE_URL}/register`, {
      email: invalidEmail,
      password: testPassword,
      role: 'STUDENT',
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    const response = await axios.post(`${BASE_URL}/verify-otp`, {
      email: invalidEmail,
      otp: '000000',
    });

    console.log(`❌ Should have thrown 400 but got status: ${response.status}`);
    process.exit(1);
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log(`✅ Correctly returned 400 Bad Request`);
      console.log(`   Message: ${error.response.data.message}`);
    } else {
      console.log(`❌ Unexpected error: ${error.message}`);
      process.exit(1);
    }
  }

  // ============================================
  // Test 5: Verify OTP (Non-existent User)
  // ============================================
  console.log('\n📌 Test 5: POST /api/auth/verify-otp (User Not Found)');
  try {
    const response = await axios.post(`${BASE_URL}/verify-otp`, {
      email: 'nonexistent@example.com',
      otp: '123456',
    });

    console.log(`❌ Should have thrown 400 but got status: ${response.status}`);
    process.exit(1);
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log(`✅ Correctly returned 400 Bad Request`);
      console.log(`   Message: ${error.response.data.message}`);
    } else {
      console.log(`❌ Unexpected error: ${error.message}`);
      process.exit(1);
    }
  }

  // ============================================
  // Test 6: Verify OTP (Expired OTP)
  // ============================================
  console.log('\n📌 Test 6: POST /api/auth/verify-otp (Expired OTP)');
  try {
    const expiredEmail = `expired-${Date.now()}@example.com`;
    const expiredOtp = '999999';

    const { execSync } = require('child_process');
    const now = new Date().toISOString();
    const expiryDate = new Date(Date.now() - 11 * 60 * 1000).toISOString();

    const createCmd = `docker exec lms_postgres psql -U postgres -d lms_db -c "INSERT INTO \\"User\\" (id, email, password, role, \\"isVerified\\", otp, \\"otpExpiry\\", \\"createdAt\\") VALUES (gen_random_uuid(), '${expiredEmail}', 'hashedpw', 'STUDENT', false, '${expiredOtp}', '${expiryDate}', '${now}')"`;
    execSync(createCmd, { encoding: 'utf-8' });

    const response = await axios.post(`${BASE_URL}/verify-otp`, {
      email: expiredEmail,
      otp: expiredOtp,
    });

    console.log(`❌ Should have thrown 400 but got status: ${response.status}`);
    process.exit(1);
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log(`✅ Correctly returned 400 Bad Request`);
      console.log(`   Message: ${error.response.data.message}`);
    } else {
      console.log(`❌ Unexpected error: ${error.message}`);
      process.exit(1);
    }
  }

  // ============================================
  // Test 7: Registration with Different Roles
  // ============================================
  console.log('\n📌 Test 7: POST /api/auth/register (INSTRUCTOR)');
  try {
    instructorEmail = `instructor-${Date.now()}@example.com`;
    const response = await axios.post(`${BASE_URL}/register`, {
      email: instructorEmail,
      password: testPassword,
      role: 'INSTRUCTOR',
    });

    console.log(`✅ Status: ${response.status}`);
    console.log(`   Message: ${response.data.message}`);

    // Verify role in DB
    const { execSync } = require('child_process');
    const roleResult = execSync(`docker exec lms_postgres psql -U postgres -d lms_db -t -c "SELECT role FROM \\"User\\" WHERE email='${instructorEmail}'"`, { encoding: 'utf-8' }).trim();
    const dbRole = roleResult.replace(/^"|"$/g, '').trim();

    if (dbRole !== 'INSTRUCTOR') {
      throw new Error(`Expected INSTRUCTOR, got ${dbRole}`);
    }
    console.log(`   ✅ Role correctly set to INSTRUCTOR`);

  } catch (error) {
    console.log(`❌ Registration failed:`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    process.exit(1);
  }

  // ============================================
  // Test 8: Registration with ADMIN Role
  // ============================================
  console.log('\n📌 Test 8: POST /api/auth/register (ADMIN)');
  try {
    const adminEmail = `admin-${Date.now()}@example.com`;
    const response = await axios.post(`${BASE_URL}/register`, {
      email: adminEmail,
      password: testPassword,
      role: 'ADMIN',
    });

    console.log(`✅ Status: ${response.status}`);
    console.log(`   Message: ${response.data.message}`);

    // Verify role in DB
    const { execSync } = require('child_process');
    const roleResult = execSync(`docker exec lms_postgres psql -U postgres -d lms_db -t -c "SELECT role FROM \\"User\\" WHERE email='${adminEmail}'"`, { encoding: 'utf-8' }).trim();
    const dbRole = roleResult.replace(/^"|"$/g, '').trim();

    if (dbRole !== 'ADMIN') {
      throw new Error(`Expected ADMIN, got ${dbRole}`);
    }
    console.log(`   ✅ Role correctly set to ADMIN`);

  } catch (error) {
    console.log(`❌ Registration failed:`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    process.exit(1);
  }

  // ============================================
  // Test 9: Registration with Duplicate Email
  // ============================================
  console.log('\n📌 Test 9: POST /api/auth/register (Duplicate Email)');
  try {
    const response = await axios.post(`${BASE_URL}/register`, {
      email: testEmail,
      password: testPassword,
      role: 'STUDENT',
    });

    console.log(`❌ Should have returned 400 but got ${response.status}`);
    process.exit(1);
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log(`✅ Correctly returned 400 Bad Request`);
      console.log(`   Message: ${error.response.data.message}`);
    } else {
      console.log(`❌ Unexpected error: ${error.message}`);
      process.exit(1);
    }
  }

  // ============================================
  // Cleanup
  // ============================================
  console.log('\n🧹 Cleaning up test data...');
  const { execSync } = require('child_process');

  if (testEmail) {
    execSync(`docker exec lms_postgres psql -U postgres -d lms_db -c "DELETE FROM \\"User\\" WHERE email='${testEmail}'"`, { stdio: 'ignore' });
  }
  if (instructorEmail) {
    execSync(`docker exec lms_postgres psql -U postgres -d lms_db -c "DELETE FROM \\"User\\" WHERE email='${instructorEmail}'"`, { stdio: 'ignore' });
  }

  console.log('='.repeat(60));
  console.log('✅ All Auth API tests passed!');
  console.log('='.repeat(60));
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
