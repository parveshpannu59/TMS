import { Request, Response } from 'express';
import dashboardService from '../services/dashboardService';

export const getOwnerDashboard = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user?.id;
    const companyId = user?.companyId ?? user?.id;
    if (!userId || !companyId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    const { dateRange = 'today' } = req.query;

    const data = await dashboardService.getOwnerDashboard(
      userId,
      companyId,
      dateRange as string
    );

    return res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch dashboard data',
    });
  }
};

export const getUserWidgets = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const widgets = await dashboardService.getUserWidgets(userId);

    return res.json({
      success: true,
      data: widgets.length > 0 ? widgets : dashboardService['getDefaultWidgets'](),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const saveUserWidgets = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { widgets } = req.body;

    const saved = await dashboardService.saveUserWidgets(userId, widgets);

    return res.json({
      success: true,
      data: saved,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const resetUserWidgets = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const defaultWidgets = await dashboardService.resetUserWidgets(userId);

    return res.json({
      success: true,
      data: defaultWidgets,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};