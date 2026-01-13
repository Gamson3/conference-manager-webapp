import request from 'supertest';
import app from '../src/index';
import prisma from '../src/lib/prisma';
import { resetDatabase } from './helpers';

// NOTE: These tests assume an authenticated user middleware sets req.user. For now we mock by temporarily monkey-patching auth middleware behavior.
// In a real setup, you'd generate JWTs or stub middleware. Here we directly call routes with a helper.

// Helper to insert a conference and user
function suffix() { return `${Date.now()}_${Math.floor(Math.random()*1000)}`; }
async function seedUserAndConference() {
  const s = suffix();
  const user = await prisma.user.create({
    data: { cognitoId: `test-user-${s}`, name: 'Test User', email: `test.user+${s}@example.com`, role: 'user' }
  });
  const conf = await prisma.conference.create({
    data: { name: `TestConf-${s}`, startDate: new Date(), endDate: new Date(Date.now()+3600_000), location: 'Online', createdById: user.id }
  });
  return { user, conf };
}

describe('Participants API', () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Register self as attendee', async () => {
    const { user, conf } = await seedUserAndConference();

    // Simulate auth by patching app request user for this test using supertest .set header understood by a hypothetical middleware
    const res = await request(app)
      .post(`/api/conferences/${conf.id}/register`)
      .set('x-user-id', String(user.id)) // requires middleware adaptation if not present
      .send();

    expect(res.status).toBeLessThan(400);
  });

  test('Unregister self', async () => {
    const { user, conf } = await seedUserAndConference();
    await prisma.conferenceParticipant.create({ data: { userId: user.id, conferenceId: conf.id, role: 'attendee', status: 'registered' } });

    const res = await request(app)
      .delete(`/api/conferences/${conf.id}/unregister`)
      .set('x-user-id', String(user.id))
      .send();

    expect(res.status).toBeLessThan(400);
  });
});
