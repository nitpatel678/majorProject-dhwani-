import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { getIO } from '../lib/socket';

export const getDevices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, search } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { serialNumber: { contains: search as string, mode: 'insensitive' } },
        { address: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const devices = await prisma.device.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { events: true } } },
    });

    res.json(devices);
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
};

export const getDevice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const device = await prisma.device.findUnique({
      where: { id: req.params.id },
      include: {
        events: { take: 10, orderBy: { createdAt: 'desc' } },
        deviceLogs: { take: 20, orderBy: { createdAt: 'desc' } },
        _count: { select: { events: true } },
      },
    });

    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    res.json(device);
  } catch (error) {
    console.error('Get device error:', error);
    res.status(500).json({ error: 'Failed to fetch device' });
  }
};

export const createDevice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, serialNumber, latitude, longitude, address } = req.body;

    const device = await prisma.device.create({
      data: { name, serialNumber, latitude, longitude, address },
    });

    await prisma.deviceLog.create({
      data: {
        deviceId: device.id,
        level: 'INFO',
        message: 'Device registered',
      },
    });

    getIO().to('dashboard').emit('device_status_changed', device);
    res.status(201).json(device);
  } catch (error) {
    console.error('Create device error:', error);
    res.status(500).json({ error: 'Failed to create device' });
  }
};

export const updateDevice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const device = await prisma.device.update({
      where: { id: req.params.id },
      data: req.body,
    });

    getIO().to('dashboard').emit('device_status_changed', device);
    res.json(device);
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({ error: 'Failed to update device' });
  }
};

export const deleteDevice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.device.delete({ where: { id: req.params.id } });
    res.json({ message: 'Device deleted' });
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({ error: 'Failed to delete device' });
  }
};

export const toggleDevice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const device = await prisma.device.findUnique({ where: { id: req.params.id } });
    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    const newStatus = device.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    const updated = await prisma.device.update({
      where: { id: req.params.id },
      data: { status: newStatus },
    });

    await prisma.deviceLog.create({
      data: {
        deviceId: device.id,
        level: 'INFO',
        message: `Device ${newStatus === 'ACTIVE' ? 'enabled' : 'disabled'}`,
      },
    });

    getIO().to('dashboard').emit('device_status_changed', updated);
    res.json(updated);
  } catch (error) {
    console.error('Toggle device error:', error);
    res.status(500).json({ error: 'Failed to toggle device' });
  }
};

export const restartDevice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.deviceLog.create({
      data: {
        deviceId: req.params.id,
        level: 'INFO',
        message: 'Device restart initiated',
      },
    });

    // Simulate restart - in production, this would send a command to the IoT device
    setTimeout(async () => {
      await prisma.device.update({
        where: { id: req.params.id },
        data: { lastSeen: new Date() },
      });
    }, 3000);

    res.json({ message: 'Restart command sent' });
  } catch (error) {
    console.error('Restart device error:', error);
    res.status(500).json({ error: 'Failed to restart device' });
  }
};

export const getDeviceLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const logs = await prisma.deviceLog.findMany({
      where: { deviceId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(logs);
  } catch (error) {
    console.error('Get device logs error:', error);
    res.status(500).json({ error: 'Failed to fetch device logs' });
  }
};
