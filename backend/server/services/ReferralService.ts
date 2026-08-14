import { ReferralRepository } from '../repositories/ReferralRepository.js';
import { AuthRepository } from '../repositories/AuthRepository.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

const normalizeReferralInput = (value: string) => value.trim().toUpperCase();

const shortWallet = (walletAddress: string) => `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

const isLocalhost = (host: string) =>
  host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]');

function buildPublicReferralUrl(referralCode: string, host = 'simpleon.io', protocol = 'https') {
  const configuredUrl = env.APP_PUBLIC_URL || env.FRONTEND_URL;
  const base = configuredUrl && !configuredUrl.includes('localhost')
    ? configuredUrl
    : `${protocol}://${host}`;

  const url = new URL(base.replace(/\/+$/, ''));
  if (url.protocol === 'http:' && !isLocalhost(url.host)) {
    url.protocol = 'https:';
  }

  return `${url.origin}/?ref=${encodeURIComponent(referralCode)}`;
}

export class ReferralService {
  /**
   * Validate a referral code or sponsor wallet address
   */
  static async validateReferralCode(
    referralCode: string,
    currentUserId?: string,
    currentUserAddress?: string
  ) {
    if (!referralCode || !referralCode.trim()) {
      throw AppError.badRequest('Referral code is required');
    }

    const normalizedCode = normalizeReferralInput(referralCode);
    const sponsor = await ReferralRepository.findSponsor(normalizedCode);
    if (!sponsor) {
      return {
        valid: false,
        status: 'invalid_referral',
        relationshipStatus: 'invalid_referral',
        message: 'Invalid referral code or sponsor not found',
        sponsor: null,
      };
    }

    const sponsorPayload = {
      id: sponsor.id,
      walletAddress: sponsor.wallet_address,
      shortWalletAddress: shortWallet(sponsor.wallet_address),
      referralCode: sponsor.referral_code,
      displayName: sponsor.display_name || null,
      status: sponsor.status || 'ACTIVE',
    };

    if (sponsor.status && sponsor.status !== 'ACTIVE') {
      return {
        valid: false,
        status: 'inactive_sponsor',
        relationshipStatus: 'inactive_sponsor',
        message: 'This sponsor is currently unavailable for new referrals.',
        sponsor: sponsorPayload,
      };
    }

    // Check self-referral
    if (
      (currentUserId && sponsor.id === currentUserId) ||
      (currentUserAddress && sponsor.wallet_address.toLowerCase() === currentUserAddress.toLowerCase())
    ) {
      return {
        valid: false,
        status: 'self_referral',
        relationshipStatus: 'self_referral',
        message: 'You cannot use your own referral link.',
        sponsor: sponsorPayload,
      };
    }

    let relationshipStatus = 'no_existing_upline';
    if (currentUserId) {
      const currentUser = await AuthRepository.findUserById(currentUserId);
      const sponsorRelationDepth = await ReferralRepository.getRelationDepth(sponsor.id, currentUserId);
      const wouldLoopDepth = await ReferralRepository.getRelationDepth(currentUserId, sponsor.id);

      if (wouldLoopDepth !== null) {
        relationshipStatus = 'referral_loop';
      } else if (sponsorRelationDepth === 1 || currentUser?.sponsor_id === sponsor.id) {
        relationshipStatus = 'already_assigned_same_sponsor';
      } else if (sponsorRelationDepth && sponsorRelationDepth > 1) {
        relationshipStatus = 'already_in_downline';
      } else if (currentUser?.sponsor_id && currentUser.sponsor_id !== sponsor.id) {
        relationshipStatus = 'already_assigned_different_sponsor';
      }
    }

    return {
      valid: true,
      status: relationshipStatus,
      relationshipStatus,
      message: 'Sponsor verified successfully',
      sponsor: sponsorPayload,
    };
  }

