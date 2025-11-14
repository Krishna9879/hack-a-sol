const request = require('supertest');
const app = require('../server');
const User = require('../models/User');

/**
 * Unit Tests for Authentication Controllers
 */
describe('Auth Controller Tests', () => {
  // Test data
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    language: 'en'
  };

  // Clean up before tests
  beforeAll(async () => {
    // Connect to test database
    // In production, use a separate test database
  });

  // Clean up after tests
  afterAll(async () => {
    // Close database connection
    // await mongoose.connection.close();
  });

  describe('POST /api/auth/signup', () => {
    it('should create a new student account', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send(testUser);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe(testUser.email);
    });

    it('should reject duplicate email', async () => {
      // First signup
      await request(app)
        .post('/api/auth/signup')
        .send(testUser);

      // Second signup with same email
      const res = await request(app)
        .post('/api/auth/signup')
        .send(testUser);

      expect(res.statusCode).toBe(409);
      expect(res.body.message).toContain('exists');
    });

    it('should validate email format', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          ...testUser,
          email: 'invalid-email'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should validate password strength', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          ...testUser,
          password: '123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    beforeAll(async () => {
      // Create a test user
      await request(app)
        .post('/api/auth/signup')
        .send(testUser);
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body).toHaveProperty('user');
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toContain('Invalid');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken;

    beforeAll(async () => {
      // Login to get refresh token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      refreshToken = loginRes.body.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      // New refresh token should be different (token rotation)
      expect(res.body.refreshToken).not.toBe(refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.statusCode).toBe(401);
    });

    it('should prevent refresh token reuse', async () => {
      // Use refresh token once
      const firstRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(firstRes.statusCode).toBe(200);

      // Try to reuse same refresh token
      const secondRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(secondRes.statusCode).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit signup attempts', async () => {
      // Make 6 requests (limit is 5)
      const requests = [];
      for (let i = 0; i < 6; i++) {
        requests.push(
          request(app)
            .post('/api/auth/signup')
            .send({
              name: `User ${i}`,
              email: `user${i}@example.com`,
              password: 'password123'
            })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponse = responses[5];

      expect(rateLimitedResponse.statusCode).toBe(429);
    });
  });
});
