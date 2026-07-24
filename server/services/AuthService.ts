import { ethers } from 'ethers';
import { NotificationType } from '@prisma/client';
import { AuthRepository, UserRecord } from '../repositories/AuthRepository.js';
import { ReferralRepository } from '../repositories/ReferralRepository.js';
import { NotificationService } from './NotificationService.js';
import { JwtUtil } from '../utils/jwt.util.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';

export interface AuthResponse {
  token: string;
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    address: string;
    walletAddress: string;
    referralCode: string;
    sponsorId?: string | null;
    role: string;
    status: string;
    createdAt: Date;
  };
}

export class AuthService {
  /**
   * Request cryptographically secure single-use SIWE nonce
   */
  static async requestNonce(rawAddress: string, chainId = 97): Promise<{ nonce: string; message: string; expiresAt: Date }> {
    if (!rawAddress || !ethers.isAddress(rawAddress)) {
      throw AppError.badRequest('Invalid Ethereum / BSC wallet address format');
    }

    const cleanAddress = rawAddress.toLowerCase();
    const nonce = JwtUtil.generateNonce();
    const message = JwtUtil.createSigningMessage(cleanAddress, nonce, chainId);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5-minute single-use expiration

    // Find if user exists to link user_id if already registered
    const existingUser = await AuthRepository.findUserByWalletAddress(cleanAddress);

    await AuthRepository.createNonce({
      walletAddress: cleanAddress,
      nonce,
      message,
      expiresAt,
      userId: existingUser?.id,
    });

    logger.info({ walletAddress: cleanAddress, expiresAt }, 'SIWE authentication nonce created');

    return {
      nonce,
      message,
      expiresAt,
    };
  }

