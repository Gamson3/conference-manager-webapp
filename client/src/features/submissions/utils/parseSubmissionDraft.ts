export type ParsedDraftAuthor = {
  firstName?: string;
  lastName?: string;
  email?: string;
  affiliation?: string;
  phone?: string;
  orcid?: string;
  isPresentingAuthor?: boolean;
};

export type SubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'revision_requested'
  | 'withdrawn';

export type ParsedDraft = {
  id: number;
  conferenceId: number;
  title?: string;
  abstract?: string;
  keywords?: string[];
  categoryId?: number | null;
  typeId?: number | null;
  authors?: ParsedDraftAuthor[];
  status?: SubmissionStatus;
  revisionFeedback?: string | null;
};

type ApiAuthorEntry = {
  name?: string;
  email?: string | null;
  affiliations?: string[];
  isPresenter?: boolean;
};

type ApiAuthorInfo = {
  name?: string;
  email?: string;
  organization?: string | null;
};

type ApiSubmissionLike = {
  id?: unknown;
  conferenceId?: unknown;
  title?: unknown;
  abstract?: unknown;
  keywords?: unknown;
  categoryId?: unknown;
  typeId?: unknown;
  status?: unknown;
  revisionFeedback?: unknown;
  authors?: unknown;
  authorEmail?: unknown;
  authorAffiliation?: unknown;
  authorPhone?: unknown;
  authorOrcid?: unknown;
  author?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const parseOptionalBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

const parseOptionalNullableString = (value: unknown): string | null | undefined => {
  if (typeof value === 'string') return value;
  if (value === null) return null;
  return undefined;
};

const parseOptionalNumberOrNull = (value: unknown): number | null | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value === null) return null;
  return undefined;
};

const parseKeywords = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter((v): v is string => typeof v === 'string');
  return strings.length === value.length ? strings : undefined;
};

const isSubmissionStatus = (value: unknown): value is SubmissionStatus =>
  value === 'draft' ||
  value === 'submitted' ||
  value === 'under_review' ||
  value === 'accepted' ||
  value === 'rejected' ||
  value === 'revision_requested' ||
  value === 'withdrawn';

const splitName = (name: string): { firstName: string; lastName: string } => {
  const trimmed = name.trim();
  if (trimmed.length === 0) return { firstName: '', lastName: '' };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] ?? '', lastName: '' };
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
};

const parseAuthorsFromArray = (value: unknown): ParsedDraftAuthor[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  // Support both legacy client shape (firstName/lastName) and server author-entry shape (name/affiliations/isPresenter)
  const out: ParsedDraftAuthor[] = [];

  for (const item of value) {
    if (!isRecord(item)) return undefined;

    const firstName = parseOptionalString(item.firstName);
    const lastName = parseOptionalString(item.lastName);
    const hasExplicitNames = (typeof firstName === 'string' && firstName.length > 0) || 
                             (typeof lastName === 'string' && lastName.length > 0);

    // Server now returns firstName/lastName explicitly - prefer those
    if (hasExplicitNames) {
      const affiliationsRaw = item.affiliations;
      const affiliations = Array.isArray(affiliationsRaw)
        ? affiliationsRaw.filter((a): a is string => typeof a === 'string')
        : [];

      out.push({
        firstName,
        lastName,
        email: parseOptionalString(item.email),
        affiliation: parseOptionalString(item.affiliation) ?? (affiliations.length > 0 ? affiliations.join('; ') : undefined),
        phone: parseOptionalString(item.phone),
        orcid: parseOptionalString(item.orcid),
        isPresentingAuthor: parseOptionalBoolean(item.isPresentingAuthor) ?? parseOptionalBoolean(item.isPresenter),
      });
      continue;
    }

    // Fallback: split name field
    const name = parseOptionalString(item.name);
    const parsed = typeof name === 'string' ? splitName(name) : { firstName: '', lastName: '' };

    const affiliationsRaw = item.affiliations;
    const affiliations = Array.isArray(affiliationsRaw)
      ? affiliationsRaw.filter((a): a is string => typeof a === 'string')
      : [];

    const isPresenter = parseOptionalBoolean(item.isPresenter);

    out.push({
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      email: typeof item.email === 'string' ? item.email : undefined,
      affiliation: affiliations.length > 0 ? affiliations.join('; ') : undefined,
      phone: parseOptionalString(item.phone),
      orcid: parseOptionalString(item.orcid),
      isPresentingAuthor: isPresenter,
    });
  }

  return out;
};

