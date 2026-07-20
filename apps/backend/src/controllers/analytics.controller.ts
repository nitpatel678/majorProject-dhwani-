import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

export const getAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.params;

    switch (type) {
      case 'overview': {
        const totalEvents = await prisma.event.count();
        const totalIncidents = await prisma.incident.count();
        const resolved = await prisma.incident.count({ where: { status: 'RESOLVED' } });
        const falseAlarms = await prisma.incident.count({ where: { status: 'FALSE_ALARM' } });

        res.json({
          totalEvents,
          totalIncidents,
          resolved,
          falseAlarms,
          accuracy: totalIncidents > 0 ? ((totalIncidents - falseAlarms) / totalIncidents * 100).toFixed(1) : '100',
          resolutionRate: totalIncidents > 0 ? ((resolved / totalIncidents) * 100).toFixed(1) : '0',
        });
        break;
      }

      case 'response-time': {
        const incidents = await prisma.incident.findMany({
          where: { status: 'RESOLVED', resolvedAt: { not: null }, assignedAt: { not: null } },
          select: { assignedAt: true, resolvedAt: true, createdAt: true },
          orderBy: { resolvedAt: 'desc' },
          take: 30,
        });

        const data = incidents.map((inc, i) => ({
          index: i + 1,
          responseMinutes: Math.round(
            ((inc.resolvedAt!.getTime()) - (inc.assignedAt || inc.createdAt).getTime()) / 60000
          ),
          date: inc.resolvedAt!.toISOString().split('T')[0],
        }));

        res.json(data);
        break;
      }

      case 'detection': {
        const categories = await prisma.event.groupBy({
          by: ['type'],
          _count: { type: true },
        });

        const hourly = [];
        for (let h = 0; h < 24; h++) {
          const count = await prisma.event.count({
            where: {
              createdAt: {
                gte: new Date(new Date().setHours(h, 0, 0, 0)),
                lt: new Date(new Date().setHours(h + 1, 0, 0, 0)),
              },
            },
          });
          hourly.push({ hour: h, count });
        }

        res.json({
          byCategory: categories.map(c => ({ type: c.type, count: c._count.type })),
          byHour: hourly,
        });
        break;
      }

      case 'responder': {
        const responders = await prisma.user.findMany({
          where: { role: 'RESPONDER' },
          include: {
            incidents: {
              select: { status: true, createdAt: true, assignedAt: true, resolvedAt: true },
            },
          },
        });

        const data = responders.map(r => {
          const resolved = r.incidents.filter(i => i.status === 'RESOLVED').length;
          const total = r.incidents.length;
          const avgTime = r.incidents
            .filter(i => i.resolvedAt && i.assignedAt)
            .reduce((sum, i) => {
              return sum + (i.resolvedAt!.getTime() - i.assignedAt!.getTime()) / 60000;
            }, 0) / (resolved || 1);

          return {
            name: r.name,
            totalCases: total,
            resolved,
            rate: total > 0 ? Math.round((resolved / total) * 100) : 0,
            avgResponseTime: Math.round(avgTime),
            area: r.area,
          };
        });

        res.json(data);
        break;
      }

      case 'device': {
        const devices = await prisma.device.findMany({
          include: { _count: { select: { events: true } } },
        });

        res.json(
          devices.map(d => ({
            name: d.name,
            serialNumber: d.serialNumber,
            status: d.status,
            battery: d.battery,
            signalStrength: d.signalStrength,
            eventCount: d._count.events,
            lastSeen: d.lastSeen,
          }))
        );
        break;
      }

      case 'monthly-trends': {
        const data = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const start = new Date(date.getFullYear(), date.getMonth(), 1);
          const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

          const count = await prisma.event.count({
            where: { createdAt: { gte: start, lte: end } },
          });

          data.push({
            month: start.toLocaleString('default', { month: 'short', year: 'numeric' }),
            count,
          });
        }
        res.json(data);
        break;
      }

      default:
        res.json([]);
    }
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};
