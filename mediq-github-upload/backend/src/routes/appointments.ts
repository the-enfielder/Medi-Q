import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { io } from '../server';
import { recalculateQueue } from '../services/queueEngine';
import { sendNotification } from '../services/notificationService';

const router = Router();

// 0. Patient Tracks an Appointment (Public Route)
router.get('/track', async (req, res) => {
  const { query } = req.query; // can be phone or tokenNumber
  
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Phone number or Token number is required' });
  }

  try {
    let user;
    let appointments;

    // Check if it looks like a token (e.g., GM-001)
    if (query.includes('-')) {
      const app = await prisma.appointment.findFirst({
        where: { tokenNumber: query.toUpperCase() },
        include: { patient: true, department: true, queueLogs: true }
      });
      if (!app) return res.status(404).json({ error: 'No appointment found with this token' });
      
      user = app.patient;
      appointments = [app];
    } else {
      user = await prisma.user.findUnique({
        where: { phone: query }
      });

      if (!user) {
        return res.status(404).json({ error: 'No patient found with this phone number' });
      }

      appointments = await prisma.appointment.findMany({
        where: { patientId: user.id },
        include: { department: true, queueLogs: true },
        orderBy: { createdAt: 'desc' }
      });
    }

    res.json({ patient: user, appointments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track appointments' });
  }
});

// 1. Patient Books an Appointment (Public/Patient Route)
router.post('/book', async (req, res) => {
  const { 
    patientId, 
    firstName, lastName, phone, 
    departmentId, reason, symptoms, priority, preferredDate, preferredTime,
    attachmentUrl
  } = req.body;

  try {
    // Basic validation
    if (!phone || !departmentId || !reason || !preferredDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let user = null;

    if (patientId) {
      user = await prisma.user.findUnique({ where: { id: patientId } });
    } else {
      // Find or create patient by phone
      user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            phone,
            firstName: firstName || 'Guest',
            lastName: lastName || 'Patient',
            role: 'PATIENT'
          }
        });
      }
    }

    if (!user) {
      return res.status(404).json({ error: 'Patient not found or could not be created' });
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: user.id,
        departmentId,
        reason,
        symptoms,
        priority: priority || 'NORMAL',
        preferredDate: new Date(preferredDate),
        preferredTime,
        status: 'PENDING',
        attachmentUrl
      }
    });

    // Notify patient
    await sendNotification(
      user.phone, 
      `Hello ${user.firstName}, your appointment request has been received. We will notify you once it's confirmed.`
    );

    res.status(201).json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to book appointment' });
  }
});

// 1.5 Patient Self Check-in (Public Route)
router.post('/checkin', async (req, res) => {
  const { tokenNumber } = req.body;

  if (!tokenNumber) {
    return res.status(400).json({ error: 'Token number is required' });
  }

  try {
    const today = new Date();
    today.setHours(0,0,0,0);

    const appointment = await prisma.appointment.findFirst({
      where: { tokenNumber: tokenNumber.toUpperCase(), status: 'APPROVED', updatedAt: { gte: today } },
      include: { department: true }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Invalid token or already checked in. Please check with reception.' });
    }

    // Check if the doctor is free
    const activeConsultations = await prisma.appointment.count({
      where: { departmentId: appointment.departmentId, status: 'CONSULTING', updatedAt: { gte: today } }
    });
    
    const waitingPatients = await prisma.appointment.count({
      where: { departmentId: appointment.departmentId, status: 'IN_QUEUE', updatedAt: { gte: today } }
    });

    let newStatus = 'IN_QUEUE';
    let assignedDoctorId = null;

    if (activeConsultations === 0 && waitingPatients === 0) {
      // Find a doctor in this department to assign
      const doctor = await prisma.doctorProfile.findFirst({
        where: { departmentId: appointment.departmentId }
      });
      if (doctor) {
        newStatus = 'CONSULTING';
        assignedDoctorId = doctor.id;
      }
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { 
        status: newStatus,
        ...(assignedDoctorId ? { doctorId: assignedDoctorId } : {})
      }
    });

    // Recalculate queue & broadcast
    await recalculateQueue('', updated.departmentId);
    io.emit('queue_update', { departmentId: updated.departmentId });

    res.json({ message: 'Check-in successful', appointment: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check-in patient' });
  }
});

// 2. Receptionist gets all pending appointments
router.get('/pending', authenticateToken, requireRole(['RECEPTIONIST', 'ADMIN', 'DOCTOR']), async (req: AuthRequest, res) => {
  try {
    const pending = await prisma.appointment.findMany({
      where: { status: 'PENDING' },
      include: {
        patient: true,
        department: true
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending appointments' });
  }
});

// 3. Receptionist approves an appointment & generates Token
router.post('/:id/approve', authenticateToken, requireRole(['RECEPTIONIST', 'ADMIN', 'DOCTOR']), async (req: AuthRequest, res) => {
  const { id } = req.params;
  
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { department: true }
    });

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    // Generate token: e.g. GM-051
    // Simplistic generation for demo: Count today's approved appointments for this dept
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const count = await prisma.appointment.count({
      where: {
        departmentId: appointment.departmentId,
        status: { in: ['APPROVED', 'IN_QUEUE', 'COMPLETED'] },
        updatedAt: { gte: today }
      }
    });

    const tokenNumber = `${appointment.department.code}-${String(count + 1).padStart(3, '0')}`;

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'APPROVED',
        tokenNumber,
        queuePosition: count + 1
      },
      include: { patient: true, department: true }
    });

    // Notify displays and patients
    io.emit('queue_update', { departmentId: updated.departmentId });
    // Recalculate (in a real app, find the doctor assigned to this dept)
    await recalculateQueue('', updated.departmentId);

    // Notify Patient
    await sendNotification(
      updated.patient.phone,
      `Your appointment is confirmed! Your token number is ${updated.tokenNumber}. You are #${updated.queuePosition} in queue for ${updated.department.name}.`
    );

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve appointment' });
  }
});

// 4. Receptionist rejects an appointment
router.post('/:id/reject', authenticateToken, requireRole(['RECEPTIONIST', 'ADMIN', 'DOCTOR']), async (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });
    
    io.emit('queue_update', { departmentId: updated.departmentId });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject appointment' });
  }
});

export default router;
