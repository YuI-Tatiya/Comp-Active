import { SurveyQuestionType } from '../../../common/enums/status.enum';

/**
 * สร้างผลสรุปแบบสำรวจจากคำถาม + คำตอบดิบ
 *
 * ใช้ร่วมกันระหว่าง EventsService (แบบสำรวจระดับงาน) และ ActivitiesService
 * (กิจกรรมเดี่ยวที่ไม่มีงานแม่) เพื่อให้ทั้งสอง endpoint คืน response หน้าตาเดียวกันเป๊ะ
 * — frontend จึงใช้คอมโพเนนต์ตัวเดียวแสดงผลได้ทั้งสองหน้า
 */

interface RawAnswer {
  ratingValue: number | null;
  textValue: string | null;
  registration: {
    id: number;
    student: { id: number; name: string; studentId: string | null };
    activity: { id: number; name: string };
  };
}

interface RawQuestion {
  id: number;
  label: string;
  type: string;
  scaleMax: number;
  answers: RawAnswer[];
}

export function buildSurveyResults(surveyQuestions: RawQuestion[]) {
  const questions = surveyQuestions.map((q) => {
    if (q.type === SurveyQuestionType.RATING) {
      const ratings = q.answers.map((a) => a.ratingValue).filter((v): v is number => v !== null);
      const average = ratings.length ? ratings.reduce((sum, v) => sum + v, 0) / ratings.length : 0;

      // จำนวนคนที่ให้แต่ละคะแนน 1..scaleMax — frontend ใช้ทำกราฟแท่ง ไม่ใช่แค่ค่าเฉลี่ยเส้นเดียว
      const distribution: Record<number, number> = {};
      for (let score = 1; score <= q.scaleMax; score++) distribution[score] = 0;
      for (const v of ratings) distribution[v] = (distribution[v] ?? 0) + 1;

      return {
        questionId: q.id,
        label: q.label,
        type: q.type,
        scaleMax: q.scaleMax,
        responseCount: ratings.length,
        average: Number(average.toFixed(2)),
        distribution,
      };
    }

    const responses = q.answers.map((a) => a.textValue).filter((v): v is string => !!v);
    return {
      questionId: q.id,
      label: q.label,
      type: q.type,
      responseCount: responses.length,
      responses,
    };
  });

  // ผลรายบุคคล — รวมคำตอบทุกข้อของ registration เดียวกันเข้าเป็นแถวเดียว
  // ให้ organizer ดูได้ว่า "นักศึกษาคนไหนตอบว่าอะไรบ้าง" ไม่ใช่แค่ค่าสรุปรวม
  const byRegistration = new Map<
    number,
    {
      registrationId: number;
      student: { id: number; name: string; studentId: string | null };
      activityId: number;
      activityName: string;
      answers: Record<number, { ratingValue: number | null; textValue: string | null }>;
    }
  >();

  for (const q of surveyQuestions) {
    for (const a of q.answers) {
      const reg = a.registration;
      if (!byRegistration.has(reg.id)) {
        byRegistration.set(reg.id, {
          registrationId: reg.id,
          student: { id: reg.student.id, name: reg.student.name, studentId: reg.student.studentId },
          activityId: reg.activity.id,
          activityName: reg.activity.name,
          answers: {},
        });
      }
      byRegistration.get(reg.id)!.answers[q.id] = { ratingValue: a.ratingValue, textValue: a.textValue };
    }
  }

  return { questions, respondents: [...byRegistration.values()] };
}
