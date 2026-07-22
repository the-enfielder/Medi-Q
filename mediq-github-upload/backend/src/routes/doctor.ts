import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { recalculateQueue } from '../services/queueEngine';
import { sendNotification } from '../services/notificationService';
import { io } from '../server';

const router = Router();

// 1. Get today's queue for a doctor
router.get('/queue', authenticateToken, requireRole(['DOCTOR', 'ADMIN']), async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  
  try {
    let departmentIdToFetch = null;
    if (req.user!.role === 'ADMIN') {
      const dept = await prisma.department.findFirst();
      if (!dept) return res.status(404).json({ error: 'No departments found' });
      departmentIdToFetch = dept.id;
    } else {
      const doctorProfile = await prisma.doctorProfile.findUnique({ where: { userId } });
      if (!doctorProfile) return res.status(404).json({ error: 'Doctor profile not found' });
      departmentIdToFetch = doctorProfile.departmentId;
    }

    const today = new Date();
    today.setHours(0,0,0,0);

    const queue = await prisma.appointment.findMany({
      where: {
        departmentId: departmentIdToFetch,
        status: { in: ['APPROVED', 'IN_QUEUE', 'CONSULTING', 'COMPLETED'] },
        updatedAt: { gte: today }
      },
      include: { patient: true },
      orderBy: { queuePosition: 'asc' }
    });

    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// 2. Start consultation (mark as IN_QUEUE / IN_PROGRESS)
router.post('/start/:appointmentId', authenticateToken, requireRole(['DOCTOR', 'ADMIN']), async (req: AuthRequest, res) => {
  const { appointmentId } = req.params;
  const userId = req.user!.id;

  try {
    let doctorIdToAssign = null;
    if (req.user!.role !== 'ADMIN') {
      const doctorProfile = await prisma.doctorProfile.findUnique({ where: { userId: req.user!.id } });
      doctorIdToAssign = doctorProfile?.id;
    } else {
      const apt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
      const doctor = await prisma.doctorProfile.findFirst({ where: { departmentId: apt?.departmentId } });
      doctorIdToAssign = doctor?.id;
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CONSULTING', doctorId: doctorIdToAssign },
      include: { patient: true }
    });

    // Notify displays and patients
    io.emit('queue_update', { departmentId: updated.departmentId });

    // Notify patient
    await sendNotification(
      updated.patient.phone,
      `It's your turn! Please proceed to Dr. ${req.user!.firstName}'s room.`
    );

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to start consultation' });
  }
});

// 3. Complete consultation
router.post('/complete/:appointmentId', authenticateToken, requireRole(['DOCTOR', 'ADMIN']), async (req: AuthRequest, res) => {
  const { appointmentId } = req.params;
  const { notes } = req.body;
  const userId = req.user!.id;

  try {
    const doctorProfile = await prisma.doctorProfile.findUnique({ where: { userId } });

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'COMPLETED' }
    });

    if (notes) {
      await prisma.queueLog.create({
        data: {
          appointmentId,
          status: 'COMPLETED',
          notes
        }
      });
    }

    if (doctorProfile) {
      await recalculateQueue(doctorProfile.id, updated.departmentId);
    }

    // Notify displays and patients
    io.emit('queue_update', { departmentId: updated.departmentId });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete consultation' });
  }
});

export default router;
