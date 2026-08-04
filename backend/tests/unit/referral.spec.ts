import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server/app.js';
import { AuthRepository } from '../../server/repositories/AuthRepository.js';
import { ReferralRepository } from '../../server/repositories/ReferralRepository.js';
import { JwtUtil } from '../../server/utils/jwt.util.js';
import { createTestWallet, resetAllTestStores } from '../helpers/testUtils.js';

describe('17-22. Referral & Sponsor Tree Unit Tests', () => {
  beforeEach(() => {
    resetAllTestStores();
  });

  it('17. Referral-code generation creates unique code for user', async () => {
    const testWallet = createTestWallet();
    const user = await AuthRepository.createUser({ walletAddress: testWallet.address });
    expect(user.referral_code).toMatch(/^SO-[A-Z0-9]+$/);
  });

  it('18. Sponsor validation verifies existence of valid sponsor by wallet or referral code', async () => {
    const sponsorWallet = createTestWallet();
    const sponsor = await AuthRepository.createUser({ walletAddress: sponsorWallet.address });

    // Validate by wallet address
    const resAddr = await request(app)
      .get(`/api/referral/validate-sponsor?sponsor=${sponsorWallet.address}`);
    expect(resAddr.status).toBe(200);
    expect(resAddr.body.data.valid).toBe(true);

    // Validate by referral code
    const resCode = await request(app)
      .get(`/api/referral/validate-sponsor?sponsor=${sponsor.referral_code}`);
    expect(resCode.status).toBe(200);
    expect(resCode.body.data.valid).toBe(true);

    // Validate non-existent sponsor
    const resInvalid = await request(app)
      .get('/api/referral/validate-sponsor?sponsor=0x0000000000000000000000000000000000000000');
    expect(resInvalid.status).toBe(200);
    expect(resInvalid.body.data.valid).toBe(false);
  });

  it('19. Self-referral prevention rejects user assigning themselves as sponsor', async () => {
    const testWallet = createTestWallet();
    const user = await AuthRepository.createUser({ walletAddress: testWallet.address });
    const token = JwtUtil.generateAccessToken({ userId: user.id, walletAddress: user.wallet_address });

    const res = await request(app)
      .post('/api/referral/assign-sponsor')
      .set('Authorization', `Bearer ${token}`)
      .send({ sponsor: testWallet.address });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('self_referral');
    expect(res.body.data.message).toContain('own referral link');
  });

  it('20. Duplicate sponsor assignment prevents reassigning an existing sponsor', async () => {
    const sponsorWallet = createTestWallet();
    const sponsor = await AuthRepository.createUser({ walletAddress: sponsorWallet.address });

    const memberWallet = createTestWallet();
    const member = await AuthRepository.createUser({ walletAddress: memberWallet.address, sponsorId: sponsor.id });
    const memberToken = JwtUtil.generateAccessToken({ userId: member.id, walletAddress: member.wallet_address });

    const otherSponsorWallet = createTestWallet();
    const otherSponsor = await AuthRepository.createUser({ walletAddress: otherSponsorWallet.address });

    const res = await request(app)
      .post('/api/referral/assign-sponsor')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ sponsor: otherSponsorWallet.address });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('already_assigned_different_sponsor');
    expect(res.body.data.message).toContain('already linked to another sponsor');
  });

  it('21. Direct referrals endpoint lists all directly sponsored users', async () => {
    const sponsorWallet = createTestWallet();
    const sponsor = await AuthRepository.createUser({ walletAddress: sponsorWallet.address });
    const sponsorToken = JwtUtil.generateAccessToken({ userId: sponsor.id, walletAddress: sponsor.wallet_address });

    const member1 = createTestWallet();
    const member2 = createTestWallet();
    const u1 = await AuthRepository.createUser({ walletAddress: member1.address, sponsorId: sponsor.id });
    const u2 = await AuthRepository.createUser({ walletAddress: member2.address, sponsorId: sponsor.id });

    await ReferralRepository.assignSponsor(u1.id, sponsor.id);
    await ReferralRepository.assignSponsor(u2.id, sponsor.id);

    const res = await request(app)
      .get('/api/referral/directs')
      .set('Authorization', `Bearer ${sponsorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.directs).toBeDefined();
    expect(res.body.data.directs.length).toBeGreaterThanOrEqual(2);
  });

  it('22. Referral tree endpoint returns hierarchical downline structure', async () => {
    const sponsorWallet = createTestWallet();
    const sponsor = await AuthRepository.createUser({ walletAddress: sponsorWallet.address });
    const sponsorToken = JwtUtil.generateAccessToken({ userId: sponsor.id, walletAddress: sponsor.wallet_address });

    const res = await request(app)
      .get('/api/referral/tree')
      .set('Authorization', `Bearer ${sponsorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.root).toBeDefined();
  });
});
