import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Auth API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const testEmail = `test-${Date.now()}@example.com`;
  let capturedOtp: string | null = null;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  // Cleanup test data after all tests
  afterAll(async () => {
    if (prisma && capturedOtp) {
      try {
        await prisma.$executeRaw`DELETE FROM "User" WHERE email = ${testEmail}`;
      } catch (e) {
        console.error('Cleanup failed:', e);
      }
    }
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new student user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'SecurePass123!',
          role: 'STUDENT',
        })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('User registered. Please verify your email.');

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: testEmail },
      });
      expect(user).toBeDefined();
      expect(user?.isVerified).toBe(false);
      expect(user?.otp).toBeDefined();
      expect(user?.otp).toHaveLength(6);
      capturedOtp = user?.otp || null;
    });

    it('should register an instructor user', async () => {
      const instructorEmail = `instructor-${Date.now()}@example.com`;
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: instructorEmail,
          password: 'SecurePass123!',
          role: 'INSTRUCTOR',
        })
        .expect(HttpStatus.OK);

      expect(response.body.message).toBe('User registered. Please verify your email.');

      const user = await prisma.user.findUnique({
        where: { email: instructorEmail },
      });
      expect(user?.role).toBe('INSTRUCTOR');

      // Cleanup
      await prisma.$executeRaw`DELETE FROM "User" WHERE email = ${instructorEmail}`;
    });

    it('should throw BadRequestException if user already exists', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'SecurePass123!',
          role: 'STUDENT',
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message', 'User already exists');
    });

    it('should accept lowercase role values', async () => {
      const uniqueEmail = `lowercase-${Date.now()}@example.com`;
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: uniqueEmail,
          password: 'SecurePass123!',
          role: 'student',
        })
        .expect(HttpStatus.OK);

      const user = await prisma.user.findUnique({
        where: { email: uniqueEmail },
      });
      expect(user?.role).toBe('STUDENT');

      // Cleanup
      await prisma.$executeRaw`DELETE FROM "User" WHERE email = ${uniqueEmail}`;
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('should verify OTP successfully and mark user as verified', async () => {
      // Ensure we have a user with OTP
      expect(capturedOtp).not.toBeNull();

      const response = await request(app.getHttpServer())
        .post('/api/auth/verify-otp')
        .send({
          email: testEmail,
          otp: capturedOtp,
        })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('message', 'Email verified successfully.');

      // Verify user is marked as verified and OTP cleared
      const user = await prisma.user.findUnique({
        where: { email: testEmail },
      });
      expect(user?.isVerified).toBe(true);
      expect(user?.otp).toBeNull();
      expect(user?.otpExpiry).toBeNull();
    });

    it('should throw BadRequestException for invalid OTP', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/verify-otp')
        .send({
          email: testEmail,
          otp: '000000',
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message', 'Invalid OTP');
    });

    it('should throw BadRequestException if OTP is expired', async () => {
      // Create a user with expired OTP
      const expiredEmail = `expired-${Date.now()}@example.com`;
      const expiredOtp = '999999';
      const expiredDate = new Date(Date.now() - 11 * 60 * 1000); // 11 minutes ago

      await prisma.user.create({
        data: {
          email: expiredEmail,
          password: 'hashedpassword',
          role: 'STUDENT',
          isVerified: false,
          otp: expiredOtp,
          otpExpiry: expiredDate,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/verify-otp')
        .send({
          email: expiredEmail,
          otp: expiredOtp,
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('OTP expired');

      // Cleanup
      await prisma.$executeRaw`DELETE FROM "User" WHERE email = ${expiredEmail}`;
    });

    it('should throw BadRequestException if user not found', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/verify-otp')
        .send({
          email: 'nonexistent@example.com',
          otp: '123456',
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message', 'User not found');
    });

    it('should return already verified message if email already verified', async () => {
      // Create a pre-verified user
      const verifiedEmail = `verified-${Date.now()}@example.com`;
      await prisma.user.create({
        data: {
          email: verifiedEmail,
          password: 'hashedpassword',
          role: 'STUDENT',
          isVerified: true,
          otp: null,
          otpExpiry: null,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/verify-otp')
        .send({
          email: verifiedEmail,
          otp: '123456',
        })
        .expect(HttpStatus.OK);

      expect(response.body.message).toBe('Email already verified');

      // Cleanup
      await prisma.$executeRaw`DELETE FROM "User" WHERE email = ${verifiedEmail}`;
    });
  });
});
