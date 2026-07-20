import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DELHI_CENTER = { lat: 28.6139, lng: 77.2090 };

async function main() {
  console.log('🌱 Seeding DhwaniAI database...');

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.timelineEntry.deleteMany();
  await prisma.report.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.event.deleteMany();
  await prisma.deviceLog.deleteMany();
  await prisma.device.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing data');

  // Create Admin
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@dhwaniai.com',
      password: adminPassword,
      name: 'System Admin',
      role: 'ADMIN',
      badge: 'ADM-001',
      rank: 'Administrator',
      area: 'Central Command',
      status: 'AVAILABLE',
      isOnline: true,
      latitude: DELHI_CENTER.lat,
      longitude: DELHI_CENTER.lng,
    },
  });
  console.log('👤 Admin created:', admin.email);

  // Create Responders
  const responderPassword = await bcrypt.hash('responder123', 12);
  const respondersData = [
    { name: 'Arjun Patel', badge: 'RSP-101', rank: 'Senior Officer', area: 'Connaught Place', phone: '+91-9876543210', lat: 28.6315, lng: 77.2167 },
    { name: 'Priya Sharma', badge: 'RSP-102', rank: 'Officer', area: 'Karol Bagh', phone: '+91-9876543211', lat: 28.6519, lng: 77.1905 },
    { name: 'Rahul Kumar', badge: 'RSP-103', rank: 'Senior Officer', area: 'Chandni Chowk', phone: '+91-9876543212', lat: 28.6506, lng: 77.2303 },
    { name: 'Meera Singh', badge: 'RSP-104', rank: 'Trainee', area: 'Rajouri Garden', phone: '+91-9876543213', lat: 28.6492, lng: 77.1231 },
    { name: 'Vikram Thakur', badge: 'RSP-105', rank: 'Officer', area: 'Saket', phone: '+91-9876543214', lat: 28.5244, lng: 77.2066 },
    { name: 'Ananya Desai', badge: 'RSP-106', rank: 'Officer', area: 'Dwarka', phone: '+91-9876543215', lat: 28.5823, lng: 77.0500 },
  ];

  const responders = [];
  for (const r of respondersData) {
    const responder = await prisma.user.create({
      data: {
        email: `${r.name.toLowerCase().replace(/\s/g, '.')}@dhwaniai.com`,
        password: responderPassword,
        name: r.name,
        role: 'RESPONDER',
        badge: r.badge,
        rank: r.rank,
        area: r.area,
        phone: r.phone,
        status: 'AVAILABLE',
        shiftStart: '08:00',
        shiftEnd: '20:00',
        isOnline: true,
        latitude: r.lat,
        longitude: r.lng,
      },
    });
    responders.push(responder);
  }
  console.log(`👮 ${responders.length} responders created`);

  // Create Devices
  const devicesData = [
    { name: 'DhwaniAI Node Alpha', serial: 'DHWN-ESP32-001', lat: 28.6139, lng: 77.2090, addr: 'India Gate, New Delhi' },
    { name: 'DhwaniAI Node Beta', serial: 'DHWN-ESP32-002', lat: 28.6315, lng: 77.2167, addr: 'Connaught Place, New Delhi' },
    { name: 'DhwaniAI Node Gamma', serial: 'DHWN-ESP32-003', lat: 28.6506, lng: 77.2303, addr: 'Chandni Chowk, New Delhi' },
    { name: 'DhwaniAI Node Delta', serial: 'DHWN-ESP32-004', lat: 28.5244, lng: 77.2066, addr: 'Saket, New Delhi' },
    { name: 'DhwaniAI Node Epsilon', serial: 'DHWN-ESP32-005', lat: 28.5823, lng: 77.0500, addr: 'Dwarka, New Delhi' },
    { name: 'DhwaniAI Node Zeta', serial: 'DHWN-ESP32-006', lat: 28.6127, lng: 77.2273, addr: 'Pragati Maidan, New Delhi' },
    { name: 'DhwaniAI Node Eta', serial: 'DHWN-ESP32-007', lat: 28.6353, lng: 77.2250, addr: 'Red Fort, New Delhi' },
    { name: 'DhwaniAI Node Theta', serial: 'DHWN-ESP32-008', lat: 28.6562, lng: 77.2410, addr: 'ISBT Kashmere Gate, New Delhi' },
  ];

  const devices = [];
  for (const d of devicesData) {
    const device = await prisma.device.create({
      data: {
        name: d.name,
        serialNumber: d.serial,
        latitude: d.lat,
        longitude: d.lng,
        address: d.addr,
        status: Math.random() > 0.15 ? 'ACTIVE' : 'OFFLINE',
        battery: Math.round(60 + Math.random() * 40),
        signalStrength: Math.round(70 + Math.random() * 30),
        firmwareVersion: '2.1.0',
        networkType: 'WiFi',
        lastSeen: new Date(Date.now() - Math.random() * 3600000),
      },
    });
    devices.push(device);

    await prisma.deviceLog.create({
      data: {
        deviceId: device.id,
        level: 'INFO',
        message: 'Device registered and activated',
      },
    });
  }
  console.log(`📡 ${devices.length} devices created`);

  // Create Events & Incidents
  const eventTypes = ['SCREAM', 'GLASS_BREAK', 'IMPACT_CRASH', 'GUNSHOT_EXPLOSION', 'CROWD_PANIC', 'SIREN'] as const;
  const statuses = ['OPEN', 'ASSIGNED', 'ONGOING', 'RESOLVED', 'FALSE_ALARM'] as const;

  for (let i = 0; i < 25; i++) {
    const device = devices[Math.floor(Math.random() * devices.length)];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const confidence = 0.65 + Math.random() * 0.30;
    const hoursAgo = Math.random() * 168; // Last week

    const event = await prisma.event.create({
      data: {
        type: eventType,
        confidence: parseFloat(confidence.toFixed(3)),
        latitude: device.latitude + (Math.random() - 0.5) * 0.01,
        longitude: device.longitude + (Math.random() - 0.5) * 0.01,
        address: device.address,
        deviceId: device.id,
        inferenceTime: Math.round(80 + Math.random() * 200),
        rawPredictions: {
          SCREAM: Math.random() * 0.3,
          GLASS_BREAK: Math.random() * 0.3,
          IMPACT_CRASH: Math.random() * 0.3,
          GUNSHOT_EXPLOSION: Math.random() * 0.3,
          CROWD_PANIC: Math.random() * 0.3,
          SIREN: Math.random() * 0.3,
          NORMAL: Math.random() * 0.3,
        },
        createdAt: new Date(Date.now() - hoursAgo * 3600000),
      },
    });

    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const responder = responders[Math.floor(Math.random() * responders.length)];
    const priority =
      eventType === 'GUNSHOT_EXPLOSION' || eventType === 'CROWD_PANIC'
        ? 'CRITICAL'
        : eventType === 'SCREAM' || eventType === 'IMPACT_CRASH'
        ? 'HIGH'
        : 'MEDIUM';

    const incident = await prisma.incident.create({
      data: {
        eventId: event.id,
        status,
        priority,
        description: `${eventType.replace(/_/g, ' ')} detected at ${device.address} with ${(confidence * 100).toFixed(0)}% confidence`,
        responderId: status !== 'OPEN' ? responder.id : null,
        assignedAt: status !== 'OPEN' ? new Date(Date.now() - (hoursAgo - 0.1) * 3600000) : null,
        resolvedAt: status === 'RESOLVED' ? new Date(Date.now() - (hoursAgo - 0.5) * 3600000) : null,
        createdAt: new Date(Date.now() - hoursAgo * 3600000),
      },
    });

    await prisma.timelineEntry.create({
      data: {
        incidentId: incident.id,
        action: 'CREATED',
        description: `Incident auto-created from ${eventType} detection`,
        actor: 'DhwaniAI System',
        createdAt: new Date(Date.now() - hoursAgo * 3600000),
      },
    });

    if (status === 'RESOLVED') {
      await prisma.report.create({
        data: {
          incidentId: incident.id,
          responderId: responder.id,
          description: `Responded to ${eventType.replace(/_/g, ' ').toLowerCase()} incident. Situation has been controlled and area is secure.`,
          evidenceNotes: 'Area secured. No further action required.',
          imageUrls: [],
        },
      });

      await prisma.timelineEntry.create({
        data: {
          incidentId: incident.id,
          action: 'RESOLVED',
          description: 'Incident resolved by responder',
          actor: responder.name,
          createdAt: new Date(Date.now() - (hoursAgo - 0.5) * 3600000),
        },
      });
    }
  }
  console.log('🚨 25 events and incidents created');

  // System Config
  await prisma.systemConfig.createMany({
    data: [
      { key: 'danger_threshold', value: '0.7' },
      { key: 'audio_sensitivity', value: 'medium' },
      { key: 'model_version', value: 'MobileNetV5-Edge' },
      { key: 'notification_enabled', value: 'true' },
      { key: 'auto_assign', value: 'true' },
      { key: 'max_response_radius_km', value: '5' },
    ],
  });
  console.log('⚙️  System config initialized');

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('   Admin:     admin@dhwaniai.com / admin123');
  console.log('   Responder: arjun.patel@dhwaniai.com / responder123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
