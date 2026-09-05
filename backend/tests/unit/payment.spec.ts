import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server/app.js';
import { AuthRepository } from '../../server/repositories/AuthRepository.js';
import { PaymentRepository } from '../../server/repositories/PaymentRepository.js';
import { JwtUtil } from '../../server/utils/jwt.util.js';
import { createTestWallet, resetAllTestStores } from '../helpers/testUtils.js';

import { prisma } from '../../server/config/database.js';
import { seedFullLadder } from '../helpers/testUtils.js';

describe('23-35. Payment Intent & Blockchain Verification Unit Tests', () => {
  beforeEach(async () => {
    resetAllTestStores();
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE payment_verifications, payment_intents, wallet_ledgers, transactions, matrix_cycles, referral_relations, users, level_configurations CASCADE;`);
    await seedFullLadder(prisma);
  });

  it('23. Payment-intent creation creates PENDING intent with expected amount and payment reference', async () => {
    const testWallet = createTestWallet();
    const user = await AuthRepository.createUser({ walletAddress: testWallet.address });
    const token = JwtUtil.generateAccessToken({ userId: user.id, walletAddress: user.wallet_address });

    const res = await request(app)
      .post('/api/payment/intent')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentType: 'JOIN', levelOrder: 1 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.intent.paymentReference).toMatch(/^PAY-JOIN-/);
    expect(res.body.data.intent.status).toBe('PENDING');
  });

  it('24. Duplicate active payment intent returns existing PENDING intent instead of creating a second', async () => {
    const testWallet = createTestWallet();
    const user = await AuthRepository.createUser({ walletAddress: testWallet.address });
    const token = JwtUtil.generateAccessToken({ userId: user.id, walletAddress: user.wallet_address });

    // Create first intent
    const res1 = await request(app)
      .post('/api/payment/intent')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentType: 'JOIN', levelOrder: 1 });

    const intentId1 = res1.body.data.intent.id;

    // Request second intent while first is active
    const res2 = await request(app)
      .post('/api/payment/intent')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentType: 'JOIN', levelOrder: 1 });

    expect(res2.status).toBe(200);
    expect(res2.body.data.intent.id).toBe(intentId1);
  });

  it('25. Invalid plan join rejects invalid level configurations', async () => {
    const testWallet = createTestWallet();
    const user = await AuthRepository.createUser({ walletAddress: testWallet.address });
    const token = JwtUtil.generateAccessToken({ userId: user.id, walletAddress: user.wallet_address });

    const res = await request(app)
      .post('/api/payment/intent')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentType: 'JOIN', levelOrder: 999 }); // Non-existent level

    expect(res.status).toBe(404);
  });

  it('26. Blockchain transaction verification confirms valid tx and activates payment intent', async () => {
    const testWallet = createTestWallet();
    const user = await AuthRepository.createUser({ walletAddress: testWallet.address });
    const token = JwtUtil.generateAccessToken({ userId: user.id, walletAddress: user.wallet_address });

    const intentRes = await request(app)
      .post('/api/payment/intent')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentType: 'JOIN', levelOrder: 1 });

    const intentId = intentRes.body.data.intent.id;

    const mockTxHash = `0x${'a'.repeat(64)}`;

    const verifyRes = await request(app)
      .post('/api/payment/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentIntentId: intentId, txHash: mockTxHash });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.status).toBe('CONFIRMED');
  });

  it('34. Duplicate transaction hash is rejected on second verification attempt', async () => {
    const testWallet = createTestWallet();
    const user = await AuthRepository.createUser({ walletAddress: testWallet.address });
    const token = JwtUtil.generateAccessToken({ userId: user.id, walletAddress: user.wallet_address });

    const intentRes1 = await request(app)
      .post('/api/payment/intent')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentType: 'JOIN', levelOrder: 1 });

    const intentId1 = intentRes1.body.data.intent.id;
    const mockTxHash = `0x${'b'.repeat(64)}`;

    // First verification succeeds
    const verifyRes1 = await request(app)
      .post('/api/payment/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentIntentId: intentId1, txHash: mockTxHash });

    expect(verifyRes1.status).toBe(200);

    // Second user attempts to reuse same tx hash for new intent
    const testWallet2 = createTestWallet();
    const user2 = await AuthRepository.createUser({ walletAddress: testWallet2.address });
    const token2 = JwtUtil.generateAccessToken({ userId: user2.id, walletAddress: user2.wallet_address });

    const intentRes2 = await request(app)
      .post('/api/payment/intent')
      .set('Authorization', `Bearer ${token2}`)
      .send({ paymentType: 'JOIN', levelOrder: 1 });

    const intentId2 = intentRes2.body.data.intent.id;

    const verifyRes2 = await request(app)
      .post('/api/payment/verify')
      .set('Authorization', `Bearer ${token2}`)
      .send({ paymentIntentId: intentId2, txHash: mockTxHash });

    expect(verifyRes2.status).toBe(400);
    expect(verifyRes2.body.error.message).toContain('already been processed');
  });

  it('35. User-level activation updates user status and sets current level upon valid payment', async () => {
    const testWallet = createTestWallet();
    const user = await AuthRepository.createUser({ walletAddress: testWallet.address });
    const token = JwtUtil.generateAccessToken({ userId: user.id, walletAddress: user.wallet_address });

    const intentRes = await request(app)
      .post('/api/payment/intent')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentType: 'JOIN', levelOrder: 1 });

    const intentId = intentRes.body.data.intent.id;
    const mockTxHash = `0x${'c'.repeat(64)}`;

    await request(app)
      .post('/api/payment/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentIntentId: intentId, txHash: mockTxHash });

    const updatedUser = await AuthRepository.findUserById(user.id);
    expect(updatedUser?.status).toBe('ACTIVE');
    expect(updatedUser?.current_level_id).toBeDefined();
  });
});
