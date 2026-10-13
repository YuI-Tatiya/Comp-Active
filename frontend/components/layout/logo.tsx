/**
 * โลโก้ของระบบ (ธีม Denim Varsity) — กล่องยีนส์ "</>" + wordmark + บรรทัดชื่อวิทยาลัย
 * ใช้ใน header ทุกพอร์ทัล (SiteHeader ฝั่ง public, AppHeader ฝั่งนักศึกษา/ผู้จัด)
 */
export function DenimLogo() {
    return (
        <span className="flex items-center gap-3">
            <span
                aria-hidden="true"
                className="denim-weave grid size-11 shrink-0 place-items-center rounded-xl font-code text-[15px] font-semibold text-white"
            >
                &lt;/&gt;
            </span>
            <span className="flex flex-col leading-[1.1]">
                <span className="font-display text-[22px] font-bold tracking-[-0.01em] text-denim-deep">
                    Comp<span className="text-denim-accent">Active</span>
                </span>
                <span className="hidden text-xs text-denim-muted sm:block">วิทยาลัยการคอมพิวเตอร์ มข.</span>
            </span>
        </span>
    )
}
