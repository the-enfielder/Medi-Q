import bcrypt from 'bcryptjs';
import { prisma } from '../src/prisma';

async function main() {
  const adminPassword = await bcrypt.hash('stvrduxt', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'sral' },
    update: {},
    create: {
      email: 'sral',
      phone: '0000000001',
      passwordHash: adminPassword,
      firstName: 'System',
      lastName: 'Admin',
      role: 'ADMIN'
    }
  });

  console.log({ admin });
  
  const doctorPassword = await bcrypt.hash('DOC123', 10);

  // We need a department first
  const dept = await prisma.department.upsert({
    where: { code: 'GM' },
    update: {},
    create: {
      name: 'General Medicine',
      code: 'GM'
    }
  });

  const doctor = await prisma.user.upsert({
    where: { email: 'DOCTER' },
    update: {},
    create: {
      email: 'DOCTER',
      phone: '1111111111',
      passwordHash: doctorPassword,
      firstName: 'Dr. DULBU',
      lastName: '',
      role: 'DOCTOR',
      doctorProfile: {
        create: {
          departmentId: dept.id,
          specialization: 'Internal Medicine'
        }
      }
    }
  });

  console.log({ doctor, dept });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
