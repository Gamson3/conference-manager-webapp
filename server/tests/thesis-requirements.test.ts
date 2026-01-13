import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import prisma from '../src/lib/prisma';
import app from '../src/index';
import { resetDatabase } from './helpers';

function suffix() { return `${Date.now()}_${Math.floor(Math.random()*1000)}`; }

function longAbstract(minWords: number = 55): string {
  const words = Array.from({ length: minWords }, (_, i) => `word${i + 1}`);
  return words.join(' ');
}

async function seedUsersConference() {
  const s = suffix();
  const organizer = await prisma.user.create({ 
    data: { 
      cognitoId: `thesis-org-${s}`, 
      name: 'Thesis Organizer', 
      email: `thesis-organizer+${s}@example.com`, 
      role: 'organizer' 
    } 
  });
  const author = await prisma.user.create({ 
    data: { 
      cognitoId: `thesis-author-${s}`, 
      name: 'Thesis Author', 
      email: `thesis-author+${s}@example.com`, 
      role: 'user' 
    } 
  });
  const conf = await prisma.conference.create({ 
    data: { 
      name: `ThesisConf-${s}`, 
      startDate: new Date(), 
      endDate: new Date(Date.now()+7200_000), 
      location: 'Test Location', 
      createdById: organizer.id 
    } 
  });

  // Create submission requirements with thesis requirements
  await prisma.submissionRequirement.create({
    data: {
      conferenceId: conf.id,
      collectAuthorAffiliation: true,
      minKeywords: 5,
      maxKeywords: 10,
      abstractMinLength: 50,
    }
  });

  return { organizer, author, conf };
}

describe('Thesis Requirements - Form Validation', () => {
  it('should reject submission with < 5 keywords', async () => {
    const { conf, author } = await seedUsersConference();

    // Create draft
    const createRes = await request(app)
      .post(`/api/conferences/${conf.id}/submissions`)
      .set('x-user-id', String(author.id))
      .send({
        title: 'Test with few keywords',
        abstract: longAbstract(),
        keywords: ['one', 'two', 'three', 'four'], // Only 4 keywords
        authorEmail: `author+${suffix()}@example.com`,
        authorAffiliation: 'Test University',
      });
    expect(createRes.status).toBe(201);
    const submissionId = createRes.body.id;

    // Try to submit
    const submitRes = await request(app)
      .post(`/api/submissions/${submissionId}/submit`)
      .set('x-user-id', String(author.id))
      .send();

    expect(submitRes.status).toBe(400);
    expect(submitRes.body.message).toContain('At least 5 keyword');
    expect(submitRes.body.message).toContain('you provided 4');
    expect(submitRes.body.message).toContain('Please add 1 more');
  });

  it('should reject submission without author affiliation', async () => {
    const { conf, author } = await seedUsersConference();

    // Create draft without affiliation
    const createRes = await request(app)
      .post(`/api/conferences/${conf.id}/submissions`)
      .set('x-user-id', String(author.id))
      .send({
        title: 'Test without affiliation',
        abstract: longAbstract(),
        keywords: ['k1', 'k2', 'k3', 'k4', 'k5'],
        authorEmail: `author+${suffix()}@example.com`,
        authorAffiliation: '', // Missing affiliation
      });
    expect(createRes.status).toBe(201);
    const submissionId = createRes.body.id;

    // Try to submit
    const submitRes = await request(app)
      .post(`/api/submissions/${submissionId}/submit`)
      .set('x-user-id', String(author.id))
      .send();

    expect(submitRes.status).toBe(400);
    expect(submitRes.body.message).toContain('Author affiliation is required');
    expect(submitRes.body.message).toContain('Each author must have at least one affiliation');
  });

  it('should accept submission with 5 keywords and affiliation', async () => {
    const { conf, author } = await seedUsersConference();

    // Create draft
    const createRes = await request(app)
      .post(`/api/conferences/${conf.id}/submissions`)
      .set('x-user-id', String(author.id))
      .send({
        title: 'Valid submission',
        abstract: longAbstract(),
        keywords: ['k1', 'k2', 'k3', 'k4', 'k5'],
        authorEmail: `author+${suffix()}@example.com`,
        authorAffiliation: 'Test University',
      });
    expect(createRes.status).toBe(201);
    const submissionId = createRes.body.id;

    // Submit
    const submitRes = await request(app)
      .post(`/api/submissions/${submissionId}/submit`)
      .set('x-user-id', String(author.id))
      .send();

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.status).toBe('submitted');
    expect(submitRes.body.isLocked).toBe(true);
  });
});

