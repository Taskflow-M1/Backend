import { Request, Response } from 'express';
import { getAuthenticatedUser } from '../../middlewares/auth.middleware';
import { ApiListResponse } from '../../types/api.types';
import {
  DashboardActivityItem,
  DashboardResponse,
  getDashboardData,
  listTeamRecentActivity,
} from './dashboard.service';
import { DashboardQuery, TeamActivityQuery } from './dashboard.validation';

export async function getDashboardHandler(
  req: Request,
  res: Response<DashboardResponse>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const query = req.query as DashboardQuery;
  const dashboard = await getDashboardData(userId, query);
  res.status(200).json(dashboard);
}

export async function listTeamActivityHandler(
  req: Request,
  res: Response<ApiListResponse<DashboardActivityItem>>,
): Promise<void> {
  const { id: userId } = getAuthenticatedUser(req);
  const query = req.query as TeamActivityQuery;
  const items = await listTeamRecentActivity(
    String(req.params.id),
    userId,
    query.limit,
  );
  res.status(200).json({ items });
}

