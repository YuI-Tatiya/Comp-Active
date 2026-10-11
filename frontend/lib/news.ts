/**
 * ข่าวสารและประกาศ — แหล่งเดียวของทั้งสองหน้า: หน้าแรก (/) วาดเป็นสไลด์ข้อความธีม Denim (components/home/news-showcase.tsx)
 * ส่วน /student ยังแสดงเป็นภาพแบนเนอร์ (components/ui/news-carousel.tsx) — แก้ข่าวที่นี่ที่เดียวเห็นผลทั้งสองที่
 *
 * ข้อความถอดจากภาพแบนเนอร์ใน public/new*.png ตรงๆ (ข้อมูลชุดเดิมในโค้ดเป็นข่าวเก่าที่ไม่ตรงกับภาพแล้ว
 * แต่ยังถูกใช้เป็น alt ของภาพอยู่ — screen reader จึงอ่านข่าวผิดเรื่องมาตลอด)
 */
export interface NewsItem {
    /** ป้ายประเภทบนสไลด์ */
    tag: string
    /** หัวข้อเต็มแบบข้อความล้วน — alt ของภาพแบนเนอร์ / ชื่อสไลด์สำหรับ screen reader */
    title: string
    /** หัวข้อแบ่งบรรทัด — ช่วงที่ highlight แสดงเป็นสีอำพัน */
    headline: { text: string; highlight?: boolean }[][]
    desc: string
    /** แถบความคืบหน้าแบบเทอร์มินัลใต้คำอธิบาย (ใช้อันใดอันหนึ่งกับ chips) */
    progress?: { label: string; value: number }
    chips?: string[]
    /** ข้อความบนการ์ดเล็กข้างมาสคอต — construction = แถบลายเตือน "กำลังก่อสร้าง" */
    note: string
    construction?: boolean
    /** ภาพแบนเนอร์ของสไลด์แบบภาพ (/student) */
    image: string
}

export const NEWS_ITEMS: NewsItem[] = [
    {
        tag: "ประกาศ · ระบบ",
        title: "เว็บไซต์ Comp Active อยู่ในช่วงพัฒนา",
        headline: [[{ text: "เว็บไซต์ " }, { text: "Comp Active", highlight: true }], [{ text: "อยู่ในช่วงพัฒนา" }]],
        desc: "เรากำลังพัฒนาเว็บไซต์เพื่อมอบประสบการณ์ที่ดียิ่งขึ้น เร็ว ๆ นี้พบกับฟีเจอร์และกิจกรรมที่น่าสนใจอีกมากมาย",
        progress: { label: "UNDER_DEVELOPMENT", value: 66 },
        note: "building...",
        construction: true,
        image: "/new2.png",
    },
    {
        tag: "กำลังใจ · สอบ",
        title: "สู้สุดใจ สอบครั้งนี้ต้องปัง!",
        headline: [[{ text: "สู้สุดใจ" }], [{ text: "สอบครั้งนี้ต้องปัง!", highlight: true }]],
        desc: "ความพยายามในวันนี้ คือความสำเร็จในวันข้างหน้า ทำให้เต็มที่ แล้วผลลัพธ์จะเป็นของเรา",
        chips: ["ตั้งใจ", "ไม่ยอมแพ้", "เข้าใจ", "ทำได้แน่นอน!"],
        note: "focus · plan · study",
        image: "/new1.png",
    },
    {
        tag: "กำลังใจ · ถึงน้อง ๆ",
        title: "เป็นกำลังใจให้น้อง ๆ ทุกคนที่กำลังสอบอยู่!",
        headline: [[{ text: "เป็นกำลังใจให้น้อง ๆ" }], [{ text: "ทุกคนที่กำลังสอบอยู่!", highlight: true }]],
        desc: "ทำให้ดีที่สุด เชื่อมั่นในตัวเอง ความพยายามของวันนี้คือก้าวสำคัญสู่ความสำเร็จ พี่ ๆ เป็นกำลังใจให้นะ",
        chips: ["ตั้งใจ", "เข้าใจ", "ไม่ยอมแพ้", "สู้ ๆ นะ"],
        note: "สู้ ๆ นะ ♥",
        image: "/new3.png",
    },
]
