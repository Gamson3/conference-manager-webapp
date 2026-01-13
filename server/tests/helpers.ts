import prisma from '../src/lib/prisma';

export function suffix() { return `${Date.now()}_${Math.floor(Math.random()*1000)}`; }

type PgTableRow = {
  tablename: string;
};

export async function resetDatabase(): Promise<void> {
  const tables = await prisma.$queryRaw<PgTableRow[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  `;

  const tableNames = tables
    .map((t) => t.tablename)
    .filter((name) => name !== '_prisma_migrations');

  if (tableNames.length === 0) {
    return;
  }

  const quoted = tableNames.map((name) => `"${name}"`).join(', ');
  const sql = `TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE;`;

  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await prisma.$executeRawUnsafe(sql);
      return;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const isDeadlock = message.includes('40P01') || message.toLowerCase().includes('deadlock detected');
      if (!isDeadlock || attempt === maxAttempts) {
        throw err;
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 50 * attempt));
    }
  }
}

export async function createUser(role: 'user'|'organizer'|'admin' = 'user') {
  const s = suffix();
  return prisma.user.create({ data: { cognitoId: `${role}-${s}`, name: `${role} user`, email: `${role}+${s}@example.com`, role } });
}

export async function createConference(organizerId: number) {
  const s = suffix();
  return prisma.conference.create({ data: { name: `Conf-${s}`, startDate: new Date(), endDate: new Date(Date.now()+7200_000), location: 'TestLoc', createdById: organizerId } });
}

export async function createSection(conferenceId: number, name?: string) {
  const s = suffix();
  return prisma.section.create({ data: { conferenceId, name: name || `Section-${s}`, startTime: new Date(), endTime: new Date(Date.now()+3600_000) } });
}

export async function createPresentation(
  sectionId: number,
  title?: string,
  order: number = 1,
  status: 'draft'|'submitted'|'scheduled'|'locked' = 'scheduled',
  submissionType: 'internal'|'external' = 'internal'
) {
  const s = suffix();
  return prisma.presentation.create({
    data: {
      sectionId,
      title: title || `Pres-${s}`,
      order,
      status,
      submissionType,
      keywords: [],
      affiliations: []
    }
  });
}

export function authAs(userId: number, role?: string) {
  const headers: Record<string,string> = { 'x-user-id': String(userId) };
  if (role) headers['x-user-role'] = role;
  return headers;
}
