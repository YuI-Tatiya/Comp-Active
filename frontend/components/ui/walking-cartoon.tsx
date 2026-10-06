import { cn } from "@/lib/utils"

interface WalkingCartoonProps {
    className?: string
}

/**
 * ตัวการ์ตูนเล็กเดินไปมาบนแถบหัวเรื่อง — แอนิเมชันทั้งหมดเป็น CSS (ดูคลาส .walker-* ใน app/globals.css)
 * ใส่ไว้ท้าย <Container> ของแถบ แล้วดึงลงด้วย -mb ให้เท้าอยู่บนเส้นขอบล่างของแถบ
 * decorative ล้วน: aria-hidden + pointer-events-none ไม่บังการคลิก; prefers-reduced-motion → ยืนนิ่ง
 */
export function WalkingCartoon({ className }: WalkingCartoonProps) {
    return (
        <div aria-hidden="true" className={cn("pointer-events-none relative h-16 overflow-hidden", className)}>
            <div className="walker-track absolute bottom-0 left-0">
                <div className="walker-face">
                    <div className="walker-bob">
                        <svg viewBox="0 0 48 64" className="block h-auto w-full" role="presentation">
                            {/* เงาใต้เท้า */}
                            <ellipse cx="24" cy="62.5" rx="12" ry="1.6" fill="#0f172a" fillOpacity="0.12" />

                            {/* ขา (กางเกงน้ำเงิน + รองเท้า) */}
                            <g className="walker-limb" style={{ transformOrigin: "20px 46px" }}>
                                <rect x="17" y="46" width="6" height="13" rx="3" fill="#3b82f6" />
                                <ellipse cx="21" cy="60" rx="5.5" ry="3" fill="#1e3a8a" />
                            </g>
                            <g className="walker-limb walker-limb-b" style={{ transformOrigin: "28px 46px" }}>
                                <rect x="25" y="46" width="6" height="13" rx="3" fill="#3b82f6" />
                                <ellipse cx="29" cy="60" rx="5.5" ry="3" fill="#1e3a8a" />
                            </g>

                            {/* แขน (แขนเสื้อส้ม + มือ) — แกว่งสลับกับขา */}
                            <g className="walker-limb walker-limb-b" style={{ transformOrigin: "12.5px 32px" }}>
                                <rect x="10" y="31" width="5" height="13" rx="2.5" fill="#fb923c" />
                                <circle cx="12.5" cy="45" r="2.6" fill="#ffd8b5" />
                            </g>
                            <g className="walker-limb" style={{ transformOrigin: "35.5px 32px" }}>
                                <rect x="33" y="31" width="5" height="13" rx="2.5" fill="#fb923c" />
                                <circle cx="35.5" cy="45" r="2.6" fill="#ffd8b5" />
                            </g>

                            {/* ตัวเสื้อ */}
                            <rect x="14" y="29" width="20" height="19" rx="7" fill="#fb923c" />
                            <rect x="14" y="38" width="20" height="3.5" fill="#fde047" />

                            {/* หัว */}
                            <circle cx="24" cy="19" r="11" fill="#ffd8b5" />
                            <circle cx="18" cy="23.5" r="2.2" fill="#fb7185" fillOpacity="0.55" />
                            <circle cx="30" cy="23.5" r="2.2" fill="#fb7185" fillOpacity="0.55" />
                            <circle cx="20.5" cy="20" r="1.5" fill="#1f2937" />
                            <circle cx="27.5" cy="20" r="1.5" fill="#1f2937" />
                            <path d="M21 25 q3 3 6 0" fill="none" stroke="#1f2937" strokeWidth="1.3" strokeLinecap="round" />

                            {/* หมวกสีชมพู + ปอมสีเหลือง */}
                            <path d="M12.5 17 a11.5 11.5 0 0 1 23 0 z" fill="#ec4899" />
                            <rect x="11" y="15.8" width="26" height="3.4" rx="1.7" fill="#db2777" />
                            <circle cx="24" cy="5" r="3.2" fill="#facc15" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    )
}
