import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticateToken, requireRole } from '../middleware/auth';
import { io } from '../server';
import { recalculateQueue } from '../services/queueEngine';
import bcrypt from 'bcryptjs';

const router = Router();

// Allow ADMIN and DOCTOR to access these routes
router.use(authenticateToken, requireRole(['ADMIN', 'DOCTOR', 'RECEPTIONIST']));

// 1. Get overall hospital stats
router.get('/stats', async (req, res) => {
  try {
    const totalPatients = await prisma.user.count({ where: { role: 'PATIENT' } });
    const totalDoctors = await prisma.user.count({ where: { role: 'DOCTOR' } });
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const todayAppointments = await prisma.appointment.count({
      where: { createdAt: { gte: today } }
    });

    const pendingAppointments = await prisma.appointment.count({
      where: { status: 'PENDING' }
    });

    res.json({
      totalPatients,
      totalDoctors,
      todayAppointments,
      pendingAppointments
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// 2. Get all staff
router.get('/staff', async (req, res) => {
  try {
    const staff = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'DOCTOR', 'RECEPTIONIST'] } },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, phone: true }
    });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// 3. Get Patient History (All Appointments)
router.get('/history', async (req, res) => {
  try {
    const history = await prisma.appointment.findMany({
      include: {
        patient: true,
        department: true,
        doctor: { include: { user: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// 4. QR Check-in Scanner
router.post('/checkin', async (req, res) => {
  const { tokenNumber } = req.body;

  try {
    const today = new Date();
    today.setHours(0,0,0,0);

    const appointment = await prisma.appointment.findFirst({
      where: { tokenNumber, status: 'APPROVED', updatedAt: { gte: today } }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Invalid token or already checked in.' });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'IN_QUEUE' }
    });

    // Recalculate queue & broadcast
    await recalculateQueue('', updated.departmentId);
    io.emit('queue_update', { departmentId: updated.departmentId });

    res.json({ message: 'Check-in successful', appointment: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check-in patient' });
  }
});

// Get detailed analytics
router.get('/analytics', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointments = await prisma.appointment.findMany({
      where: {
        createdAt: { gte: today }
      },
      include: { department: true }
    });

    // Group by department
    const deptStats = appointments.reduce((acc: any, curr) => {
      acc[curr.department.name] = (acc[curr.department.name] || 0) + 1;
      return acc;
    }, {});
    const departmentChartData = Object.keys(deptStats).map(key => ({ name: key, count: deptStats[key] }));

    // Group by hour
    const hourStats = appointments.reduce((acc: any, curr) => {
      const hour = curr.createdAt.getHours() + ':00';
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});
    const timeChartData = Object.keys(hourStats).map(key => ({ time: key, patients: hourStats[key] }));

    res.json({ departmentChartData, timeChartData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Pharmacy - Get pending prescriptions
router.get('/pharmacy/pending', async (req, res) => {
  try {
    const pending = await prisma.appointment.findMany({
      where: {
        status: 'COMPLETED',
        pharmacyStatus: { not: 'DISPENSED' },
        queueLogs: {
          some: {
            status: 'COMPLETED',
            notes: { not: null }
          }
        }
      },
      include: {
        patient: true,
        department: true,
        queueLogs: true
      },
      orderBy: { updatedAt: 'asc' }
    });
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pharmacy queue' });
  }
});

// Pharmacy - Mark dispensed
router.post('/pharmacy/:id/dispense', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.appointment.update({
      where: { id },
      data: { pharmacyStatus: 'DISPENSED' }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to dispense' });
  }
});

export default router;
