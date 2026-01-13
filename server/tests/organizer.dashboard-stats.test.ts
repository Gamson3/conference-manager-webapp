import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/index";
import prisma from "../src/lib/prisma";
import { resetDatabase } from "./helpers";

describe("Organizer dashboard stats (Home)", () => {
  beforeAll(async () => {
    await resetDatabase();
  });

  it("returns combined stats for Home cards", async () => {
    const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    let organizerId: number | undefined;
    let authorId: number | undefined;
    let conferenceId: number | undefined;

    try {
      const organizer = await prisma.user.create({
        data: {
          cognitoId: `test-cognito-organizer-dashboard-${unique}`,
          email: `organizer-dashboard-${unique}@test.com`,
          name: "Organizer Dashboard",
          role: "organizer",
        },
      });
      organizerId = organizer.id;

      const author = await prisma.user.create({
        data: {
          cognitoId: `test-cognito-author-dashboard-${unique}`,
          email: `author-dashboard-${unique}@test.com`,
          name: "Author Dashboard",
          role: "user",
        },
      });
      authorId = author.id;

      const conference = await prisma.conference.create({
        data: {
          name: `Test Conference Dashboard Stats ${unique}`,
          description: "Test",
          startDate: new Date("2026-06-01"),
          endDate: new Date("2026-06-02"),
          timezone: "UTC",
          createdById: organizerId,
          status: "draft",
        },
      });
      conferenceId = conference.id;

      await prisma.conferenceParticipant.createMany({
        data: [
          {
            userId: organizerId,
            conferenceId,
            role: "attendee",
            status: "registered",
          },
          {
            userId: authorId,
            conferenceId,
            role: "author",
            status: "waitlisted",
          },
        ],
      });

      await prisma.submission.createMany({
        data: [
          {
            conferenceId,
            authorId,
            title: "Sub A",
            abstract: "A",
            status: "submitted",
          },
          {
            conferenceId,
            authorId,
            title: "Sub B",
            abstract: "B",
            status: "under_review",
          },
          {
            conferenceId,
            authorId,
            title: "Sub C",
            abstract: "C",
            status: "accepted",
          },
        ],
      });

      const res = await request(app)
        .get(`/api/organizer/conferences/${conferenceId}/dashboard/stats`)
        .set("x-user-id", String(organizerId))
        .set("x-user-role", "organizer");

      expect(res.status).toBe(200);

      expect(res.body.program).toMatchObject({
        daysCount: 0,
        sessionsCount: 0,
        presentationsCount: 0,
      });

      // acceptedSubmissions = 1, unscheduledAccepted = accepted - presentationsCount
      expect(res.body.program.acceptedSubmissions).toBe(1);
      expect(res.body.program.unscheduledAccepted).toBe(1);

      expect(res.body.submissions.total).toBe(3);
      expect(res.body.submissions.pending).toBe(2);
      expect(res.body.submissions.accepted).toBe(1);
      expect(res.body.submissions.underReview).toBe(1);

      expect(res.body.participants.total).toBe(2);
      expect(res.body.participants.registered).toBe(1);
      expect(res.body.participants.waitlisted).toBe(1);
    } finally {
      if (conferenceId) {
        await prisma.submission.deleteMany({ where: { conferenceId } });
        await prisma.conferenceParticipant.deleteMany({ where: { conferenceId } });
        await prisma.conference.deleteMany({ where: { id: conferenceId } });
      }

      const ids: number[] = [];
      if (organizerId) ids.push(organizerId);
      if (authorId) ids.push(authorId);
      if (ids.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: ids } } });
      }
    }
  });
});