const coerceApiAuthorEntryArray = (value: unknown): ApiAuthorEntry[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const out: ApiAuthorEntry[] = [];
  for (const item of value) {
    if (!isRecord(item)) return undefined;
    out.push({
      name: parseOptionalString(item.name),
      email: parseOptionalNullableString(item.email),
      affiliations: Array.isArray(item.affiliations)
        ? item.affiliations.filter((a): a is string => typeof a === 'string')
        : undefined,
      isPresenter: parseOptionalBoolean(item.isPresenter),
    });
  }
  return out;
};

const parseAuthorInfo = (value: unknown): ApiAuthorInfo | undefined => {
  if (!isRecord(value)) return undefined;
  return {
    name: parseOptionalString(value.name),
    email: parseOptionalString(value.email),
    organization: parseOptionalNullableString(value.organization) ?? undefined,
  };
};

export const parseSubmissionDraft = (data: unknown): ParsedDraft | null => {
  if (!isRecord(data)) return null;
  const obj = data as ApiSubmissionLike;

  const id = obj.id;
  const conferenceId = obj.conferenceId;
  if (typeof id !== 'number' || !Number.isFinite(id)) return null;
  if (typeof conferenceId !== 'number' || !Number.isFinite(conferenceId)) return null;

  const status = isSubmissionStatus(obj.status) ? obj.status : undefined;

  // Prefer explicit authors array if present
  let authors: ParsedDraftAuthor[] | undefined;
  const authorsArray = parseAuthorsFromArray(obj.authors);
  if (authorsArray) {
    authors = authorsArray;
  } else {
    // Fallback: server author-entry shape is also under `authors`
    const authorEntries = coerceApiAuthorEntryArray(obj.authors);
    if (authorEntries) {
      authors = authorEntries.map((a) => {
        const parsed = typeof a.name === 'string' ? splitName(a.name) : { firstName: '', lastName: '' };
        return {
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          email: typeof a.email === 'string' ? a.email : undefined,
          affiliation: a.affiliations && a.affiliations.length > 0 ? a.affiliations.join('; ') : undefined,
          isPresentingAuthor: a.isPresenter,
        };
      });
    }
  }

  // Enrich presenting author with legacy submission fields when available
  if (authors && authors.length > 0) {
    const legacyEmail = parseOptionalString(obj.authorEmail);
    const legacyAffiliation = parseOptionalString(obj.authorAffiliation);
    const legacyPhone = parseOptionalString(obj.authorPhone);
    const legacyOrcid = parseOptionalString(obj.authorOrcid);

    const presenterIndex = Math.max(0, authors.findIndex((a) => a.isPresentingAuthor === true));
    const presenter = authors[presenterIndex];
    if (presenter) {
      if (typeof presenter.email === 'undefined' && typeof legacyEmail === 'string') presenter.email = legacyEmail;
      if (typeof presenter.affiliation === 'undefined' && typeof legacyAffiliation === 'string') {
        presenter.affiliation = legacyAffiliation;
      }
      if (typeof presenter.phone === 'undefined' && typeof legacyPhone === 'string') presenter.phone = legacyPhone;
      if (typeof presenter.orcid === 'undefined' && typeof legacyOrcid === 'string') presenter.orcid = legacyOrcid;
      if (!authors.some((a) => a.isPresentingAuthor === true)) presenter.isPresentingAuthor = true;
    }
  }

  // Last resort: synthesize a single author from submission legacy fields + author info
  if (!authors) {
    const authorInfo = parseAuthorInfo(obj.author);
    const nameParsed = authorInfo?.name ? splitName(authorInfo.name) : { firstName: '', lastName: '' };
    const authorEmail = parseOptionalString(obj.authorEmail);
    const authorAffiliation = parseOptionalString(obj.authorAffiliation);
    const authorPhone = parseOptionalString(obj.authorPhone);
    const authorOrcid = parseOptionalString(obj.authorOrcid);

    if (
      nameParsed.firstName.length > 0 ||
      nameParsed.lastName.length > 0 ||
      typeof authorEmail === 'string' ||
      typeof authorAffiliation === 'string'
    ) {
      authors = [
        {
          firstName: nameParsed.firstName,
          lastName: nameParsed.lastName,
          email: authorEmail,
          affiliation: authorAffiliation,
          phone: authorPhone,
          orcid: authorOrcid,
          isPresentingAuthor: true,
        },
      ];
    }
  }

  return {
    id,
    conferenceId,
    title: parseOptionalString(obj.title),
    abstract: parseOptionalString(obj.abstract),
    keywords: parseKeywords(obj.keywords),
    categoryId: parseOptionalNumberOrNull(obj.categoryId),
    typeId: parseOptionalNumberOrNull(obj.typeId),
    authors,
    status,
    revisionFeedback: parseOptionalNullableString(obj.revisionFeedback) ?? undefined,
  };
};
