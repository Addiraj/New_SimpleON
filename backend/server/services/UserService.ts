import { UserRepository } from '../repositories/UserRepository.js';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export class UserService {
  /**
   * Helper to format short wallet address (e.g. 0x1234...5678)
   */
  private static formatShortAddress(address: string): string {
    if (!address || address.length < 10) return address || '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Get User Profile with formatted response fields
   */
  static async getProfile(userIdOrAddress: string, hostHeader?: string) {
    const user = await UserRepository.findUser(userIdOrAddress);
    if (!user) {
      throw AppError.notFound('User profile not found');
    }

    const host = hostHeader || 'simpleon.io';
    const configuredBaseUrl = env.APP_PUBLIC_URL || env.FRONTEND_URL;
    const base = configuredBaseUrl && !configuredBaseUrl.includes('localhost')
      ? configuredBaseUrl
      : `${host.includes('localhost') ? 'http' : 'https'}://${host}`;
    const referralBase = new URL(base.replace(/\/+$/, ''));
    if (referralBase.protocol === 'http:' && !referralBase.hostname.includes('localhost') && referralBase.hostname !== '127.0.0.1') {
      referralBase.protocol = 'https:';
    }
    const referralLink = `${referralBase.origin}/?ref=${encodeURIComponent(user.referral_code)}`;

    const shortAddress = this.formatShortAddress(user.wallet_address);

    return {
      id: user.id,
      userId: user.id,
      walletAddress: user.wallet_address,
      shortWalletAddress: shortAddress,
      referralCode: user.referral_code,
      referralLink: referralLink,
      displayName: user.display_name || '',
      email: user.email || '',
      currentLevel: user.current_level_id || 'Level 1',
      accountStatus: user.status,
      status: user.status,
      joiningDate: user.joined_at || user.created_at,
      joinedAt: user.joined_at || user.created_at,
      lastLoginDate: user.last_login_at || user.created_at,
      lastLoginAt: user.last_login_at || user.created_at,
    };
  }

  /**
   * Update User Profile (displayName, email only)
   */
  static async updateProfile(
    userIdOrAddress: string,
    payload: { displayName?: string; display_name?: string; email?: string },
    ipAddress?: string,
    userAgent?: string,
    hostHeader?: string
  ) {
    const user = await UserRepository.findUser(userIdOrAddress);
    if (!user) {
      throw AppError.notFound('User profile not found');
    }

    // Mass assignment prevention: explicitly select only allowed fields
    const displayName = payload.displayName !== undefined ? payload.displayName : payload.display_name;
    const email = payload.email;

    await UserRepository.updateProfile(
      user.id,
      { displayName, email },
      ipAddress,
      userAgent
    );

    return this.getProfile(user.id, hostHeader);
  }

  /**
   * Get User Preferences
   */
  static async getPreferences(userIdOrAddress: string) {
    const user = await UserRepository.findUser(userIdOrAddress);
    if (!user) {
      throw AppError.notFound('User profile not found');
    }

    const prefs = await UserRepository.getPreferences(user.id);

    return {
      id: prefs.id,
      userId: prefs.user_id,
      language: prefs.language,
      theme: prefs.theme,
      emailNotifications: prefs.email_notifications,
      inAppNotifications: prefs.in_app_notifications,
      email_notifications: prefs.email_notifications,
      in_app_notifications: prefs.in_app_notifications,
      updatedAt: prefs.updated_at,
    };
  }

  /**
   * Update User Preferences
   */
  static async updatePreferences(
    userIdOrAddress: string,
    payload: {
      language?: string;
      theme?: string;
      emailNotifications?: boolean;
      email_notifications?: boolean;
      inAppNotifications?: boolean;
      in_app_notifications?: boolean;
    },
    ipAddress?: string,
    userAgent?: string
  ) {
    const user = await UserRepository.findUser(userIdOrAddress);
    if (!user) {
      throw AppError.notFound('User profile not found');
    }

    const emailNotifs =
      payload.emailNotifications !== undefined
        ? payload.emailNotifications
        : payload.email_notifications;

    const inAppNotifs =
      payload.inAppNotifications !== undefined
        ? payload.inAppNotifications
        : payload.in_app_notifications;

    await UserRepository.updatePreferences(
      user.id,
      {
        language: payload.language,
        theme: payload.theme,
        emailNotifications: emailNotifs,
        inAppNotifications: inAppNotifs,
      },
      ipAddress,
      userAgent
    );

    return this.getPreferences(user.id);
  }

  /**
   * Get User Activity / Audit Logs
   */
  static async getActivityLogs(userIdOrAddress: string) {
    const user = await UserRepository.findUser(userIdOrAddress);
    if (!user) {
      throw AppError.notFound('User profile not found');
    }

    const logs = await UserRepository.getUserAuditLogs(user.id);
    
    // Map to frontend expected format
    return logs.map((log) => ({
      id: log.id,
      action: log.action.replace(/_/g, ' '),
      ip: log.ip_address || 'Unknown',
      time: log.created_at ? new Date(log.created_at).toISOString().replace('T', ' ').slice(0, 19) : '',
      device: log.user_agent || 'Unknown Device',
    }));
  }

  /**
   * Legacy method support for backward compatibility
   */
  static getUserProfile(address: string) {
    const user = UserRepository.findUser(address);
    if (!user) {
      throw new Error('User profile not found');
    }
    return {
      user,
      referralLink: `${(env.APP_PUBLIC_URL || env.FRONTEND_URL || 'https://simpleon.io').replace(/\/+$/, '')}/?ref=${encodeURIComponent(address)}`,
      directReferrals: [],
    };
  }

  static updateBasePlan(address: string, newBasePlan: number) {
    if (newBasePlan < 0.1 || newBasePlan > 1000) {
      throw new Error('Base plan amount must be between 0.1 and 1000 USDT');
    }
    return { address, basePlanAmount: newBasePlan };
  }
}

export default UserService;
