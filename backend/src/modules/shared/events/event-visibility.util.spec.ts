import {
  canViewerSeeEvent,
  filterVisibleActivities,
} from "./event-visibility.util";

/**
 * canViewerSeeEvent = กติกาการเผยแพร่ (isPublic) + กติกา restricted — ทุกเส้นทางสาธารณะ (รายการ/รายละเอียด/ลงทะเบียน)
 * ใช้ตัวนี้ตัวเดียว "ปิดการใช้งานกิจกรรมถาวร" (isPublic=false) เดิมไม่ถูกเช็คเลย งานที่ปิดแล้วจึงยังแสดงและลงทะเบียนได้
 */
describe("canViewerSeeEvent", () => {
  const OWNER = 7;
  const event = (overrides: Record<string, unknown> = {}) => ({
    visibility: "everyone",
    visibilityStudentIdFilter: null,
    visibilityProgram: [] as { programCode: string }[],
    visibilityYears: [] as { year: number }[],
    isPublic: true,
    organizerId: OWNER,
    ...overrides,
  });
  const student = {
    id: 5,
    role: "student",
    studentId: "653380001-1",
    program: "IT",
  };

  it("shows a published, unrestricted event to everyone, guests included", () => {
    expect(canViewerSeeEvent(null, event())).toBe(true);
    expect(canViewerSeeEvent(student, event())).toBe(true);
  });

  it("hides an unpublished event from guests, students and other organizers", () => {
    const hidden = event({ isPublic: false });
    expect(canViewerSeeEvent(null, hidden)).toBe(false);
    expect(canViewerSeeEvent(undefined, hidden)).toBe(false);
    expect(canViewerSeeEvent(student, hidden)).toBe(false);
    expect(canViewerSeeEvent({ id: 8, role: "organizer" }, hidden)).toBe(false);
  });

  it("lets the owning organizer and admins see an unpublished event", () => {
    const hidden = event({ isPublic: false });
    expect(canViewerSeeEvent({ id: OWNER, role: "organizer" }, hidden)).toBe(
      true,
    );
    expect(canViewerSeeEvent({ id: 1, role: "admin" }, hidden)).toBe(true);
  });

  it("does not treat a viewer without an id as the owner of an event without an organizerId", () => {
    // undefined === undefined — ต้องไม่หลุดเป็น "เจ้าของ" เมื่อทั้งสองฝั่งไม่มีค่า
    expect(
      canViewerSeeEvent(
        { role: "student" },
        event({ isPublic: false, organizerId: undefined }),
      ),
    ).toBe(false);
  });

  it("fails closed when the query did not load the publish state", () => {
    expect(canViewerSeeEvent(student, event({ isPublic: undefined }))).toBe(
      false,
    );
  });

  it("still applies the restricted rules on top of publishing — even for the owner", () => {
    const restricted = event({
      visibility: "restricted",
      visibilityProgram: [{ programCode: "CS" }],
    });
    expect(canViewerSeeEvent(student, restricted)).toBe(false);
    expect(canViewerSeeEvent({ ...student, program: "CS" }, restricted)).toBe(
      true,
    );
  });

  it("always passes a standalone activity (no parent event, so nothing to publish)", () => {
    expect(canViewerSeeEvent(null, null)).toBe(true);
  });

  it("filterVisibleActivities applies the same gate to a list", () => {
    const list = [
      { id: 1, event: event() },
      { id: 2, event: event({ isPublic: false }) },
      { id: 3, event: null },
    ];
    expect(filterVisibleActivities(list, student).map((a) => a.id)).toEqual([
      1, 3,
    ]);
    expect(
      filterVisibleActivities(list, { id: OWNER, role: "organizer" }).map(
        (a) => a.id,
      ),
    ).toEqual([1, 2, 3]);
  });
});
