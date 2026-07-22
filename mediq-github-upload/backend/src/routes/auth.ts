import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-mediqueue-key';

// In-memory store for OTPs (Simulation)
// In production, use Redis
const otpStore = new Map<string, string>();

// 1. Patient OTP Request (Login or Register)
router.post('/patient/request-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number is required' });

  // Simulate OTP generation
  const otp = '1234'; // Hardcoded for demo/development
  otpStore.set(phone, otp);

  // In production, send SMS via Twilio/etc here.
  console.log(`[Simulation] OTP for ${phone} is ${otp}`);

  res.json({ message: 'OTP sent successfully (Simulated as 1234)' });
});

// 2. Patient OTP Verification
router.post('/patient/verify-otp', async (req, res) => {
  const { phone, otp, firstName, lastName } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required' });

  const storedOtp = otpStore.get(phone);
  if (storedOtp !== otp) {
    return res.status(401).json({ error: 'Invalid OTP' });
  }

  otpStore.delete(phone); // Consume OTP

  try {
    // Find or create user
    let user = await prisma.user.findUnique({ where: { phone } });
    
    if (!user) {
      if (!firstName || !lastName) {
         return res.status(400).json({ error: 'First name and last name required for new registration' });
      }
      user = await prisma.user.create({
        data: {
          phone,
          firstName,
          lastName,
          role: 'PATIENT',
          patientProfile: {
            create: {}
          }
        }
      });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user: { id: user.id, firstName: user.firstName, lastName: user.lastName, role: user.role, phone: user.phone } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Hospital Staff Login (Admin, Doctor, Receptionist)
router.post('/staff/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || user.role === 'PATIENT') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    
    res.json({ token, user: { id: user.id, firstName: user.firstName, lastName: user.lastName, role: user.role, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
