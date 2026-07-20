import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { getIO } from '../lib/socket';

export const getIncidents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, priority, search, responderId } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (responderId) where.responderId = responderId;
    if (search) {
      where.OR = [
        { description: { contains: search as string, mode: 'insensitive' } },
        { event: { address: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const incidents = await prisma.incident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        event: { include: { device: true } },
        responder: { select: { id: true, name: true, avatar: true, badge: true, status: true } },
        report: true,
        _count: { select: { timeline: true } },
      },
    });

    res.json(incidents);
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
};

export const getIncident = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const incident = await prisma.incident.findUnique({
      where: { id: req.params.id },
      include: {
        event: { include: { device: true } },
        responder: true,
        timeline: { orderBy: { createdAt: 'asc' } },
        report: { include: { responder: true } },
      },
    });

    if (!incident) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    res.json(incident);
  } catch (error) {
    console.error('Get incident error:', error);
    res.status(500).json({ error: 'Failed to fetch incident' });
  }
};

export const updateIncident = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const incident = await prisma.incident.update({
      where: { id: req.params.id },
      data: req.body,
      include: { event: true, responder: true },
    });

    getIO().to('dashboard').emit('incident_updated', incident);
    res.json(incident);
  } catch (error) {
    console.error('Update incident error:', error);
    res.status(500).json({ error: 'Failed to update incident' });
  }
};

export const assignIncident = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { responderId } = req.body;

    const incident = await prisma.incident.update({
      where: { id: req.params.id },
      data: {
        responderId,
        status: 'ASSIGNED',
        assignedAt: new Date(),
      },
      include: { event: true, responder: true },
    });

    await prisma.timelineEntry.create({
      data: {
        incidentId: incident.id,
        action: 'ASSIGNED',
        description: `Incident assigned to ${incident.responder?.name || 'responder'}`,
        actor: req.userId,
      },
    });

    await prisma.user.update({
      where: { id: responderId },
      data: { status: 'BUSY' },
    });

    // Notify the assigned responder
    await prisma.notification.create({
      data: {
        userId: responderId,
        type: 'ASSIGNMENT',
        title: 'New Incident Assigned',
        body: `You have been assigned to incident: ${incident.description}`,
        data: { incidentId: incident.id },
      },
    });

    const io = getIO();
    io.to('dashboard').emit('incident_updated', incident);
    io.to(`user_${responderId}`).emit('new_notification', {
      type: 'ASSIGNMENT',
      incident,
    });

    res.json(incident);
  } catch (error) {
    console.error('Assign incident error:', error);
    res.status(500).json({ error: 'Failed to assign incident' });
  }
};

export const resolveIncident = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { description, evidenceNotes, imageUrls } = req.body;

    const incident = await prisma.incident.update({
      where: { id: req.params.id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
      include: { event: true, responder: true },
    });

    if (description) {
      await prisma.report.create({
        data: {
          incidentId: incident.id,
          responderId: incident.responderId || req.userId!,
          description,
          evidenceNotes,
          imageUrls: imageUrls || [],
        },
      });
    }

    await prisma.timelineEntry.create({
      data: {
        incidentId: incident.id,
        action: 'RESOLVED',
        description: 'Incident resolved',
        actor: req.userId,
      },
    });

    if (incident.responderId) {
      await prisma.user.update({
        where: { id: incident.responderId },
        data: { status: 'AVAILABLE' },
      });
    }

    const io = getIO();
    io.to('dashboard').emit('incident_updated', incident);
    io.to('dashboard').emit('stats_updated');

    res.json(incident);
  } catch (error) {
    console.error('Resolve incident error:', error);
    res.status(500).json({ error: 'Failed to resolve incident' });
  }
};

export const escalateIncident = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const incident = await prisma.incident.update({
      where: { id: req.params.id },
      data: {
        status: 'ESCALATED',
        priority: 'CRITICAL',
        escalatedAt: new Date(),
      },
      include: { event: true, responder: true },
    });

    await prisma.timelineEntry.create({
      data: {
        incidentId: incident.id,
        action: 'ESCALATED',
        description: 'Incident escalated to critical priority',
        actor: req.userId,
      },
    });

    getIO().to('dashboard').emit('incident_updated', incident);
    res.json(incident);
  } catch (error) {
    console.error('Escalate incident error:', error);
    res.status(500).json({ error: 'Failed to escalate incident' });
  }
};

export const getTimeline = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const timeline = await prisma.timelineEntry.findMany({
      where: { incidentId: req.params.id },
      orderBy: { createdAt: 'asc' },
    });

    res.json(timeline);
  } catch (error) {
    console.error('Get timeline error:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
};
