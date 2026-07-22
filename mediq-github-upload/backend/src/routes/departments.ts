import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

// Get all departments
router.get('/', async (req, res) => {
  try {
    const departments = await prisma.department.findMany();
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Get queues for Live TV display
router.get('/queues', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);

    const departments = await prisma.department.findMany();
    const activeQueues = [];

    for (const dept of departments) {
      const current = await prisma.appointment.findFirst({
        where: { departmentId: dept.id, status: 'CONSULTING', updatedAt: { gte: today } },
        orderBy: { updatedAt: 'desc' },
        include: { doctor: { include: { user: true } } }
      });

      // Waiting patients
      const waiting = await prisma.appointment.findMany({
        where: { departmentId: dept.id, status: { in: ['IN_QUEUE', 'APPROVED'] }, updatedAt: { gte: today } },
        orderBy: { queuePosition: 'asc' }
      });

      // Format doctor name nicely
      const currentFormatted = current ? {
        tokenNumber: current.tokenNumber,
        doctor: current.doctor ? {
          firstName: current.doctor.user.firstName,
          lastName: current.doctor.user.lastName
        } : null
      } : null;

      activeQueues.push({
        id: dept.id,
        name: dept.name,
        current: currentFormatted,
        waiting: waiting.map(w => ({ id: w.id, tokenNumber: w.tokenNumber }))
      });
    }

    res.json(activeQueues);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch queues' });
  }
});

export default router;
