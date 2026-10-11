import { RegistrationsRepository } from './registrations.repository';

describe('RegistrationsRepository.findActivityWithActiveCount', () => {
  it('selects Event.registrationCloseAt — without it the deadline check in create() would silently never fire', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const repo = new RegistrationsRepository({ activity: { findUnique } } as any);

    await repo.findActivityWithActiveCount(1);

    expect(findUnique.mock.calls[0][0].include.event.select.registrationCloseAt).toBe(true);
  });

  it('selects Event.registrationOpenAt — without it the not-yet-open check in create() would silently never fire', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const repo = new RegistrationsRepository({ activity: { findUnique } } as any);

    await repo.findActivityWithActiveCount(1);

    expect(findUnique.mock.calls[0][0].include.event.select.registrationOpenAt).toBe(true);
  });

  it('selects Event.isPublic + organizerId — canViewerSeeEvent fails closed without them, so nobody could register', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const repo = new RegistrationsRepository({ activity: { findUnique } } as any);

    await repo.findActivityWithActiveCount(1);

    const select = findUnique.mock.calls[0][0].include.event.select;
    expect(select.isPublic).toBe(true);
    expect(select.organizerId).toBe(true);
  });
});
