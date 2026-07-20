import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { hashPassword } from '../utils/password';
import { getIO } from '../lib/socket';

export const getResponders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, search, area } = req.query;
    const where: any = { role: 'RESPONDER' };
    if (status) where.status = status;
    if (area) where.area = area;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { badge: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const responders = await prisma.user.findMany({
      where,
      select: {
        id: true, email: true, name: true, role: true, avatar: true,
        badge: true, rank: true, phone: true, area: true, status: true,
        shiftStart: true, shiftEnd: true, latitude: true, longitude: true,
        isOnline: true, lastSeen: true, createdAt: true,
        _count: { select: { incidents: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json(responders);
  } catch (error) {
    console.error('Get responders error:', error);
    res.status(500).json({ error: 'Failed to fetch responders' });
  }
};

export const getResponder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const responder = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        incidents: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { event: true },
        },
        _count: { select: { incidents: true, reports: true } },
      },
    });

    if (!responder) {
      res.status(404).json({ error: 'Responder not found' });
      return;
    }

    res.json({ ...responder, password: undefined });
  } catch (error) {
    console.error('Get responder error:', error);
    res.status(500).json({ error: 'Failed to fetch responder' });
  }
};

export const createResponder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password, name, phone, badge, rank, area, shiftStart, shiftEnd } = req.body;

    const hashed = await hashPassword(password || 'dhwaniai123');
    const responder = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        role: 'RESPONDER',
        phone,
        badge,
        rank,
        area,
        shiftStart,
        shiftEnd,
      },
    });

    res.status(201).json({ ...responder, password: undefined });
  } catch (error) {
    console.error('Create responder error:', error);
    res.status(500).json({ error: 'Failed to create responder' });
  }
};

export const updateResponder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { password, ...data } = req.body;
    const updateData: any = { ...data };
    if (password) {
      updateData.password = await hashPassword(password);
    }

    const responder = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({ ...responder, password: undefined });
  } catch (error) {
    console.error('Update responder error:', error);
    res.status(500).json({ error: 'Failed to update responder' });
  }
};

export const deleteResponder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'Responder deleted' });
  } catch (error) {
    console.error('Delete responder error:', error);
    res.status(500).json({ error: 'Failed to delete responder' });
  }
};

export const updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, latitude, longitude } = req.body;
    const responder = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        status,
        latitude,
        longitude,
        lastSeen: new Date(),
        isOnline: status !== 'OFFLINE',
      },
    });

    getIO().to('dashboard').emit('responder_status_changed', {
      id: responder.id,
      name: responder.name,
      status: responder.status,
      latitude: responder.latitude,
      longitude: responder.longitude,
    });

    res.json({ ...responder, password: undefined });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

export const getNearbyResponders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { lat, lng, radius = '5' } = req.query;
    // Simple distance-based query (in production, use PostGIS)
    const responders = await prisma.user.findMany({
      where: {
        role: 'RESPONDER',
        isOnline: true,
        status: 'AVAILABLE',
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true, name: true, avatar: true, badge: true, rank: true,
        latitude: true, longitude: true, status: true, phone: true,
      },
    });

    if (lat && lng) {
      const userLat = parseFloat(lat as string);
      const userLng = parseFloat(lng as string);
      const maxRadius = parseFloat(radius as string);

      const nearby = responders.filter(r => {
        if (!r.latitude || !r.longitude) return false;
        const dist = getDistanceKm(userLat, userLng, r.latitude, r.longitude);
        return dist <= maxRadius;
      });

      res.json(nearby);
    } else {
      res.json(responders);
    }
  } catch (error) {
    console.error('Nearby responders error:', error);
    res.status(500).json({ error: 'Failed to fetch nearby responders' });
  }
};

export const getPerformance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const responderId = req.params.id;
    const [totalIncidents, resolvedIncidents, avgResponseIncidents] = await Promise.all([
      prisma.incident.count({ where: { responderId } }),
      prisma.incident.count({ where: { responderId, status: 'RESOLVED' } }),
      prisma.incident.findMany({
        where: { responderId, status: 'RESOLVED', resolvedAt: { not: null } },
        select: { createdAt: true, assignedAt: true, resolvedAt: true },
      }),
    ]);

    let avgResponseTime = 0;
    if (avgResponseIncidents.length > 0) {
      const total = avgResponseIncidents.reduce((sum, inc) => {
        const start = inc.assignedAt || inc.createdAt;
        return sum + ((inc.resolvedAt?.getTime() || 0) - start.getTime());
      }, 0);
      avgResponseTime = Math.round(total / avgResponseIncidents.length / 60000);
    }

    res.json({
      totalIncidents,
      resolvedIncidents,
      resolutionRate: totalIncidents > 0 ? Math.round((resolvedIncidents / totalIncidents) * 100) : 0,
      avgResponseTime,
    });
  } catch (error) {
    console.error('Performance error:', error);
    res.status(500).json({ error: 'Failed to fetch performance' });
  }
};

// Haversine distance
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
