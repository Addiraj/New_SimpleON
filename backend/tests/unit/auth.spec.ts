import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server/app.js';
import { AuthService } from '../../server/services/AuthService.js';
import { AuthRepository } from '../../server/repositories/AuthRepository.js';
import { JwtUtil } from '../../server/utils/jwt.util.js';
import { createTestWallet, resetAllTestStores } from '../helpers/testUtils.js';

describe('1-10 & 63. Auth & Identity Unit Tests', () => {
  beforeEach(() => {
    resetAllTestStores();
  });

  it('1. Health endpoint returns 200 OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('2. Wallet nonce generation produces cryptographic SIWE message', async () => {
    const testWallet = createTestWallet();
    const res = await request(app)
      .post('/api/auth/nonce')
      .send({ walletAddress: testWallet.address, chainId: 97 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nonce).toBeDefined();
    expect(res.body.data.message).toContain(testWallet.address);
  });

  it('3. Wallet-signature verification authenticates user with valid SIWE signature', async () => {
    const testWallet = createTestWallet();
    const nonceData = await AuthService.requestNonce(testWallet.address, 97);

    const signature = await testWallet.wallet.signMessage(nonceData.message);

    const res = await request(app)
      .post('/api/auth/verify')
      .send({
        address: testWallet.address,
        signature,
        message: nonceData.message,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.address.toLowerCase()).toBe(testWallet.address);
  });

  it('4. Invalid signature is rejected with 401 Unauthorized', async () => {
    const testWallet = createTestWallet();
    const nonceData = await AuthService.requestNonce(testWallet.address, 97);

    const invalidSignature = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b';

    const res = await request(app)
      .post('/api/auth/verify')
      .send({
        address: testWallet.address,
        signature: invalidSignature,
        message: nonceData.message,
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('5. Expired nonce cannot be used to authenticate', async () => {
    const testWallet = createTestWallet();
    const cleanAddress = testWallet.address.toLowerCase();
    const nonce = 'expired-nonce-123';
    const message = `Sign message for testing expired nonce ${nonce}`;
    const pastDate = new Date(Date.now() - 3600000); // 1 hour ago

    await AuthRepository.createNonce({
      walletAddress: cleanAddress,
      nonce,
      message,
      expiresAt: pastDate,
    });

    const signature = await testWallet.wallet.signMessage(message);

    const res = await request(app)
      .post('/api/auth/verify')
      .send({
        address: testWallet.address,
        signature,
        message,
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('6. Reused nonce is rejected on second attempt', async () => {
    const testWallet = createTestWallet();
    const nonceData = await AuthService.requestNonce(testWallet.address, 97);
    const signature = await testWallet.wallet.signMessage(nonceData.message);

    // First attempt succeeds
    const res1 = await request(app)
      .post('/api/auth/verify')
      .send({
        address: testWallet.address,
        signature,
        message: nonceData.message,
      });
    expect(res1.status).toBe(200);

    // Second attempt fails because nonce was consumed
    const res2 = await request(app)
      .post('/api/auth/verify')
      .send({
        address: testWallet.address,
        signature,
        message: nonceData.message,
      });
    expect(res2.status).toBe(401);
  });

  it('7. Wallet-address normalization converts checksummed address to clean lowercase', async () => {
    const testWallet = createTestWallet();
    const checksummedAddress = testWallet.wallet.address; // e.g. 0xAbCd...
    const nonceData = await AuthService.requestNonce(checksummedAddress, 97);
    const signature = await testWallet.wallet.signMessage(nonceData.message);

    const res = await request(app)
      .post('/api/auth/verify')
      .send({
        address: checksummedAddress,
        signature,
        message: nonceData.message,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.user.address).toBe(testWallet.address);
  });

  it('8. Access-token validation allows access to /api/auth/me for valid token and rejects missing/invalid token', async () => {
    const testWallet = createTestWallet();
    const user = await AuthRepository.createUser({ walletAddress: testWallet.address });
    const token = JwtUtil.generateAccessToken({ userId: user.id, walletAddress: user.wallet_address });

    // Valid token
    const resValid = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(resValid.status).toBe(200);
    expect(resValid.body.data.user.id).toBe(user.id);

    // Invalid token
    const resInvalid = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(resInvalid.status).toBe(401);
  });

  it('9. Refresh-token rotation invalidates old refresh token and returns new tokens', async () => {
    const testWallet = createTestWallet();
    const nonceData = await AuthService.requestNonce(testWallet.address, 97);
    const signature = await testWallet.wallet.signMessage(nonceData.message);

    const loginRes = await request(app)
      .post('/api/auth/verify')
      .send({ address: testWallet.address, signature, message: nonceData.message });

    const firstRefreshToken = loginRes.body.data.refreshToken;

    // Rotate refresh token
    const refreshRes1 = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: firstRefreshToken });

    expect(refreshRes1.status).toBe(200);
    expect(refreshRes1.body.data.accessToken).toBeDefined();
    expect(refreshRes1.body.data.refreshToken).toBeDefined();
    expect(refreshRes1.body.data.refreshToken).not.toBe(firstRefreshToken);

    // Reusing old refresh token fails
    const refreshRes2 = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: firstRefreshToken });

    expect(refreshRes2.status).toBe(401);
  });

  it('10. Logout revokes refresh session', async () => {
    const testWallet = createTestWallet();
    const nonceData = await AuthService.requestNonce(testWallet.address, 97);
    const signature = await testWallet.wallet.signMessage(nonceData.message);

    const loginRes = await request(app)
      .post('/api/auth/verify')
      .send({ address: testWallet.address, signature, message: nonceData.message });

    const refreshToken = loginRes.body.data.refreshToken;

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken });

    expect(logoutRes.status).toBe(200);

    // Refresh after logout fails
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(refreshRes.status).toBe(401);
  });

  it('63. Suspended user is restricted from accessing protected endpoints', async () => {
    const testWallet = createTestWallet();
    const user = await AuthRepository.createUser({ walletAddress: testWallet.address });
    const { prisma } = await import('../../server/config/database.js');
    await prisma.user.update({ where: { id: user.id }, data: { status: 'SUSPENDED' } });

    const token = JwtUtil.generateAccessToken({ userId: user.id, walletAddress: user.wallet_address });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('suspended');
  });
});
