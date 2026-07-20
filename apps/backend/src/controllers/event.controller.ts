import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { getIO } from '../lib/socket';

export const getEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, limit = '50', offset = '0' } = req.query;
    const where: any = {};
    if (type) where.type = type;

    const events = await prisma.event.findMany({
      where,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: { createdAt: 'desc' },
      include: {
        device: true,
        incident: { include: { responder: true } },
      },
    });

    const total = await prisma.event.count({ where });
    res.json({ events, total });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

export const getEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        device: true,
        incident: {
          include: {
            responder: true,
            timeline: { orderBy: { createdAt: 'asc' } },
            report: true,
          },
        },
      },
    });

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
};

export const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, confidence, audioUrl, latitude, longitude, address, deviceId, rawPredictions, inferenceTime } = req.body;

    const event = await prisma.event.create({
      data: {
        type,
        confidence,
        audioUrl,
        latitude,
        longitude,
        address,
        deviceId,
        rawPredictions,
        inferenceTime,
      },
      include: { device: true },
    });

    // Auto-create incident for non-normal events
    if (type !== 'NORMAL') {
      const priority =
        type === 'GUNSHOT_EXPLOSION' || type === 'CROWD_PANIC'
          ? 'CRITICAL'
          : type === 'SCREAM' || type === 'IMPACT_CRASH'
          ? 'HIGH'
          : 'MEDIUM';

      const incident = await prisma.incident.create({
        data: {
          eventId: event.id,
          priority,
          description: `${type.replace(/_/g, ' ')} detected with ${(confidence * 100).toFixed(1)}% confidence`,
        },
      });

      await prisma.timelineEntry.create({
        data: {
          incidentId: incident.id,
          action: 'CREATED',
          description: `Incident auto-created from ${type} event detection`,
          actor: 'DhwaniAI System',
        },
      });

      // Emit to dashboard and all responders
      const io = getIO();
      io.to('dashboard').emit('new_event', { event, incident });
      io.to('responders').emit('new_incident', { event, incident });

      // Create notifications for available responders
      const responders = await prisma.user.findMany({
        where: { role: 'RESPONDER', isOnline: true, status: 'AVAILABLE' },
      });

      for (const responder of responders) {
        await prisma.notification.create({
          data: {
            userId: responder.id,
            type: 'EMERGENCY_ALERT',
            title: `${type.replace(/_/g, ' ')} Detected`,
            body: `Emergency at ${address || 'Unknown Location'} — ${(confidence * 100).toFixed(0)}% confidence`,
            data: { eventId: event.id, incidentId: incident.id },
          },
        });

        io.to(`user_${responder.id}`).emit('new_notification', {
          type: 'EMERGENCY_ALERT',
          event,
          incident,
        });
      }
    }

    if (deviceId) {
      await prisma.device.update({
        where: { id: deviceId },
        data: { lastSeen: new Date() },
      });
    }

    res.status(201).json(event);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
};