describe('Thesis Requirements - Presentation Locking', () => {
  it('should block author from editing scheduled presentation', async () => {
    const { conf, author, organizer } = await seedUsersConference();

    // Create accepted submission
    const submission = await prisma.submission.create({
      data: {
        title: 'Scheduled Presentation Test',
        abstract: longAbstract(),
        keywords: ['k1', 'k2', 'k3', 'k4', 'k5'],
        authorEmail: 'author@test.com',
        authorAffiliation: 'Test University',
        conferenceId: conf.id,
        authorId: author.id,
        status: 'accepted',
      }
    });

    // Create section and presentation
    const section = await prisma.section.create({
      data: {
        name: 'Test Section',
        conferenceId: conf.id,
        type: 'presentation',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600_000),
      },
    });

    const presentation = await prisma.presentation.create({
      data: {
        title: submission.title,
        abstract: submission.abstract,
        keywords: submission.keywords,
        affiliations: [],
        sectionId: section.id,
        submission: { connect: { id: submission.id } },
        status: 'scheduled', // Locked status
        duration: 15,
        order: 1,
        submissionType: 'internal',
      },
    });

    // Try to edit as author - should be blocked by auth guard since presentations
    // can only be edited by organizers/admins
    const editRes = await request(app)
      .put(`/api/presentations/${presentation.id}`)
      .set('x-user-id', String(author.id))
      .set('x-user-role', 'user')
      .send({
        title: 'Attempted Edit',
        abstract: 'Trying to edit',
        duration: 20,
        keywords: ['new', 'keywords'],
      });

    // Authors are blocked from editing presentations at the route level
    expect(editRes.status).toBe(403);
    expect(editRes.body.message).toContain('Insufficient permissions');
  });

  it('should allow organizer to edit scheduled presentation', async () => {
    const { conf, author, organizer } = await seedUsersConference();

    // Create accepted submission
    const submission = await prisma.submission.create({
      data: {
        title: 'Organizer Edit Test',
        abstract: longAbstract(),
        keywords: ['k1', 'k2', 'k3', 'k4', 'k5'],
        authorEmail: 'author@test.com',
        authorAffiliation: 'Test University',
        conferenceId: conf.id,
        authorId: author.id,
        status: 'accepted',
      }
    });

    // Create section and presentation
    const section = await prisma.section.create({
      data: {
        name: 'Test Section 2',
        conferenceId: conf.id,
        type: 'presentation',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600_000),
      },
    });

    const presentation = await prisma.presentation.create({
      data: {
        title: submission.title,
        abstract: submission.abstract,
        keywords: submission.keywords,
        affiliations: [],
        sectionId: section.id,
        submission: { connect: { id: submission.id } },
        status: 'scheduled',
        duration: 15,
        order: 1,
        submissionType: 'internal',
      },
    });

    // Edit as organizer
    const editRes = await request(app)
      .put(`/api/presentations/${presentation.id}`)
      .set('x-user-id', String(organizer.id))
      .set('x-user-role', 'organizer')
      .send({
        title: 'Organizer Updated Title',
        abstract: 'Organizer updated abstract',
        duration: 20,
        keywords: ['updated', 'keywords'],
      });

    expect(editRes.status).toBe(200);
    expect(editRes.body.title).toBe('Organizer Updated Title');
  });
});

