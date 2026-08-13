import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { ReferralService } from '../services/ReferralService.js';
import { sendSuccess, catchAsync } from '../utils/apiResponse.js';

export const getSummary = catchAsync(async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const host = req.get('host') || 'simpleon.io';
  const protocol = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
  const tierCode = (req.query.tierCode || req.query.tier) as string | undefined;

  const summary = await ReferralService.getSummary(userId, host, protocol, tierCode);
  return sendSuccess(res, summary, 'Referral summary retrieved successfully');
});

export const getDirect = catchAsync(async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
  const search = req.query.search as string | undefined;
  const tierCode = (req.query.tierCode || req.query.tier) as string | undefined;

  const result = await ReferralService.getDirectReferrals(userId, { page, limit, search, tierCode });
  const directsList = Array.isArray(result) ? result : (result as any).directs || (result as any).members || (result as any).data || [];
  return sendSuccess(res, { directs: directsList, members: directsList, ...result }, 'Direct referrals retrieved successfully');
});

export const getTree = catchAsync(async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const maxDepth = req.query.maxDepth ? parseInt(req.query.maxDepth as string, 10) : 5;
  const search = req.query.search as string | undefined;
  const tierCode = (req.query.tierCode || req.query.tier) as string | undefined;

  const tree = await ReferralService.getReferralTree(userId, { maxDepth, search, tierCode });
  return sendSuccess(res, { root: tree, ...tree }, 'Referral tree retrieved successfully');
});

export const getLink = catchAsync(async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const host = req.get('host') || 'simpleon.io';
  const protocol = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();

  const linkInfo = await ReferralService.getReferralLink(userId, host, protocol);
  return sendSuccess(res, linkInfo, 'Referral link retrieved successfully');
});

export const validateReferralCode = catchAsync(async (req: AuthRequest, res: Response) => {
  const referralCode = req.params.referralCode || (req.query.sponsor as string) || (req.query.code as string);
  const currentUserId = req.userId;
  const currentUserAddress = req.userAddress;

  const validation = await ReferralService.validateReferralCode(
    referralCode,
    currentUserId,
    currentUserAddress
  );
  return sendSuccess(res, validation, validation.message);
});

export const assignSponsor = catchAsync(async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const referralCode = req.body.referralCode || req.body.sponsorAddress || req.body.referrerAddress || req.body.sponsor;

  const result = await ReferralService.assignSponsor(userId, referralCode);
  return sendSuccess(res, result, 'Sponsor assigned successfully');
});
