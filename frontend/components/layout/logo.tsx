/**
 * โลโก้ของระบบ (ธีม Denim Varsity) — wordmark + บรรทัดชื่อวิทยาลัย (ไม่มีกล่องไอคอน "</>" แล้ว ตามที่ขอ)
 * ใช้ใน header ทุกพอร์ทัล (SiteHeader ฝั่ง public, AppHeader ฝั่งนักศึกษา/ผู้จัด)
 */
export function DenimLogo() {
    return (
        <span className="flex flex-col leading-[1.1]">
            <span className="font-display text-[22px] font-bold tracking-[-0.01em] text-denim-deep">
                Comp<span className="text-denim-accent">Active</span>
            </span>
            <span className="hidden text-xs text-denim-muted sm:block">วิทยาลัยการคอมพิวเตอร์ มข.</span>
        </span>
    )
}
