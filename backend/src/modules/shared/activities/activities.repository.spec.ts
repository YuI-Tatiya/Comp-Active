import { ActivitiesRepository, activityInclude } from "./activities.repository";

describe("activityInclude", () => {
  it("selects Event.isPublic + organizerId — the public feed/detail gate (canViewerSeeEvent) fails closed without them", () => {
    expect(activityInclude.event.select.isPublic).toBe(true);
    expect(activityInclude.event.select.organizerId).toBe(true);
  });
});

/**
 * newsfeed (Developer API) และแชทบอทไม่มีผู้ใช้ให้เช็คสิทธิ์ จึงกรองที่ DB — ต้องตัดทั้งงาน restricted และงานที่ไม่เผยแพร่
 * ใน NOT ก้อนเดียว (spread สอง object ที่มี key NOT จะทับกันเหลือก้อนหลัง — เงื่อนไขแรกหายเงียบๆ)
 */
describe("ActivitiesRepository — queries without a viewer exclude restricted and unpublished events", () => {
  const expectedExclusion = {
    event: { OR: [{ visibility: "restricted" }, { isPublic: false }] },
  };

  function setup() {
    const findMany = jest.fn().mockResolvedValue([]);
    const findFirst = jest.fn().mockResolvedValue(null);
    const repo = new ActivitiesRepository({
      activity: { findMany, findFirst },
    } as any);
    return { repo, findMany, findFirst };
  }

  it("findAllForNewsfeed", async () => {
    const { repo, findMany } = setup();
    await repo.findAllForNewsfeed();
    expect(findMany.mock.calls[0][0].where.NOT).toEqual(expectedExclusion);
  });

  it("findByIdForNewsfeed", async () => {
    const { repo, findFirst } = setup();
    await repo.findByIdForNewsfeed(1);
    expect(findFirst.mock.calls[0][0].where).toMatchObject({
      id: 1,
      NOT: expectedExclusion,
    });
  });

  it("findOpenForChatbot", async () => {
    const { repo, findMany } = setup();
    await repo.findOpenForChatbot();
    expect(findMany.mock.calls[0][0].where.NOT).toEqual(expectedExclusion);
  });
});
