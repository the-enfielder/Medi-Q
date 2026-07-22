import { prisma } from '../prisma';

export const AVG_CONSULTATION_MINUTES = 15;

/**
 * Recalculates expected waiting times for a specific doctor's queue.
 */
export async function recalculateQueue(doctorId: string, departmentId: string) {
  // Fetch all pending/in-queue patients for this doctor/department today
  const today = new Date();
  today.setHours(0,0,0,0);

  const queue = await prisma.appointment.findMany({
    where: {
      departmentId,
      status: 'IN_QUEUE',
      updatedAt: { gte: today }
    },
    orderBy: [
      { priority: 'desc' }, // EMERGENCY > HIGH > NORMAL > LOW (String descending might not perfectly sort this way, but we can do it in memory for demo)
      { queuePosition: 'asc' }
    ]
  });

  // Sort queue intelligently: Emergency first, then by queue position
  const priorityMap: Record<string, number> = { 'EMERGENCY': 4, 'HIGH': 3, 'NORMAL': 2, 'LOW': 1 };
  
  queue.sort((a, b) => {
    const pA = priorityMap[a.priority] || 2;
    const pB = priorityMap[b.priority] || 2;
    if (pA !== pB) return pB - pA; // Higher priority first
    return (a.queuePosition || 999) - (b.queuePosition || 999);
  });

  // Calculate times
  let accumulatedWait = 0;
  
  for (let i = 0; i < queue.length; i++) {
    const app = queue[i];
    // Update appointment with new wait time
    await prisma.appointment.update({
      where: { id: app.id },
      data: { estimatedWait: accumulatedWait }
    });

    // Check if wait time is 30 mins or less (but not 0, which means consulting)
    if (accumulatedWait > 0 && accumulatedWait <= 30) {
      // Check if a reminder was already sent today for this patient
      const alreadySent = await prisma.notification.findFirst({
        where: {
          userId: app.patientId,
          title: 'Turn Reminder',
          createdAt: { gte: today }
        }
      });

      if (!alreadySent) {
        const patient = await prisma.user.findUnique({ where: { id: app.patientId } });
        if (patient) {
          console.log(`\n----------------------------------------`);
          console.log(`📱 SMS SENT TO: ${patient.phone}`);
          console.log(`✉️  MESSAGE: Reminder: Your turn is approaching in approximately ${accumulatedWait} minutes. Please be near the consultation room.`);
          console.log(`----------------------------------------\n`);
          
          await prisma.notification.create({
            data: {
              userId: app.patientId,
              title: 'Turn Reminder',
              message: `Your turn is approaching in approximately ${accumulatedWait} minutes.`,
              type: 'SMS'
            }
          });
        }
      }
    }

    accumulatedWait += AVG_CONSULTATION_MINUTES;
  }
}
