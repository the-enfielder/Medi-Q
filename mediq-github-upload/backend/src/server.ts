import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import authRoutes from './routes/auth';
import appointmentRoutes from './routes/appointments';
import departmentRoutes from './routes/departments';
import doctorRoutes from './routes/doctor';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/upload';
import { prisma } from './prisma';
import path from 'path';

const app = express();
const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: {
    origin: '*', // We will restrict this in production
  },
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MediQueue AI Backend is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// Fallback to React Router
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});


// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
