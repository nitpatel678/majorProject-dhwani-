import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

export const getStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalDevices,
      activeDevices,
      offlineDevices,
      todayAlerts,
      emergencyAlerts,
      falsePositives,
      activeResponders,
      resolvedIncidents,
      pendingIncidents,
      totalIncidents,
    ] = await Promise.all([
      prisma.device.count(),
      prisma.device.count({ where: { status: 'ACTIVE' } }),
      prisma.device.count({ where: { status: 'OFFLINE' } }),
      prisma.event.count({ where: { createdAt: { gte: today } } }),
      prisma.event.count({
        where: {
          createdAt: { gte: today },
          type: { in: ['GUNSHOT_EXPLOSION', 'CROWD_PANIC', 'SCREAM'] },
        },
      }),
      prisma.incident.count({ where: { status: 'FALSE_ALARM' } }),
      prisma.user.count({ where: { role: 'RESPONDER', isOnline: true } }),
      prisma.incident.count({ where: { status: 'RESOLVED' } }),
      prisma.incident.count({ where: { status: { in: ['OPEN', 'ASSIGNED', 'ONGOING'] } } }),
      prisma.incident.count(),
    ]);

    const resolvedWithTime = await prisma.incident.findMany({
      where: { status: 'RESOLVED', resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
      take: 100,
      orderBy: { resolvedAt: 'desc' },
    });

    let avgResponseTime = 0;
    if (resolvedWithTime.length > 0) {
      const totalTime = resolvedWithTime.reduce((sum, inc) => {
        if (inc.resolvedAt) {
          return sum + (inc.resolvedAt.getTime() - inc.createdAt.getTime());
        }
        return sum;
      }, 0);
      avgResponseTime = Math.round(totalTime / resolvedWithTime.length / 60000); // minutes
    }

    const aiAccuracy = totalIncidents > 0
      ? Math.round(((totalIncidents - falsePositives) / totalIncidents) * 100)
      : 100;

    res.json({
      totalDevices,
      activeDevices,
      offlineDevices,
      todayAlerts,
      emergencyAlerts,
      falsePositives,
      activeResponders,
      resolvedIncidents,
      pendingIncidents,
      avgResponseTime,
      aiAccuracy,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

export const getRecentActivity = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const events = await prisma.event.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { device: true, incident: { include: { responder: true } } },
    });

    res.json(events);
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
};

export const getSystemHealth = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const devices = await prisma.device.findMany({
      select: { id: true, name: true, status: true, battery: true, signalStrength: true, lastSeen: true },
    });

    const onlineCount = devices.filter(d => d.status === 'ACTIVE').length;
    const avgBattery = devices.reduce((sum, d) => sum + (d.battery || 0), 0) / (devices.length || 1);
    const avgSignal = devices.reduce((sum, d) => sum + (d.signalStrength || 0), 0) / (devices.length || 1);

    res.json({
      serverStatus: 'healthy',
      uptime: process.uptime(),
      deviceHealth: {
        total: devices.length,
        online: onlineCount,
        avgBattery: Math.round(avgBattery),
        avgSignal: Math.round(avgSignal),
      },
      database: 'connected',
      socketio: 'active',
    });
  } catch (error) {
    console.error('System health error:', error);
    res.status(500).json({ error: 'Failed to fetch system health' });
  }
};

export const getChartData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.params;

    switch (type) {
      case 'daily-alerts': {
        const days = 7;
        const data = [];
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);

          const count = await prisma.event.count({
            where: { createdAt: { gte: date, lt: nextDay } },
          });
          data.push({
            date: date.toISOString().split('T')[0],
            count,
          });
        }
        res.json(data);
        break;
      }

      case 'category-distribution': {
        const categories = await prisma.event.groupBy({
          by: ['type'],
          _count: { type: true },
        });
        res.json(
          categories.map(c => ({
            type: c.type,
            count: c._count.type,
          }))
        );
        break;
      }

      case 'weekly-trends': {
        const weeks = 4;
        const data = [];
        for (let i = weeks - 1; i >= 0; i--) {
          const start = new Date();
          start.setDate(start.getDate() - (i + 1) * 7);
          const end = new Date();
          end.setDate(end.getDate() - i * 7);

          const count = await prisma.event.count({
            where: { createdAt: { gte: start, lt: end } },
          });
          data.push({ week: `Week ${weeks - i}`, count });
        }
        res.json(data);
        break;
      }

      case 'responder-performance': {
        const responders = await prisma.user.findMany({
          where: { role: 'RESPONDER' },
          include: {
            incidents: {
              where: { status: 'RESOLVED' },
              select: { id: true },
            },
          },
        });
        res.json(
          responders.map(r => ({
            name: r.name,
            resolved: r.incidents.length,
            area: r.area,
          }))
        );
        break;
      }

      default:
        res.json([]);
    }
  } catch (error) {
    console.error('Chart data error:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
};
