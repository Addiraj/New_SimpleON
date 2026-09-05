import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server/app.js';
import { AuthRepository } from '../../server/repositories/AuthRepository.js';
import { ReferralRepository } from '../../server/repositories/ReferralRepository.js';
import { JwtUtil } from '../../server/utils/jwt.util.js';
import { createTestWallet, resetAllTestStores } from '../helpers/testUtils.js';

import { prisma } from '../../server/config/database.js';
import { seedFullLadder } from '../helpers/testUtils.js';

describe('17-22. Referral & Sponsor Tree Unit Tests', () => {
  let starterLevelId: string;

  beforeEach(async () => {
    resetAllTestStores();
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE daily_cappings, daily_earnings, wallet_ledgers, transactions, matrix_cycles, referral_relations, users, level_configurations CASCADE;`);
    await seedFullLadder(prisma);
    const starterConfig = await prisma.levelConfiguration.findFirst({ where: { slug: 'starter' } });
    starterLevelId = starterConfig!.id;
  });

  it('17. Referral-code generation creates unique code for user', async () => {
    const testWallet = createTestWallet();
    const user = await AuthRepository.createUser({ walletAddress: testWallet.address });
    expect(user.referral_code).toMatch(/^SO-[A-Z0-9]+$/);
  });

  it('18. Sponsor validation verifies existence of valid sponsor by wallet or referral code', async () => {
    const sponsorWallet = createTestWallet();
    const sponsor = await prisma.user.create({
      data: {
        wallet_address: sponsorWallet.address.toLowerCase(),
        referral_code: `SO-SPONSOR18`,
        current_level_id: starterLevelId,
        status: 'ACTIVE',
      },
    });

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
    const user = await prisma.user.create({
      data: {
        wallet_address: testWallet.address.toLowerCase(),
        referral_code: `SO-SELF19`,
        current_level_id: starterLevelId,
        status: 'ACTIVE',
      },
    });
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
    const sponsor = await prisma.user.create({
      data: {
        wallet_address: sponsorWallet.address.toLowerCase(),
        referral_code: `SO-SPONSOR20A`,
        current_level_id: starterLevelId,
        status: 'ACTIVE',
      },
    });

    const memberWallet = createTestWallet();
    const member = await prisma.user.create({
      data: {
        wallet_address: memberWallet.address.toLowerCase(),
        referral_code: `SO-MEMBER20`,
        sponsor_id: sponsor.id,
        current_level_id: starterLevelId,
        status: 'ACTIVE',
      },
    });
    const memberToken = JwtUtil.generateAccessToken({ userId: member.id, walletAddress: member.wallet_address });

    const otherSponsorWallet = createTestWallet();
    const otherSponsor = await prisma.user.create({
      data: {
        wallet_address: otherSponsorWallet.address.toLowerCase(),
        referral_code: `SO-SPONSOR20B`,
        current_level_id: starterLevelId,
        status: 'ACTIVE',
      },
    });

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
    const sponsor = await prisma.user.create({
      data: {
        wallet_address: sponsorWallet.address.toLowerCase(),
        referral_code: `SO-SPONSOR21`,
        current_level_id: starterLevelId,
        status: 'ACTIVE',
      },
    });
    const sponsorToken = JwtUtil.generateAccessToken({ userId: sponsor.id, walletAddress: sponsor.wallet_address });

    const member1 = createTestWallet();
    const member2 = createTestWallet();
    const u1 = await prisma.user.create({
      data: {
        wallet_address: member1.address.toLowerCase(),
        referral_code: `SO-U1_21`,
        sponsor_id: sponsor.id,
        current_level_id: starterLevelId,
        status: 'ACTIVE',
      },
    });
    const u2 = await prisma.user.create({
      data: {
        wallet_address: member2.address.toLowerCase(),
        referral_code: `SO-U2_21`,
        sponsor_id: sponsor.id,
        current_level_id: starterLevelId,
        status: 'ACTIVE',
      },
    });

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
    const sponsor = await prisma.user.create({
      data: {
        wallet_address: sponsorWallet.address.toLowerCase(),
        referral_code: `SO-SPONSOR22`,
        current_level_id: starterLevelId,
        status: 'ACTIVE',
      },
    });
    const sponsorToken = JwtUtil.generateAccessToken({ userId: sponsor.id, walletAddress: sponsor.wallet_address });

    const res = await request(app)
      .get('/api/referral/tree')
      .set('Authorization', `Bearer ${sponsorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.root).toBeDefined();
  });
});