  /**
   * Assign sponsor to user with full validations
   */
  static async assignSponsor(userId: string, codeOrAddress: string) {
    if (!userId) {
      throw AppError.unauthorized('Authentication required');
    }

    if (!codeOrAddress || !codeOrAddress.trim()) {
      throw AppError.badRequest('Referral code or sponsor address is required');
    }

    const user = await AuthRepository.findUserById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const sponsor = await ReferralRepository.findSponsor(normalizeReferralInput(codeOrAddress));
    if (!sponsor) {
      return {
        status: 'invalid_referral',
        message: 'This referral link is invalid or no longer available.',
      };
    }

    if (sponsor.status && sponsor.status !== 'ACTIVE') {
      return {
        status: 'inactive_sponsor',
        message: 'This sponsor is currently unavailable for new referrals.',
      };
    }

    // Rule: Prevent sponsor changes after sponsor is set to a DIFFERENT sponsor
    if (user.sponsor_id && user.sponsor_id !== sponsor.id) {
      return {
        status: 'already_assigned_different_sponsor',
        message: 'Your account is already linked to another sponsor. For referral-tree integrity, your existing sponsor cannot be changed.',
      };
    }

    // Rule: Prevent self-referral
    if (sponsor.id === userId || sponsor.wallet_address.toLowerCase() === user.wallet_address.toLowerCase()) {
      return {
        status: 'self_referral',
        message: 'You cannot use your own referral link.',
      };
    }

    // Rule: Prevent duplicate relationship
    const sponsorRelationDepth = await ReferralRepository.getRelationDepth(sponsor.id, userId);
    if (sponsorRelationDepth === 1 || user.sponsor_id === sponsor.id) {
      return {
        status: 'already_assigned_same_sponsor',
        message: 'You are already directly referred by this sponsor. Your current referral relationship remains unchanged.',
      };
    }
    if (sponsorRelationDepth && sponsorRelationDepth > 1) {
      return {
        status: 'already_in_downline',
        message: 'You are already part of this sponsor\'s referral network. A duplicate direct referral relationship cannot be created.',
      };
    }

    const wouldLoopDepth = await ReferralRepository.getRelationDepth(userId, sponsor.id);
    if (wouldLoopDepth !== null) {
      return {
        status: 'referral_loop',
        message: 'This referral relationship cannot be created because it would form an invalid referral loop.',
      };
    }

    const result = await ReferralRepository.assignSponsor(userId, sponsor.id);

    logger.info(
      { userId, sponsorId: sponsor.id, relationsCreated: result.totalRelationsCreated },
      'Sponsor assigned and referral network updated'
    );

    return {
      status: 'assigned',
      message: 'Direct referral relationship created successfully.',
      sponsorId: sponsor.id,
      sponsorWallet: sponsor.wallet_address,
      sponsorReferralCode: sponsor.referral_code,
      relationsCreated: result.totalRelationsCreated,
      relationship: {
        type: 'direct',
        sponsorUserId: sponsor.id,
        referredUserId: userId,
      },
    };
  }

  /**
   * Get Referral Summary
   */
  static async getSummary(userId: string, host?: string, protocol?: string, tierCode?: string) {
    if (!userId) {
      throw AppError.unauthorized('Authentication required');
    }
    const summary = await ReferralRepository.getSummary(userId, host, protocol, tierCode);
    return {
      ...summary,
      referralUrl: buildPublicReferralUrl(summary.referralCode, host, protocol),
    };
  }

  /**
   * Get Direct Referrals List (Paginated)
   */
  static async getDirectReferrals(
    userId: string,
    options: { page?: number; limit?: number; search?: string; tierCode?: string }
  ) {
    if (!userId) {
      throw AppError.unauthorized('Authentication required');
    }
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 10;
    return ReferralRepository.getDirectReferrals(userId, {
      page,
      limit,
      search: options.search,
      tierCode: options.tierCode,
    });
  }

  /**
   * Get Network Tree
   */
  static async getReferralTree(userId: string, options: { maxDepth?: number; search?: string; tierCode?: string }) {
    if (!userId) {
      throw AppError.unauthorized('Authentication required');
    }
    const maxDepth = Math.min(13, Math.max(1, Number(options.maxDepth) || 5));
    return ReferralRepository.getReferralTree(userId, maxDepth, options.search, options.tierCode);
  }

  /**
   * Get Referral Link & Code
   */
  static async getReferralLink(userId: string, host = 'simpleon.io', protocol = 'https') {
    if (!userId) {
      throw AppError.unauthorized('Authentication required');
    }

    const user = await AuthRepository.findUserById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const referralCode = user.referral_code || `SO-${userId.substring(0, 8).toUpperCase()}`;
    const referralUrl = buildPublicReferralUrl(referralCode, host, protocol);

    return {
      referralCode,
      referralUrl,
    };
  }
}

export default ReferralService;