describe('Thesis Requirements - Organizer Override', () => {
  it('should allow organizer to override locked submission', async () => {
    const { conf, author, organizer } = await seedUsersConference();

    const submission = await prisma.submission.create({
      data: {
        title: 'Locked Submission',
        abstract: longAbstract(),
        keywords: ['k1', 'k2', 'k3', 'k4', 'k5'],
        authorEmail: 'author@test.com',
        authorAffiliation: 'Test University',
        conferenceId: conf.id,
        authorId: author.id,
        status: 'submitted',
        isLocked: true,
        lockedAt: new Date(),
        lockedReason: 'Locked upon submission',
      }
    });

    const overrideRes = await request(app)
      .post(`/api/organizer/submissions/${submission.id}/override-edit`)
      .set('x-user-id', String(organizer.id))
      .set('x-user-role', 'organizer')
      .send({
        reason: 'Fixing typo in author name',
        changes: {
          title: 'Corrected Title',
          authorAffiliation: 'Corrected University',
        },
      });

    expect(overrideRes.status).toBe(200);
    expect(overrideRes.body.message).toContain('override');
    expect(overrideRes.body.submission.title).toBe('Corrected Title');
    expect(overrideRes.body.submission.authorAffiliation).toBe('Corrected University');
    expect(overrideRes.body.submission.isLocked).toBe(false);
    expect(overrideRes.body.submission.lockedAt).toBeNull();
    expect(overrideRes.body.submission.lockedReason).toBeNull();
  });

  it('should reject override without reason', async () => {
    const { conf, author, organizer } = await seedUsersConference();

    const submission = await prisma.submission.create({
      data: {
        title: 'Locked Submission 2',
        abstract: longAbstract(),
        keywords: ['k1', 'k2', 'k3', 'k4', 'k5'],
        authorEmail: 'author@test.com',
        authorAffiliation: 'Test University',
        conferenceId: conf.id,
        authorId: author.id,
        status: 'submitted',
        isLocked: true,
        lockedAt: new Date(),
        lockedReason: 'Locked upon submission',
      }
    });

    const overrideRes = await request(app)
      .post(`/api/organizer/submissions/${submission.id}/override-edit`)
      .set('x-user-id', String(organizer.id))
      .set('x-user-role', 'organizer')
      .send({
        changes: {
          title: 'No Reason Provided',
        },
      });

    expect(overrideRes.status).toBe(400);
    expect(overrideRes.body.message).toContain('Reason is required');
  });
});

describe('Thesis Requirements - Audit Logging', () => {
  it('should log submission decision (accept)', async () => {
    const { conf, author, organizer } = await seedUsersConference();

    const submission = await prisma.submission.create({
      data: {
        title: 'Audit Test Submission',
        abstract: longAbstract(),
        keywords: ['k1', 'k2', 'k3', 'k4', 'k5'],
        authorEmail: 'author@test.com',
        authorAffiliation: 'Test University',
        conferenceId: conf.id,
        authorId: author.id,
        status: 'submitted',
      }
    });

    const decideRes = await request(app)
      .post(`/api/organizer/submissions/${submission.id}/decision`)
      .set('x-user-id', String(organizer.id))
      .set('x-user-role', 'organizer')
      .send({ decision: 'accepted' });

    expect(decideRes.status).toBe(200);

    // Check audit log was created
    const auditLog = await prisma.adminAuditLog.findFirst({
      where: {
        action: 'SUBMISSION_ACCEPT',
        entityId: submission.id,
        adminId: organizer.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(auditLog).not.toBeNull();
    expect(auditLog?.entityType).toBe('Submission');
  });

  it('should log organizer override with reason', async () => {
    const { conf, author, organizer } = await seedUsersConference();

    const submission = await prisma.submission.create({
      data: {
        title: 'Override Audit Test',
        abstract: longAbstract(),
        keywords: ['k1', 'k2', 'k3', 'k4', 'k5'],
        authorEmail: 'author@test.com',
        authorAffiliation: 'Test University',
        conferenceId: conf.id,
        authorId: author.id,
        status: 'accepted',
        isLocked: true,
        lockedAt: new Date(),
        lockedReason: 'Accepted',
      }
    });

    const overrideRes = await request(app)
      .post(`/api/organizer/submissions/${submission.id}/override-edit`)
      .set('x-user-id', String(organizer.id))
      .set('x-user-role', 'organizer')
      .send({
        reason: 'Correcting metadata error',
        changes: {
          keywords: ['corrected', 'k2', 'k3', 'k4', 'k5'],
        },
      });

    expect(overrideRes.status).toBe(200);

    // Check audit log
    const auditLog = await prisma.adminAuditLog.findFirst({
      where: {
        action: 'SUBMISSION_OVERRIDE_EDIT',
        entityId: submission.id,
        adminId: organizer.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(auditLog).not.toBeNull();
  });
});
