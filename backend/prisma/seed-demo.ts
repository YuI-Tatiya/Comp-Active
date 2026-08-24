/**
 * Seed ข้อมูลทดสอบสำหรับหน้าฝั่งนักศึกษา
 *
 * สร้างผู้จัด 1 คน + นักศึกษา 1 คน พร้อมกิจกรรมและการลงทะเบียนที่ครอบคลุมทุกสถานะ
 * ที่หน้า /student/my-registrations แบ่งแท็บไว้ (รอยืนยัน / ยืนยันแล้ว / ประเมินแล้ว / ยกเลิกแล้ว)
 * รวมถึงชั่วโมงจิตอาสาและคะแนน Soft Skills เพื่อให้แถบสรุปผลสะสมมีตัวเลขให้ดู
 *
 * รันซ้ำได้ — จะลบข้อมูลของบัญชีเดโม (อีเมล *.demo@compactive.test) ทิ้งแล้วสร้างใหม่
 * ไม่แตะข้อมูลของบัญชีอื่นเลย
 *
 * ใช้: npm run prisma:seed:demo
 */
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const ORGANIZER_EMAIL = 'organizer.demo@compactive.test';
const STUDENT_EMAIL = 'student.demo@compactive.test';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!';

/** วันที่ห่างจากวันนี้ N วัน (ลบ = อดีต) ตั้งเวลาเที่ยงกันปัญหา timezone คร่อมวัน */
function daysFromNow(n: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

type SkillRate = { skillType: string; rate: number };

interface ActivitySpec {
  name: string;
  description: string;
  category: string;
  dayOffset: number;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number | null;
  /** จำนวนวันก่อนหน้าที่ผู้จัดลงประกาศ — ใช้ทดสอบการเรียง "กิจกรรมที่เพิ่งลงประกาศ" */
  postedDaysAgo: number;
  volunteerHours?: number;
  volunteerRole?: string;
  softSkills?: SkillRate[];
  /** สถานะการลงทะเบียนของนักศึกษาเดโมกับกิจกรรมนี้ — ไม่ใส่ = ไม่ได้ลงทะเบียน */
  registration?: 'pending' | 'confirmed' | 'attended' | 'cancelled';
  evaluationComment?: string;
  /** ผู้จัดยกเลิกทั้งกิจกรรม — ใช้ทดสอบแบนเนอร์แจ้งเตือนในการ์ด */
  cancelledReason?: string;
}

const ACTIVITIES: ActivitySpec[] = [
  // ── เข้าร่วมแล้ว + ประเมินแล้ว (มีชั่วโมงจิตอาสา) ──────────────────────────
  {
    name: 'ค่ายอาสาพัฒนาโรงเรียนบ้านหนองบัว',
    description: 'ร่วมกันซ่อมแซมอาคารเรียนและจัดกิจกรรมนันทนาการให้น้องๆ ในพื้นที่ห่างไกล',
    category: 'Volunteer',
    dayOffset: -45,
    startTime: '08:00',
    endTime: '17:00',
    location: 'โรงเรียนบ้านหนองบัว จ.มหาสารคาม',
    capacity: 40,
    postedDaysAgo: 70,
    volunteerHours: 9,
    volunteerRole: 'อาสาสมัครพัฒนาชุมชน',
    softSkills: [
      { skillType: 'teamwork_collaboration', rate: 9 },
      { skillType: 'leadership', rate: 7 },
      { skillType: 'positive_attitude', rate: 8 },
      { skillType: 'flexibility_adaptability', rate: 6 },
    ],
    registration: 'attended',
    evaluationComment: 'ทำงานร่วมกับทีมได้ดีมาก อาสาช่วยงานหนักโดยไม่ต้องร้องขอ และดูแลน้องๆ ได้อบอุ่น',
  },
  {
    name: 'Workshop: สร้างเว็บแอปด้วย React และ Next.js',
    description: 'เวิร์กช็อปเชิงปฏิบัติการ เรียนรู้ตั้งแต่พื้นฐาน component จนถึงการ deploy จริง',
    category: 'Technology',
    dayOffset: -30,
    startTime: '09:00',
    endTime: '16:00',
    location: 'ห้องปฏิบัติการคอมพิวเตอร์ B301',
    capacity: 30,
    postedDaysAgo: 50,
    softSkills: [
      { skillType: 'complex_problem_solving', rate: 8 },
      { skillType: 'curiosity_lifelong_learning', rate: 9 },
      { skillType: 'analytic_critical_thinking', rate: 7 },
    ],
    registration: 'attended',
    evaluationComment: 'เก็บรายละเอียดดี ถามคำถามที่ลึกและช่วยเพื่อนในกลุ่มแก้บั๊กได้',
  },
  {
    name: 'จิตอาสาปลูกป่าชายเลนเพื่อโลกสีเขียว',
    description: 'กิจกรรมอนุรักษ์สิ่งแวดล้อม ปลูกต้นโกงกางและเก็บขยะชายฝั่ง',
    category: 'Volunteer',
    dayOffset: -14,
    startTime: '07:30',
    endTime: '12:30',
    location: 'ศูนย์อนุรักษ์ป่าชายเลน จ.ระยอง',
    capacity: null,
    postedDaysAgo: 28,
    volunteerHours: 5,
    volunteerRole: 'อาสาสมัครอนุรักษ์สิ่งแวดล้อม',
    softSkills: [
      { skillType: 'teamwork_collaboration', rate: 7 },
      { skillType: 'time_management', rate: 6 },
      { skillType: 'positive_attitude', rate: 9 },
    ],
    registration: 'attended',
  },

  // ── ยืนยันแล้ว รอถึงวันงาน ────────────────────────────────────────────────
  {
    name: 'สัมมนาวิชาการ: ปัญญาประดิษฐ์กับอนาคตการทำงาน',
    description: 'ฟังบรรยายจากผู้เชี่ยวชาญด้าน AI ทั้งภาควิชาการและอุตสาหกรรม',
    category: 'Academic',
    dayOffset: 5,
    startTime: '13:00',
    endTime: '16:30',
    location: 'หอประชุมใหญ่ วิทยาลัยการคอมพิวเตอร์',
    capacity: 200,
    postedDaysAgo: 12,
    registration: 'confirmed',
  },
  {
    name: 'การแข่งขันเขียนโปรแกรมระดับมหาวิทยาลัย',
    description: 'แข่งขันแก้โจทย์อัลกอริทึมแบบทีม ทีมละ 3 คน ชิงทุนการศึกษา',
    category: 'Competition',
    dayOffset: 20,
    startTime: '08:30',
    endTime: '17:00',
    location: 'อาคารปฏิบัติการรวม ชั้น 4',
    capacity: 60,
    postedDaysAgo: 6,
    registration: 'confirmed',
  },

  // ── รอผู้จัดยืนยัน ────────────────────────────────────────────────────────
  {
    name: 'อบรมเชิงปฏิบัติการ: ความปลอดภัยไซเบอร์เบื้องต้น',
    description: 'เรียนรู้การป้องกันภัยคุกคามทางไซเบอร์และการทำ penetration testing เบื้องต้น',
    category: 'Technology',
    dayOffset: 10,
    startTime: '09:00',
    endTime: '15:00',
    location: 'ห้องปฏิบัติการเครือข่าย B205',
    capacity: 25,
    postedDaysAgo: 3,
    registration: 'pending',
  },
  {
    name: 'กีฬาสีวิทยาลัยการคอมพิวเตอร์',
    description: 'การแข่งขันกีฬาเชื่อมความสัมพันธ์ระหว่างสาขา พร้อมกองเชียร์และขบวนพาเหรด',
    category: 'Sports',
    dayOffset: 3,
    startTime: '07:00',
    endTime: '18:00',
    location: 'สนามกีฬากลาง มหาวิทยาลัย',
    capacity: null,
    postedDaysAgo: 1,
    registration: 'pending',
  },

  // ── ยกเลิกแล้ว ────────────────────────────────────────────────────────────
  {
    name: 'นิทรรศการศิลปะดิจิทัลและสื่อผสม',
    description: 'จัดแสดงผลงานศิลปะดิจิทัลจากนักศึกษาและศิลปินรับเชิญ',
    category: 'Art & Culture',
    dayOffset: 15,
    startTime: '10:00',
    endTime: '19:00',
    location: 'หอศิลป์ มหาวิทยาลัย',
    capacity: 100,
    postedDaysAgo: 9,
    registration: 'cancelled',
  },
  {
    name: 'ค่ายเตรียมความพร้อมสหกิจศึกษา',
    description: 'เตรียมตัวก่อนออกฝึกงาน ทั้งการเขียนเรซูเม่และการสัมภาษณ์งาน',
    category: 'Academic',
    dayOffset: 8,
    startTime: '09:00',
    endTime: '16:00',
    location: 'ห้องประชุม A101',
    capacity: 50,
    postedDaysAgo: 20,
    registration: 'confirmed',
    cancelledReason: 'วิทยากรหลักติดภารกิจฉุกเฉิน ขอเลื่อนการจัดกิจกรรมออกไปก่อน',
  },

  // ── ไม่ได้ลงทะเบียน — ไว้ให้หน้า /events กับ /student/events มีของให้กรอง ──
  {
    name: 'Hackathon 48 ชั่วโมง: นวัตกรรมเพื่อชุมชน',
    description: 'ระดมสมองและพัฒนาต้นแบบซอฟต์แวร์แก้ปัญหาชุมชนภายใน 48 ชั่วโมง',
    category: 'Competition',
    dayOffset: 25,
    startTime: '09:00',
    endTime: '21:00',
    location: 'อาคารนวัตกรรม ชั้น 2',
    capacity: 80,
    postedDaysAgo: 2,
  },
  {
    name: 'อาสาสมัครสอนน้องเขียนโปรแกรม',
    description: 'สอนพื้นฐานการเขียนโปรแกรม Scratch และ Python ให้นักเรียนมัธยมต้น',
    category: 'Volunteer',
    dayOffset: 12,
    startTime: '13:00',
    endTime: '16:00',
    location: 'โรงเรียนสาธิตมหาวิทยาลัย',
    capacity: 20,
    postedDaysAgo: 4,
    volunteerHours: 3,
    volunteerRole: 'อาสาสมัครผู้ช่วยสอน',
  },
  {
    name: 'ชมรมดนตรีเปิดบ้าน: Open Mic Night',
    description: 'เวทีเปิดสำหรับนักศึกษาที่อยากแสดงความสามารถทางดนตรี',
    category: 'Art & Culture',
    dayOffset: 1,
    startTime: '18:00',
    endTime: '21:00',
    location: 'ลานกิจกรรมหน้าอาคารเรียนรวม',
    capacity: null,
    postedDaysAgo: 5,
  },
  {
    name: 'วิ่งการกุศล Comp Run 2026',
    description: 'งานวิ่งการกุศลระยะ 5 กม. รายได้สมทบทุนการศึกษาให้นักศึกษาขาดแคลน',
    category: 'Sports',
    dayOffset: 40,
    startTime: '05:30',
    endTime: '09:00',
    location: 'รอบมหาวิทยาลัย',
    capacity: 500,
    postedDaysAgo: 15,
    volunteerHours: 3.5,
    volunteerRole: 'อาสาสมัครประจำจุดบริการน้ำ',
  },
];

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new (PrismaClient as any)({ adapter });

  // ── ลบข้อมูลเดโมเดิม (เฉพาะ 2 บัญชีนี้เท่านั้น) ─────────────────────────
  // เรียงลำดับเอง ไม่พึ่ง cascade ล้วน เพราะ Evaluation.evaluator ไม่ได้ตั้ง onDelete
  // ไว้ ถ้าลบ user ก่อนจะติด foreign key constraint
  const demoUsers = await prisma.user.findMany({
    where: { email: { in: [ORGANIZER_EMAIL, STUDENT_EMAIL] } },
    select: { id: true },
  });

  if (demoUsers.length > 0) {
    const ids = demoUsers.map((u: { id: number }) => u.id);
    await prisma.evaluation.deleteMany({
      where: { OR: [{ evaluatorId: { in: ids } }, { registration: { studentId: { in: ids } } }] },
    });
    await prisma.registration.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.activity.deleteMany({ where: { organizerId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    console.log(`ล้างข้อมูลเดโมเดิมแล้ว (${ids.length} บัญชี)`);
  }

  const hashed = await bcrypt.hash(DEMO_PASSWORD, 10);

  const organizer = await prisma.user.create({
    data: {
      name: 'ชมรมกิจกรรมนักศึกษา (เดโม)',
      email: ORGANIZER_EMAIL,
      password: hashed,
      role: 'organizer',
    },
  });

  const student = await prisma.user.create({
    data: {
      name: 'สมชาย ใจดี (เดโม)',
      email: STUDENT_EMAIL,
      password: hashed,
      role: 'student',
      studentId: '65011212001',
      phone: '0812345678',
      educationLevel: 'bachelor',
      program: 'cs',
    },
  });

  let registrationCount = 0;
  let evaluationCount = 0;

  for (const spec of ACTIVITIES) {
    const date = daysFromNow(spec.dayOffset);
    const isPast = spec.dayOffset < 0;

    const activity = await prisma.activity.create({
      data: {
        organizerId: organizer.id,
        name: spec.name,
        description: spec.description,
        category: spec.category,
        date,
        startTime: spec.startTime,
        endTime: spec.endTime,
        location: spec.location,
        capacity: spec.capacity,
        status: isPast ? 'completed' : 'open',
        approvalStatus: spec.cancelledReason ? 'cancelled' : 'approved',
        cancellationReason: spec.cancelledReason ?? null,
        volunteerHours: spec.volunteerHours ?? null,
        volunteerRole: spec.volunteerRole ?? null,
        createdAt: daysFromNow(-spec.postedDaysAgo),
        softSkills: spec.softSkills
          ? { create: spec.softSkills.map((s) => ({ skillType: s.skillType as any, rate: s.rate })) }
          : undefined,
      },
    });

    if (!spec.registration) continue;

    const attended = spec.registration === 'attended';
    // เช็คอินตอนเริ่มงาน — ให้เวลาสมเหตุสมผลกับวันจัดกิจกรรม
    const checkInTime = attended
      ? new Date(`${date.toISOString().slice(0, 10)}T${spec.startTime}:00`)
      : null;

    const registration = await prisma.registration.create({
      data: {
        activityId: activity.id,
        studentId: student.id,
        registerDate: daysFromNow(spec.dayOffset - 7),
        status:
          spec.registration === 'cancelled'
            ? 'cancelled'
            : spec.registration === 'pending'
              ? 'pending'
              : 'confirmed',
        attendance: attended ? 'attended' : 'absent',
        checkInTime,
      },
    });
    registrationCount++;

    // เลียนแบบ checkIn() ของจริง — คัดลอกคะแนนจาก ActivitySoftSkill ของกิจกรรมนั้น
    if (attended) {
      const scores: Record<string, number> = {};
      for (const s of spec.softSkills ?? []) {
        // enum เป็น snake_case ส่วนคอลัมน์ใน Evaluation เป็น camelCase
        const field = s.skillType.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
        scores[field] = s.rate;
      }
      await prisma.evaluation.create({
        data: {
          registrationId: registration.id,
          evaluatorId: organizer.id,
          ...scores,
          comment: spec.evaluationComment ?? null,
          createdAt: checkInTime ?? date,
        },
      });
      evaluationCount++;
    }
  }

  console.log('');
  console.log('สร้างข้อมูลทดสอบเรียบร้อย');
  console.log(`  กิจกรรม        ${ACTIVITIES.length} รายการ`);
  console.log(`  ลงทะเบียน      ${registrationCount} รายการ`);
  console.log(`  ผลประเมิน      ${evaluationCount} รายการ`);
  console.log('');
  console.log('เข้าสู่ระบบด้วย:');
  console.log(`  นักศึกษา   ${STUDENT_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  ผู้จัด     ${ORGANIZER_EMAIL} / ${DEMO_PASSWORD}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
