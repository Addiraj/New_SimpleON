import { prisma, isDatabaseAvailable } from '../config/database.js';
import { AuthRepository, UserRecord } from './AuthRepository.js';
import { logger } from '../config/logger.js';

export interface ReferralRelationRecord {
  id: string;
  sponsor_user_id: string;
  referred_user_id: string;
  depth: number;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  created_at: Date;
}

export interface TeamMemberInfo {
  id: string;
  walletAddress: string;
  shortWalletAddress: string;
  referralCode: string;
  displayName: string | null;
  level: string;
  status: string;
  joiningDate: string;
  depth: number;
  directsCount: number;
  volumeGenerated?: number;
  children?: TeamMemberInfo[];
}

// In-memory persistent fallback store for zero-downtime execution if DB server is disconnected
const memoryReferralRelations: ReferralRelationRecord[] = [
  // Seed sample relations if memory mode is active
  {
    id: 'rel-1',
    sponsor_user_id: '00000000-0000-0000-0000-000000000000',
    referred_user_id: 'member-1',
    depth: 1,
    status: 'ACTIVE',
    created_at: new Date('2026-02-01'),
  },
  {
    id: 'rel-2',
    sponsor_user_id: '00000000-0000-0000-0000-000000000000',
    referred_user_id: 'member-2',
    depth: 1,
    status: 'ACTIVE',
    created_at: new Date('2026-02-05'),
  },
];

import { AppError } from '../utils/AppError.js';