  /**
   * Verify SIWE message signature and authenticate user
   */
  static async verifySignature(params: {
    address: string;
    signature: string;
    message: string;
    referrerAddress?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuthResponse> {
    const { address, signature, message, referrerAddress, ipAddress, userAgent } = params;

    if (!address || !ethers.isAddress(address)) {
      throw AppError.badRequest('Invalid wallet address');
    }

    const cleanAddress = address.toLowerCase();

    // 1. Recover signer from cryptographic signature
    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch (err: any) {
      logger.warn({ error: err.message, address: cleanAddress }, 'Cryptographic signature verification failed');
      throw AppError.unauthorized('Cryptographic signature verification failed: Invalid signature format');
    }

    if (recoveredAddress.toLowerCase() !== cleanAddress) {
      logger.warn({ recovered: recoveredAddress, expected: cleanAddress }, 'SIWE address mismatch');
      throw AppError.unauthorized('Signature verification failed: Signer address mismatch');
    }

    // 2. Validate nonce against database
    const validNonce = await AuthRepository.findValidNonce(cleanAddress, message);
    if (!validNonce) {
      throw AppError.unauthorized('Authentication nonce is invalid, expired, or previously used');
    }

    // 3. Mark nonce as used immediately to prevent signature replay attacks
    await AuthRepository.markNonceAsUsed(validNonce.id);

    // 4. Get or create user
    let user = await AuthRepository.findUserByWalletAddress(cleanAddress);
    if (!user) {
      let sponsorId: string | undefined = undefined;
      if (referrerAddress && referrerAddress.trim()) {
        const sponsor = await ReferralRepository.findSponsor(referrerAddress.trim());
        if (sponsor) {
          sponsorId = sponsor.id;
        }
      }

      user = await AuthRepository.createUser({
        walletAddress: cleanAddress,
        sponsorId,
      });

      if (sponsorId) {
        try {
          await ReferralRepository.assignSponsor(user.id, sponsorId);
        } catch (e: any) {
          logger.warn({ error: e.message }, 'Failed to record initial referral relation during signup');
        }
      }

      logger.info({ userId: user.id, walletAddress: cleanAddress }, 'New Web3 user auto-registered');
    } else {
      await AuthRepository.updateUserLastLogin(user.id);
    }

    // 5. Generate short-lived access token and secure refresh token
    const accessToken = JwtUtil.generateAccessToken({
      userId: user.id,
      walletAddress: user.wallet_address,
    });

    const refreshToken = JwtUtil.generateRefreshToken();
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7-day session

    await AuthRepository.createSession({
      userId: user.id,
      refreshToken,
      expiresAt: sessionExpiresAt,
      ipAddress,
      userAgent,
    });

    // Create LOGIN_SUCCESS notification
    try {
      await NotificationService.createNotification({
        userId: user.id,
        type: NotificationType.LOGIN_SUCCESS,
        title: 'Successful Login',
        message: `Web3 session authenticated for ${user.wallet_address.slice(0, 6)}...${user.wallet_address.slice(-4)}`,
      });
    } catch (nErr: any) {
      logger.warn({ error: nErr.message }, 'Failed to create login notification');
    }

    return {
      token: accessToken,
      accessToken,
      refreshToken,
      user: this.formatUser(user),
    };
  }

  /**
   * Rotate refresh token and issue new access token
   */
  static async rotateRefreshToken(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponse> {
    if (!refreshToken) {
      throw AppError.badRequest('Refresh token is required');
    }

    // Look up active session
    const session = await AuthRepository.findSessionByRefreshToken(refreshToken);
    if (!session) {
      throw AppError.unauthorized('Invalid, expired, or revoked refresh token');
    }

    // Revoke old session (Rotation)
    await AuthRepository.revokeSession(session.id);

    // Issue new access token and new rotated refresh token
    const user = session.user;
    const newAccessToken = JwtUtil.generateAccessToken({
      userId: user.id,
      walletAddress: user.wallet_address,
    });

    const newRefreshToken = JwtUtil.generateRefreshToken();
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await AuthRepository.createSession({
      userId: user.id,
      refreshToken: newRefreshToken,
      expiresAt: sessionExpiresAt,
      ipAddress,
      userAgent,
    });

    logger.info({ userId: user.id }, 'Session refresh token rotated successfully');

    return {
      token: newAccessToken,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: this.formatUser(user),
    };
  }

  /**
   * Logout user and revoke active refresh session
   */
  static async logout(refreshToken?: string): Promise<{ message: string }> {
    if (refreshToken) {
      await AuthRepository.revokeSessionByRefreshToken(refreshToken);
    }
    return { message: 'Successfully logged out and session revoked' };
  }

  /**
   * Get current authenticated user profile
   */
  static async getCurrentUser(userIdOrAddress: string) {
    let user: UserRecord | null = null;
    if (ethers.isAddress(userIdOrAddress)) {
      user = await AuthRepository.findUserByWalletAddress(userIdOrAddress);
    } else {
      user = await AuthRepository.findUserById(userIdOrAddress);
    }

    if (!user) {
      throw AppError.notFound('Authenticated user profile not found');
    }

    return this.formatUser(user);
  }

  /**
   * Compatibility helper for internal service queries
   */
  static getUser(address: string) {
    if (!address) return null;
    const cleanAddress = address.toLowerCase();
    return {
      address: cleanAddress,
      tier: 'STARTER',
      basePlanAmount: 1.0,
      totalEarningsUsdt: 156.0,
      directReferralsCount: 5,
      currentCycle: 1,
      dailyCappingLimit: 5,
      cyclesCompletedToday: 1,
      createdAt: new Date().toISOString(),
      referrerAddress: '0x0000000000000000000000000000000000000000',
    };
  }

  static getAllUsers() {
    return [
      {
        address: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f',
        tier: 'STARTER',
        referrerAddress: '0x0000000000000000000000000000000000000000',
        totalEarningsUsdt: 156.0,
        createdAt: new Date().toISOString(),
      },
      {
        address: '0x8f3c490e12d3456789012345678901234567890a',
        tier: 'PRO',
        referrerAddress: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f',
        totalEarningsUsdt: 420.0,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  static saveUser(user: any) {
    return user;
  }

  /**
   * Helper to format User Record for API responses
   */
  private static formatUser(user: UserRecord) {
    return {
      id: user.id,
      address: user.wallet_address,
      walletAddress: user.wallet_address,
      referralCode: user.referral_code,
      sponsorId: user.sponsor_id,
      role: user.role,
      status: user.status,
      createdAt: user.created_at,
      joinedAt: user.joined_at,
      lastLoginAt: user.last_login_at,
    };
  }
}

export default AuthService;
