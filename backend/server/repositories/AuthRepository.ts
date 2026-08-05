import crypto from 'crypto';
import { prisma, isDatabaseAvailable } from '../config/database.js';
import { JwtUtil } from '../utils/jwt.util.js';
import { logger } from '../config/logger.js';
import { ReferralRepository } from './ReferralRepository.js';

export interface UserRecord {
  id: string;
  wallet_address: string;
  referral_code: string;
  sponsor_id?: string | null;
  role: 'USER' | 'ADMIN';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
  current_level_id?: string | null;
  display_name?: string | null;
  email?: string | null;
  joined_at?: Date | null;
  last_login_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AuthNonceRecord {
  id: string;
  user_id?: string | null;
  wallet_address: string;
  nonce_hash: string;
  message: string;
  expires_at: Date;
  used_at?: Date | null;
  created_at: Date;
}

export interface UserSessionRecord {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  expires_at: Date;
  revoked_at?: Date | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: Date;
  updated_at: Date;
}

// In-memory persistent fallback tables for zero-downtime execution if DB server is disconnected
const memoryUsers = new Map<string, UserRecord>();
const memoryNonces = new Map<string, AuthNonceRecord>();
const memorySessions = new Map<string, UserSessionRecord>();

// Seed root user in memory
const rootUser: UserRecord = {
  id: '00000000-0000-0000-0000-000000000000',
  wallet_address: '0x0000000000000000000000000000000000000001',
  referral_code: 'ROOT001',
  role: 'ADMIN',
  status: 'ACTIVE',
  display_name: 'Root Owner',
  joined_at: new Date(),
  last_login_at: new Date(),
  created_at: new Date(),
  updated_at: new Date(),
};
memoryUsers.set(rootUser.wallet_address, rootUser);

export class AuthRepository {
  /**
   * Save a new cryptographic auth nonce
   */
  static async createNonce(data: {
    walletAddress: string;
    nonce: string;
    message: string;
    expiresAt: Date;
    userId?: string;
  }): Promise<AuthNonceRecord> {
    const cleanAddress = data.walletAddress.toLowerCase();
    const nonceHash = JwtUtil.hashToken(data.nonce);
    const id = crypto.randomUUID();

    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      const record = await prisma.authNonce.create({
        data: {
          id,
          wallet_address: cleanAddress,
          nonce_hash: nonceHash,
          message: data.message,
          expires_at: data.expiresAt,
          user_id: data.userId || null,
        },
      });
      return record as unknown as AuthNonceRecord;
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Prisma unavailable, using in-memory AuthNonce repository');
      const record: AuthNonceRecord = {
        id,
        user_id: data.userId || null,
        wallet_address: cleanAddress,
        nonce_hash: nonceHash,
        message: data.message,
        expires_at: data.expiresAt,
        used_at: null,
        created_at: new Date(),
      };
      memoryNonces.set(id, record);
      return record;
    }
  }