export class ReferralRepository {
  /**
   * Helper to manually add memory referral relation synchronously
   */
  static addMemoryRelation(sponsorUserId: string, referredUserId: string, depth = 1) {
    if (!memoryReferralRelations.some((r) => r.sponsor_user_id === sponsorUserId && r.referred_user_id === referredUserId)) {
      memoryReferralRelations.push({
        id: `rel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sponsor_user_id: sponsorUserId,
        referred_user_id: referredUserId,
        depth,
        status: 'ACTIVE',
        created_at: new Date(),
      });
    }
  }
  /**
   * Find direct referrals by sponsor user ID
   */
  static async findReferralsBySponsorId(sponsorUserId: string): Promise<{ referred_user_id: string }[]> {
    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      const rels = await prisma.referralRelation.findMany({
        where: { sponsor_user_id: sponsorUserId, depth: 1 },
        select: { referred_user_id: true },
      });
      return rels;
    } catch (err) {
      const list: { referred_user_id: string }[] = [];
      for (const rel of memoryReferralRelations) {
        if (rel.sponsor_user_id === sponsorUserId && rel.depth === 1) {
          list.push({ referred_user_id: rel.referred_user_id });
        }
      }
      return list;
    }
  }

  /**
   * Find sponsor user by referral code or wallet address
   */
  static async findSponsor(codeOrAddress: string): Promise<UserRecord | null> {
    if (!codeOrAddress) return null;

    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      const cleanTerm = codeOrAddress.trim().toLowerCase();
      const cleanCode = codeOrAddress.trim();
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { referral_code: { equals: cleanCode, mode: 'insensitive' } },
            { wallet_address: { equals: cleanTerm } },
          ],
        } as any,
      });

      return user as unknown as UserRecord | null;
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Prisma unavailable, searching sponsor in AuthRepository memory store');
      return await AuthRepository.findUserByWalletOrCode(codeOrAddress);
    }
  }

  /**
   * Check if a direct or indirect referral relation already exists
   */
  static async hasRelation(sponsorUserId: string, referredUserId: string): Promise<boolean> {
    try {
      const count = await prisma.referralRelation.count({
        where: {
          sponsor_user_id: sponsorUserId,
          referred_user_id: referredUserId,
        },
      });
      return count > 0;
    } catch (err) {
      return memoryReferralRelations.some(
        (r) => r.sponsor_user_id === sponsorUserId && r.referred_user_id === referredUserId
      );
    }
  }

  static async getRelationDepth(sponsorUserId: string, referredUserId: string): Promise<number | null> {
    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      const rel = await prisma.referralRelation.findFirst({
        where: {
          sponsor_user_id: sponsorUserId,
          referred_user_id: referredUserId,
          status: 'ACTIVE',
        },
        select: { depth: true },
        orderBy: { depth: 'asc' },
      });
      return rel?.depth ?? null;
    } catch {
      const rel = memoryReferralRelations
        .filter((r) => r.sponsor_user_id === sponsorUserId && r.referred_user_id === referredUserId && r.status === 'ACTIVE')
        .sort((a, b) => a.depth - b.depth)[0];
      return rel?.depth ?? null;
    }
  }

  /**
   * Assign sponsor to user and establish direct & indirect referral relations
   */
  static async assignSponsor(
    userId: string,
    sponsorUserId: string,
    maxDepth = 13
  ): Promise<{ directRelation: ReferralRelationRecord; totalRelationsCreated: number }> {
    const user = await AuthRepository.findUserById(userId);
    if (!user) throw AppError.notFound('Referred user not found');

    const sponsor = await AuthRepository.findUserById(sponsorUserId);
    if (!sponsor) throw AppError.notFound('Sponsor user not found');

    if (userId === sponsorUserId || user.wallet_address.toLowerCase() === sponsor.wallet_address.toLowerCase()) {
      throw AppError.badRequest('Self-referral: You cannot refer yourself');
    }

    if (user.sponsor_id && user.sponsor_id !== sponsorUserId) {
      throw AppError.badRequest('User already has an assigned sponsor relationship and cannot be changed');
    }

    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');

      const txResult = await prisma.$transaction(async (tx) => {
        const lockedUser = await tx.user.findUnique({ where: { id: userId } });
        const lockedSponsor = await tx.user.findUnique({ where: { id: sponsorUserId } });

        if (!lockedUser) throw AppError.notFound('Referred user not found');
        if (!lockedSponsor) throw AppError.notFound('Sponsor user not found');
        if (lockedUser.id === lockedSponsor.id || lockedUser.wallet_address.toLowerCase() === lockedSponsor.wallet_address.toLowerCase()) {
          throw AppError.badRequest('Self-referral: You cannot refer yourself');
        }
        if (lockedUser.sponsor_id && lockedUser.sponsor_id !== sponsorUserId) {
          throw AppError.badRequest('User already has an assigned sponsor relationship and cannot be changed');
        }

        const cycleRelation = await tx.referralRelation.findFirst({
          where: {
            sponsor_user_id: userId,
            referred_user_id: sponsorUserId,
            status: 'ACTIVE',
          },
        });
        if (cycleRelation) {
          throw AppError.badRequest('Referral relationship cannot be created because it would form a loop');
        }

        if (!lockedUser.sponsor_id) {
          const updateResult = await tx.user.updateMany({
            where: { id: userId, sponsor_id: null },
            data: { sponsor_id: sponsorUserId },
          });
          if (updateResult.count !== 1) {
            throw AppError.conflict('User already has an assigned sponsor relationship and cannot be changed');
          }
        }

        const directId = `rel-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const directRelation = await tx.referralRelation.upsert({
          where: {
            sponsor_user_id_referred_user_id: {
              sponsor_user_id: sponsorUserId,
              referred_user_id: userId,
            },
          },
          create: {
            id: directId,
            sponsor_user_id: sponsorUserId,
            referred_user_id: userId,
            depth: 1,
            status: 'ACTIVE',
          },
          update: { status: 'ACTIVE', depth: 1 },
        });

        let relationsCreated = 1;
        let currentSponsorId = lockedSponsor.sponsor_id;
        let currentDepth = 2;

        while (currentSponsorId && currentDepth <= maxDepth) {
          if (currentSponsorId === userId) {
            throw AppError.badRequest('Referral relationship cannot be created because it would form a loop');
          }

          const ancestorId = currentSponsorId;
          const relId = `rel-${Date.now()}-d${currentDepth}-${Math.random().toString(36).substr(2, 4)}`;

          await tx.referralRelation.upsert({
            where: {
              sponsor_user_id_referred_user_id: {
                sponsor_user_id: ancestorId,
                referred_user_id: userId,
              },
            },
            create: {
              id: relId,
              sponsor_user_id: ancestorId,
              referred_user_id: userId,
              depth: currentDepth,
              status: 'ACTIVE',
            },
            update: { status: 'ACTIVE', depth: currentDepth },
          });
          relationsCreated++;

          const nextAncestor = await tx.user.findUnique({
            where: { id: ancestorId },
            select: { sponsor_id: true },
          });
          currentSponsorId = nextAncestor?.sponsor_id || null;
          currentDepth++;
        }

        return {
          directRelation: directRelation as unknown as ReferralRelationRecord,
          totalRelationsCreated: relationsCreated,
        };
      });

      return txResult;
    } catch (err) {
      if (err instanceof AppError) throw err;
      user.sponsor_id = sponsorUserId;
    }

    // 1. Create Direct Relation (Depth 1)
    let directRelation: ReferralRelationRecord;
    let relationsCreated = 0;

    const directId = `rel-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      const rel = await prisma.referralRelation.upsert({
        where: {
          sponsor_user_id_referred_user_id: {
            sponsor_user_id: sponsorUserId,
            referred_user_id: userId,
          },
        },
        create: {
          id: directId,
          sponsor_user_id: sponsorUserId,
          referred_user_id: userId,
          depth: 1,
          status: 'ACTIVE',
        },
        update: {
          status: 'ACTIVE',
        },
      });
      directRelation = rel as unknown as ReferralRelationRecord;
      relationsCreated++;
    } catch (err) {
      directRelation = {
        id: directId,
        sponsor_user_id: sponsorUserId,
        referred_user_id: userId,
        depth: 1,
        status: 'ACTIVE',
        created_at: new Date(),
      };
      if (!memoryReferralRelations.some((r) => r.sponsor_user_id === sponsorUserId && r.referred_user_id === userId)) {
        memoryReferralRelations.push(directRelation);
      }
      relationsCreated++;
    }

    // 2. Recursively trace sponsor chain to store indirect referral relations (Depth 2 to maxDepth)
    let currentSponsorId = sponsor.sponsor_id;
    let currentDepth = 2;

    while (currentSponsorId && currentDepth <= maxDepth) {
      if (currentSponsorId === userId) break; // prevent cycle loop

      const ancestorId = currentSponsorId;
      const relId = `rel-${Date.now()}-d${currentDepth}-${Math.random().toString(36).substr(2, 4)}`;

      try {
        if (!(await isDatabaseAvailable())) throw new Error('Database offline');
        await prisma.referralRelation.upsert({
          where: {
            sponsor_user_id_referred_user_id: {
              sponsor_user_id: ancestorId,
              referred_user_id: userId,
            },
          },
          create: {
            id: relId,
            sponsor_user_id: ancestorId,
            referred_user_id: userId,
            depth: currentDepth,
            status: 'ACTIVE',
          },
          update: { status: 'ACTIVE' },
        });
        relationsCreated++;
      } catch (err) {
        if (!memoryReferralRelations.some((r) => r.sponsor_user_id === ancestorId && r.referred_user_id === userId)) {
          memoryReferralRelations.push({
            id: relId,
            sponsor_user_id: ancestorId,
            referred_user_id: userId,
            depth: currentDepth,
            status: 'ACTIVE',
            created_at: new Date(),
          });
        }
        relationsCreated++;
      }

      // Fetch next sponsor up the chain
      const nextAncestor = await AuthRepository.findUserById(ancestorId);
      currentSponsorId = nextAncestor ? nextAncestor.sponsor_id : null;
      currentDepth++;
    }

    return { directRelation, totalRelationsCreated: relationsCreated };
  }

  /**
   * Get Referral Summary metrics for a user
   */
  static async getSummary(userId: string, reqHost = 'simpleon.io', reqProtocol = 'https') {
    const user = await AuthRepository.findUserById(userId);
    if (!user) throw new Error('User not found');

    const referralCode = user.referral_code || `SO-${userId.substring(0, 8).toUpperCase()}`;
    const referralUrl = `${reqProtocol}://${reqHost}/?ref=${referralCode}`;

    let directCount = 0;
    let indirectCount = 0;
    let totalCount = 0;
    let qualifiedBuilders = 0;
    let recentMembers: TeamMemberInfo[] = [];

    try {
      directCount = await prisma.referralRelation.count({
        where: { sponsor_user_id: userId, depth: 1 },
      });

      indirectCount = await prisma.referralRelation.count({
        where: { sponsor_user_id: userId, depth: { gt: 1 } },
      });

      totalCount = directCount + indirectCount;

      // Qualified builders: members with status = ACTIVE or who have direct referrals
      qualifiedBuilders = await prisma.referralRelation.count({
        where: {
          sponsor_user_id: userId,
          referred: { status: 'ACTIVE' },
        },
      });

      // Recent members
      const recentRels = await prisma.referralRelation.findMany({
        where: { sponsor_user_id: userId },
        take: 5,
        orderBy: { created_at: 'desc' },
        include: {
          referred: {
            select: {
              id: true,
              wallet_address: true,
              referral_code: true,
              display_name: true,
              status: true,
              created_at: true,
              joined_at: true,
            },
          },
        },
      });

      recentMembers = recentRels.map((r) => {
        const addr = r.referred.wallet_address;
        const shortAddr = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
        return {
          id: r.referred.id,
          walletAddress: addr,
          shortWalletAddress: shortAddr,
          referralCode: r.referred.referral_code,
          displayName: r.referred.display_name || null,
          level: r.depth === 1 ? 'Direct Partner' : `Tier ${r.depth}`,
          status: r.referred.status || 'ACTIVE',
          joiningDate: (r.referred.joined_at || r.referred.created_at || new Date()).toISOString(),
          depth: r.depth,
          directsCount: 0,
        };
      });
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Prisma unavailable, calculating summary from memory relations');
      const userRels = memoryReferralRelations.filter((r) => r.sponsor_user_id === userId);
      directCount = userRels.filter((r) => r.depth === 1).length;
      indirectCount = userRels.filter((r) => r.depth > 1).length;
      totalCount = userRels.length;
      qualifiedBuilders = userRels.filter((r) => r.status === 'ACTIVE').length;
      
      const sortedRels = [...userRels].sort((a, b) => b.created_at.getTime() - a.created_at.getTime()).slice(0, 5);
      
      recentMembers = await Promise.all(sortedRels.map(async (r) => {
        const u = await AuthRepository.findUserById(r.referred_user_id);
        const addr = u ? u.wallet_address : '0x0000000000000000000000000000000000000000';
        const shortAddr = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
        return {
          id: r.referred_user_id,
          walletAddress: addr,
          shortWalletAddress: shortAddr,
          referralCode: u ? u.referral_code : 'UNKNOWN',
          displayName: u?.display_name || null,
          level: r.depth === 1 ? 'Direct Partner' : `Tier ${r.depth}`,
          status: u?.status || 'ACTIVE',
          joiningDate: (u?.joined_at || u?.created_at || new Date()).toISOString(),
          depth: r.depth,
          directsCount: 0,
        };
      }));
    }

    let sponsorInfo: any = null;
    if (user.sponsor_id) {
      const sponsor = await AuthRepository.findUserById(user.sponsor_id);
      if (sponsor) {
        sponsorInfo = {
          id: sponsor.id,
          walletAddress: sponsor.wallet_address,
          shortWalletAddress: `${sponsor.wallet_address.slice(0, 6)}...${sponsor.wallet_address.slice(-4)}`,
          referralCode: sponsor.referral_code,
        };
      }
    }

    return {
      referralCode,
      referralUrl,
      sponsor: sponsorInfo,
      directReferralCount: directCount,
      indirectReferralCount: indirectCount,
      totalTeamCount: totalCount,
      qualifiedBuilders,
      recentlyJoinedMembers: recentMembers,
    };
  }

