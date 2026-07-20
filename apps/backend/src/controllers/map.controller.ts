import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

export const getMapMarkers = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [devices, responders, incidents] = await Promise.all([
      prisma.device.findMany({
        select: { id: true, name: true, latitude: true, longitude: true, status: true, serialNumber: true },
      }),
      prisma.user.findMany({
        where: { role: 'RESPONDER', latitude: { not: null }, longitude: { not: null } },
        select: { id: true, name: true, latitude: true, longitude: true, status: true, badge: true, isOnline: true },
      }),
      prisma.incident.findMany({
        where: { status: { in: ['OPEN', 'ASSIGNED', 'ONGOING', 'ESCALATED'] } },
        include: { event: true, responder: { select: { name: true } } },
      }),
    ]);

    const markers = [
      ...devices.map(d => ({
        id: d.id,
        type: 'device' as const,
        latitude: d.latitude,
        longitude: d.longitude,
        label: d.name,
        status: d.status,
        data: { serialNumber: d.serialNumber },
      })),
      ...responders
        .filter(r => r.latitude && r.longitude)
        .map(r => ({
          id: r.id,
          type: 'responder' as const,
          latitude: r.latitude!,
          longitude: r.longitude!,
          label: r.name,
          status: r.isOnline ? r.status : 'OFFLINE',
          data: { badge: r.badge },
        })),
      ...incidents.map(i => ({
        id: i.id,
        type: 'incident' as const,
        latitude: i.event.latitude,
        longitude: i.event.longitude,
        label: `${i.event.type} — ${i.status}`,
        status: i.status,
        data: {
          eventType: i.event.type,
          priority: i.priority,
          confidence: i.event.confidence,
          responder: i.responder?.name,
        },
      })),
    ];

    res.json(markers);
  } catch (error) {
    console.error('Map markers error:', error);
    res.status(500).json({ error: 'Failed to fetch markers' });
  }
};

export const getHeatmapData = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const events = await prisma.event.findMany({
      where: { type: { not: 'NORMAL' } },
      select: { latitude: true, longitude: true, type: true, confidence: true },
    });

    res.json(
      events.map(e => ({
        lat: e.latitude,
        lng: e.longitude,
        intensity: e.confidence,
        type: e.type,
      }))
    );
  } catch (error) {
    console.error('Heatmap data error:', error);
    res.status(500).json({ error: 'Failed to fetch heatmap data' });
  }
};