  /**
   * Find a valid, unexpired, unused nonce for address
   */
  static async findValidNonce(walletAddress: string, message: string): Promise<AuthNonceRecord | null> {
    const cleanAddress = walletAddress.toLowerCase();
    const now = new Date();

    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      const record = await prisma.authNonce.findFirst({
        where: {
          wallet_address: cleanAddress,
          message: message,
          used_at: null,
          expires_at: { gt: now },
        },
        orderBy: { created_at: 'desc' },
      });
      return record as unknown as AuthNonceRecord | null;
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Prisma unavailable, searching in-memory AuthNonce repository');
      for (const record of memoryNonces.values()) {
        if (
          record.wallet_address === cleanAddress &&
          record.message === message &&
          !record.used_at &&
          record.expires_at > now
        ) {
          return record;
        }
      }
      return null;
    }
  }

  /**
   * Mark nonce as used to prevent replay attacks
   */
  static async markNonceAsUsed(nonceId: string): Promise<void> {
    const now = new Date();
    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      await prisma.authNonce.update({
        where: { id: nonceId },
        data: { used_at: now },
      });
    } catch (err: any) {
      const record = memoryNonces.get(nonceId);
      if (record) {
        record.used_at = now;
      }
    }
  }

  /**
   * Find user by wallet address
   */
  static async findUserByWalletAddress(walletAddress: string): Promise<UserRecord | null> {
    const cleanAddress = walletAddress.toLowerCase();

    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      const user = await prisma.user.findUnique({
        where: { wallet_address: cleanAddress },
      });
      return user as unknown as UserRecord | null;
    } catch (err: any) {
      return memoryUsers.get(cleanAddress) || null;
    }
  }

  /**
   * Find user by referral code or wallet address
   */
  static async findUserByWalletOrCode(term: string): Promise<UserRecord | null> {
    if (!term) return null;
    const cleanTerm = term.trim();
    const cleanAddress = cleanTerm.toLowerCase();

    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { referral_code: { equals: cleanTerm } },
            { wallet_address: { equals: cleanAddress } },
          ],
        },
      });
      return user as unknown as UserRecord | null;
    } catch (err: any) {
      for (const u of memoryUsers.values()) {
        if (
          u.wallet_address.toLowerCase() === cleanAddress ||
          u.referral_code.toLowerCase() === cleanAddress
        ) {
          return u;
        }
      }
      return null;
    }
  }

  /**
   * Find user by ID
   */
  static async findUserById(userId: string): Promise<UserRecord | null> {
    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      return user as unknown as UserRecord | null;
    } catch (err: any) {
      for (const u of memoryUsers.values()) {
        if (u.id === userId) return u;
      }
      return null;
    }
  }

  /**
   * Create new user record
   */
  static async createUser(data: { walletAddress: string; sponsorId?: string }): Promise<UserRecord> {
    const cleanAddress = data.walletAddress.toLowerCase();
    const id = crypto.randomUUID();
    const referralCode = `SO-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const now = new Date();

    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      const user = await prisma.user.create({
        data: {
          id,
          wallet_address: cleanAddress,
          referral_code: referralCode,
          sponsor_id: data.sponsorId || null,
          role: 'USER',
          status: 'PENDING',
          current_level_id: null,
          last_login_at: now,
        },
      });
      return user as unknown as UserRecord;
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Prisma unavailable, saving user to memory store');
      const user: UserRecord = {
        id,
        wallet_address: cleanAddress,
        referral_code: referralCode,
        sponsor_id: data.sponsorId || null,
        role: 'USER',
        status: 'ACTIVE',
        joined_at: now,
        last_login_at: now,
        created_at: now,
        updated_at: now,
      };
      memoryUsers.set(cleanAddress, user);
      if (data.sponsorId) {
        ReferralRepository.addMemoryRelation(data.sponsorId, id, 1);
      }
      return user;
    }
  }

  /**
   * Update user record
   */
  static async updateUser(userId: string, data: Partial<UserRecord>): Promise<UserRecord | null> {
    const now = new Date();
    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { ...data, updated_at: now },
      });
      return updated as unknown as UserRecord;
    } catch (err) {
      for (const u of memoryUsers.values()) {
        if (u.id === userId) {
          Object.assign(u, data, { updated_at: now });
          return u;
        }
      }
      return null;
    }
  }

  /**
   * Update user last login timestamp
   */
  static async updateUserLastLogin(userId: string): Promise<void> {
    const now = new Date();
    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      await prisma.user.update({
        where: { id: userId },
        data: { last_login_at: now },
      });
    } catch (err) {
      for (const u of memoryUsers.values()) {
        if (u.id === userId) {
          u.last_login_at = now;
          u.updated_at = now;
        }
      }
    }
  }

  /**
   * Create user session with hashed refresh token
   */
  static async createSession(data: {
    userId: string;
    refreshToken: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<UserSessionRecord> {
    const refreshTokenHash = JwtUtil.hashToken(data.refreshToken);
    const id = crypto.randomUUID();
    const now = new Date();

    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      const session = await prisma.userSession.create({
        data: {
          id,
          user_id: data.userId,
          refresh_token_hash: refreshTokenHash,
          expires_at: data.expiresAt,
          ip_address: data.ipAddress || null,
          user_agent: data.userAgent || null,
        },
      });
      return session as unknown as UserSessionRecord;
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Prisma unavailable, saving session to memory store');
      const session: UserSessionRecord = {
        id,
        user_id: data.userId,
        refresh_token_hash: refreshTokenHash,
        expires_at: data.expiresAt,
        revoked_at: null,
        ip_address: data.ipAddress || null,
        user_agent: data.userAgent || null,
        created_at: now,
        updated_at: now,
      };
      memorySessions.set(id, session);
      return session;
    }
  }

  /**
   * Find session by plain refresh token
   */
  static async findSessionByRefreshToken(
    refreshToken: string
  ): Promise<(UserSessionRecord & { user: UserRecord }) | null> {
    const refreshTokenHash = JwtUtil.hashToken(refreshToken);
    const now = new Date();

    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      const session = await prisma.userSession.findFirst({
        where: {
          refresh_token_hash: refreshTokenHash,
          revoked_at: null,
          expires_at: { gt: now },
        },
        include: { user: true },
      });
      if (!session) return null;
      return session as unknown as UserSessionRecord & { user: UserRecord };
    } catch (err: any) {
      for (const session of memorySessions.values()) {
        if (
          session.refresh_token_hash === refreshTokenHash &&
          !session.revoked_at &&
          session.expires_at > now
        ) {
          const user = await this.findUserById(session.user_id);
          if (user) {
            return { ...session, user };
          }
        }
      }
      return null;
    }
  }

  /**
   * Revoke a single session
   */
  static async revokeSession(sessionId: string): Promise<void> {
    const now = new Date();
    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      await prisma.userSession.update({
        where: { id: sessionId },
        data: { revoked_at: now },
      });
    } catch (err) {
      const session = memorySessions.get(sessionId);
      if (session) {
        session.revoked_at = now;
        session.updated_at = now;
      }
    }
  }

  /**
   * Revoke session by refresh token
   */
  static async revokeSessionByRefreshToken(refreshToken: string): Promise<void> {
    const refreshTokenHash = JwtUtil.hashToken(refreshToken);
    const now = new Date();

    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      await prisma.userSession.updateMany({
        where: { refresh_token_hash: refreshTokenHash, revoked_at: null },
        data: { revoked_at: now },
      });
    } catch (err) {
      for (const session of memorySessions.values()) {
        if (session.refresh_token_hash === refreshTokenHash) {
          session.revoked_at = now;
          session.updated_at = now;
        }
      }
    }
  }

  /**
   * Reset in-memory store for testing isolation
   */
  static resetMemoryStore(): void {
    memoryUsers.clear();
    memoryNonces.clear();
    memorySessions.clear();
    memoryUsers.set(rootUser.wallet_address, rootUser);
  }
}

export default AuthRepository;