  /**
   * Get Paginated Direct Referrals (depth = 1)
   */
  static async getDirectReferrals(
    userId: string,
    options: { page: number; limit: number; search?: string }
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;
    const search = options.search?.trim();

    let members: TeamMemberInfo[] = [];
    let total = 0;

    try {
      if (!(await isDatabaseAvailable())) throw new Error('Database offline');
      const whereCondition: any = {
        sponsor_user_id: userId,
        depth: 1,
      };

      if (search) {
        whereCondition.referred = {
          OR: [
            { wallet_address: { contains: search } },
            { display_name: { contains: search } },
            { referral_code: { contains: search } },
          ],
        };
      }

      total = await prisma.referralRelation.count({ where: whereCondition as any });

      const rels: any[] = await prisma.referralRelation.findMany({
        where: whereCondition as any,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          referred: {
            select: {
              id: true,
              wallet_address: true,
              referral_code: true,
              display_name: true,
              status: true,
              created_at: true,
              joined_at: true,
              sponsor_referrals: { select: { id: true } },
            },
          },
        },
      });

      members = rels.map((r: any) => {
        const addr = r.referred.wallet_address;
        const shortAddr = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
        return {
          id: r.referred.id,
          walletAddress: addr,
          shortWalletAddress: shortAddr,
          referralCode: r.referred.referral_code,
          displayName: r.referred.display_name || null,
          level: 'Starter',
          status: r.referred.status || 'ACTIVE',
          joiningDate: (r.referred.joined_at || r.referred.created_at || new Date()).toISOString(),
          depth: 1,
          directsCount: r.referred.sponsor_referrals ? r.referred.sponsor_referrals.length : 0,
        };
      });
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Prisma unavailable, fetching direct referrals from memory');
      const directRels = memoryReferralRelations.filter(
        (r) => r.sponsor_user_id === userId && r.depth === 1
      );
      const memoryUserDirects = Array.from((AuthRepository as any).memoryUsers?.values() || [])
        .filter((u: any) => u.sponsor_id === userId);

      const allDirectIds = new Set<string>();
      directRels.forEach((r) => allDirectIds.add(r.referred_user_id));
      memoryUserDirects.forEach((u: any) => allDirectIds.add(u.id));

      total = allDirectIds.size;
      const idArray = Array.from(allDirectIds);
      members = await Promise.all(
        idArray.slice(skip, skip + limit).map(async (id) => {
          const u = await AuthRepository.findUserById(id);
          const addr = u ? u.wallet_address : '0x0000000000000000000000000000000000000000';
          
          let directsCount = 0;
          const uDirects = memoryReferralRelations.filter((r) => r.sponsor_user_id === id && r.depth === 1);
          directsCount = uDirects.length;
          
          return {
            id,
            walletAddress: addr,
            shortWalletAddress: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
            referralCode: u ? u.referral_code : 'UNKNOWN',
            displayName: u ? u.display_name || null : null,
            level: 'Starter',
            status: u ? u.status || 'ACTIVE' : 'ACTIVE',
            joiningDate: (u?.joined_at || u?.created_at || new Date()).toISOString(),
            depth: 1,
            directsCount,
          };
        })
      );
    }

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      members,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get Referral Tree down to maxDepth
   */
  static async getReferralTree(userId: string, maxDepth = 5, search?: string) {
    const user = await AuthRepository.findUserById(userId);
    if (!user) throw new Error('User not found');

    const addr = user.wallet_address;
    const rootNode: TeamMemberInfo = {
      id: user.id,
      walletAddress: addr,
      shortWalletAddress: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
      referralCode: user.referral_code,
      displayName: user.display_name || 'Root User',
      level: 'VIP',
      status: user.status || 'ACTIVE',
      joiningDate: (user.joined_at || user.created_at || new Date()).toISOString(),
      depth: 0,
      directsCount: 0,
      children: [],
    };

    try {
      // Helper function to build children tree
      const buildSubtree = async (parentUserId: string, currentDepth: number): Promise<TeamMemberInfo[]> => {
        if (currentDepth > maxDepth) return [];
        if (!(await isDatabaseAvailable())) throw new Error('Database offline');

        const rels = await prisma.referralRelation.findMany({
          where: {
            sponsor_user_id: parentUserId,
            depth: 1, // Get direct children for this node
          },
          include: {
            referred: {
              select: {
                id: true,
                wallet_address: true,
                referral_code: true,
                display_name: true,
                status: true,
                created_at: true,
                joined_at: true,
              },
            },
          },
        });

        const childrenList: TeamMemberInfo[] = [];

        for (const r of rels) {
          const childAddr = r.referred.wallet_address;
          if (
            search &&
            !childAddr.toLowerCase().includes(search.toLowerCase()) &&
            !r.referred.referral_code.toLowerCase().includes(search.toLowerCase())
          ) {
            continue;
          }

          const grandChildren = await buildSubtree(r.referred.id, currentDepth + 1);

          childrenList.push({
            id: r.referred.id,
            walletAddress: childAddr,
            shortWalletAddress: `${childAddr.slice(0, 6)}...${childAddr.slice(-4)}`,
            referralCode: r.referred.referral_code,
            displayName: r.referred.display_name || null,
            level: currentDepth === 1 ? 'Leader' : currentDepth === 2 ? 'Builder' : 'Starter',
            status: r.referred.status || 'ACTIVE',
            joiningDate: (r.referred.joined_at || r.referred.created_at || new Date()).toISOString(),
            depth: currentDepth,
            directsCount: grandChildren.length,
            children: grandChildren,
          });
        }

        return childrenList;
      };

      rootNode.children = await buildSubtree(userId, 1);
      rootNode.directsCount = rootNode.children.length;
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Prisma unavailable, returning fallback tree structure');
      
      // Need to access memoryUsers from AuthRepository - it's private but exposed via any in codebase
      const memoryUsersMap = (AuthRepository as any).memoryUsers || new Map();
      
      const buildMemorySubtree = async (parentUserId: string, currentDepth: number): Promise<TeamMemberInfo[]> => {
        if (currentDepth > maxDepth) return [];
        
        const directRels = memoryReferralRelations.filter(
          (r) => r.sponsor_user_id === parentUserId && r.depth === 1
        );
        
        const memoryUserDirects = Array.from(memoryUsersMap.values())
          .filter((u: any) => u.sponsor_id === parentUserId);
          
        const childIds = new Set<string>();
        directRels.forEach((r) => childIds.add(r.referred_user_id));
        memoryUserDirects.forEach((u: any) => childIds.add(u.id));
        
        const childrenList: TeamMemberInfo[] = [];
        
        for (const childId of Array.from(childIds)) {
          const u = await AuthRepository.findUserById(childId);
          if (!u) continue;
          
          const childAddr = u.wallet_address;
          if (
            search &&
            !childAddr.toLowerCase().includes(search.toLowerCase()) &&
            !u.referral_code.toLowerCase().includes(search.toLowerCase())
          ) {
            continue;
          }
          
          const grandChildren = await buildMemorySubtree(childId, currentDepth + 1);
          
          childrenList.push({
            id: u.id,
            walletAddress: childAddr,
            shortWalletAddress: `${childAddr.slice(0, 6)}...${childAddr.slice(-4)}`,
            referralCode: u.referral_code,
            displayName: u.display_name || null,
            level: currentDepth === 1 ? 'Leader' : currentDepth === 2 ? 'Builder' : 'Starter',
            status: u.status || 'ACTIVE',
            joiningDate: (u.joined_at || u.created_at || new Date()).toISOString(),
            depth: currentDepth,
            directsCount: grandChildren.length,
            children: grandChildren,
          });
        }
        
        return childrenList;
      };
      
      rootNode.children = await buildMemorySubtree(userId, 1);
      rootNode.directsCount = rootNode.children.length;
    }

    return { root: rootNode };
  }

  static resetMemoryStore(): void {
    memoryReferralRelations.length = 0;
  }
}

export default ReferralRepository;
