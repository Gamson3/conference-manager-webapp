# Conference Master Documentation

> Comprehensive documentation for the Conference Master platform

---

## 🚨 IMPORTANT - Documentation Update (December 2025)

**Ground truth analysis completed December 12, 2025 reveals project is ~70-75% complete, significantly more than previously documented.**

### 📊 **Start Here for Accurate Status**
1. **[PROJECT_STATUS.md](../PROJECT_STATUS.md)** ⭐ **NEW - SINGLE SOURCE OF TRUTH**
   - Authoritative implementation status
   - Verified feature completion (replaces conflicting claims)
   - Deployment readiness assessment

2. **[GROUND_TRUTH_ANALYSIS.md](../GROUND_TRUTH_ANALYSIS.md)** ⭐ NEW
   - Detailed analysis of actual vs documented state
   - Major findings and discrepancies resolved

3. **[FEATURE_STATUS_MATRIX.md](../FEATURE_STATUS_MATRIX.md)** ⭐ NEW
   - Complete page-by-page status (all 83+ pages)
   - Backend API coverage verification

4. **[DEPLOYMENT_ACTION_PLAN.md](../DEPLOYMENT_ACTION_PLAN.md)** ⭐ NEW
   - Realistic 3-week roadmap to deployment
   - Based on actual gaps, not assumptions

---

## 🎯 Quick Start

**New to the project?** Start here:
1. [PROJECT_STATUS.md](../PROJECT_STATUS.md) - **Current accurate status** (Dec 2025)
2. [Capability System Summary](./Capability-System-Summary.md) - Authorization model overview
3. [Architecture Review](./Architecture-Review-2025-11.md) - System architecture (see update note at top)
4. [Project Decisions and Progress](./Project-Decisions-and-Progress.md) - Recent decisions

---

## 📚 Core Documentation

### Authorization & Security

#### [Capability-Oriented Access Design](./Capability-Oriented-Access-Design.md) ⭐ NEW
**The comprehensive guide to our authorization system**
- Two-layer authorization model (global roles + contextual capabilities)
- Implementation details for backend and frontend
- Authorization decision matrix
- Code examples and patterns
- Testing strategy

#### [Capability System Summary](./Capability-System-Summary.md) ⭐ NEW
**Quick reference for developers**
- Global roles: user, organizer, admin
- Contextual capabilities: attendee, author, presenter, reviewer, sponsor, volunteer
- Common patterns and examples
- FAQ

#### [Capability System Diagrams](./Capability-System-Diagrams.md) ⭐ NEW
**Visual architecture diagrams**
- Two-layer model visualization
- Authorization flow
- User upgrade journey
- Database schema relationships
- Frontend guard architecture
- Decision matrix

#### [Auth Resilience and Security Decisions](./Auth-Resilience-and-Security-Decisions.md)
- Cognito authentication flow
- Security hardening (privilege escalation prevention)
- Role management

#### [Migration Notes](./MIGRATION_NOTES.md)
- Attendee → User migration
- Route strategy decisions
- Affected areas checklist

---

### Architecture Decision Records (ADRs)

#### [ADR 0001: Database as Authoritative Source](./ADR/0001-db-role-authoritative.md)
**Decision:** Ignore Cognito role claims; use database `User.role` for all authorization  
**Why:** Immediate role changes, consistency with capability model

#### [ADR 0002: Organizer Self-Upgrade and Return](./ADR/0002-organizer-upgrade-and-return.md)
**Decision:** Allow self-upgrade from user → organizer with return-to-intent parameter  
**Why:** Reduce friction, improve conversion funnel

---

### Feature Specifications

#### [Organizer Functional Spec](../client/docs/Organizer-Functional-Spec.md)
- Role purpose and context
- Capability model integration
- Functional domains
- Page inventory and route mapping
- API endpoints alignment
- Permission matrix

#### [Information Architecture Rationale & Navigation Decisions](../client/docs/IA-Rationale-and-Nav-Decisions.md)
- Route organization principles
- OrganizerGuard implementation
- Not Authorized page design
- Trade-offs considered

#### [Recent Implementation Decisions](../client/docs/Recent-Implementation-Decisions.md)
- Conference sidebar secondary navigation
- Organizer navigation guard
- Auth resilience patterns
- Other recent changes

---

### Technical Documentation

#### [Organizer Routes and Endpoints](./Organizer-Routes-and-Endpoints.md)
- Complete route mapping
- Endpoint specifications
- Request/response formats

#### [API Integration](../client/docs/API-Integration.md)
- API client setup
- Authentication headers
- Error handling patterns

#### [Per-Conference Implementation Plan](../client/docs/PerConference-Implementation-Plan.md)
- Conference-scoped features
- Implementation phases

---

### Infrastructure & Operations

#### [Architecture Review (Nov 2025)](./Architecture-Review-2025-11.md)
- System overview
- Technology stack
- Component relationships
- Data flow

#### [Project Decisions and Progress](./Project-Decisions-and-Progress.md)
- Recent decisions log
- Implementation status
- Known gaps and next steps

#### [Schedule Builder](./Schedule-Builder.md)
- Schedule builder feature specification
- Drag-and-drop implementation
- Conflict detection

---

## 🗂️ Documentation by Audience

### For New Developers
1. [Capability System Summary](./Capability-System-Summary.md) - Understand authorization
2. [Architecture Review](./Architecture-Review-2025-11.md) - System overview
3. [Organizer Functional Spec](../client/docs/Organizer-Functional-Spec.md) - Feature details
4. [API Integration](../client/docs/API-Integration.md) - How to make API calls

### For Backend Engineers
1. [Capability-Oriented Access Design](./Capability-Oriented-Access-Design.md) - Authorization implementation
2. [Organizer Routes and Endpoints](./Organizer-Routes-and-Endpoints.md) - API specifications
3. [ADR 0001: DB Authoritative](./ADR/0001-db-role-authoritative.md) - Auth decisions
4. [Schema Documentation](../server/docs/DataModelReview.md) - Database design

### For Frontend Engineers
1. [Capability System Summary](./Capability-System-Summary.md) - Quick reference
2. [Capability System Diagrams](./Capability-System-Diagrams.md) - Visual guides
3. [IA Rationale](../client/docs/IA-Rationale-and-Nav-Decisions.md) - Navigation patterns
4. [Recent Implementation Decisions](../client/docs/Recent-Implementation-Decisions.md) - UI patterns

### For Product/UX
1. [Organizer Functional Spec](../client/docs/Organizer-Functional-Spec.md) - Feature requirements
2. [Schedule Builder](./Schedule-Builder.md) - Scheduler UX
3. [IA Rationale](../client/docs/IA-Rationale-and-Nav-Decisions.md) - Navigation design

### For DevOps/Infrastructure
1. [Architecture Review](./Architecture-Review-2025-11.md) - System architecture
2. [Auth Resilience](./Auth-Resilience-and-Security-Decisions.md) - Security setup
3. Backend infrastructure docs in `server/docs/`

---

## 🔍 Finding Specific Information

### Authorization & Permissions
- [Capability-Oriented Access Design](./Capability-Oriented-Access-Design.md) - Complete guide
- [Capability System Summary](./Capability-System-Summary.md) - Quick reference
- [ADR 0001](./ADR/0001-db-role-authoritative.md) - DB authoritative decision
- [ADR 0002](./ADR/0002-organizer-upgrade-and-return.md) - Self-upgrade mechanism

### Routes & Navigation
- [Organizer Routes and Endpoints](./Organizer-Routes-and-Endpoints.md) - API routes
- [IA Rationale](../client/docs/IA-Rationale-and-Nav-Decisions.md) - Frontend routes
- [Migration Notes](./MIGRATION_NOTES.md) - Route strategy decisions

### Database & Models
- [Schema Review](../server/docs/DataModelReview.md) - Data model
- [Capability System Diagrams](./Capability-System-Diagrams.md) - ER diagrams
- `server/prisma/schema.prisma` - Actual schema

### Testing
- [Capability-Oriented Access Design § Testing](./Capability-Oriented-Access-Design.md#10-testing-strategy)
- Test files in `server/tests/` and `client/src/__tests__/`

---

## 📝 Documentation Standards

### When to Create New Documentation

1. **Architecture Decision Records (ADRs)**
   - Create when making significant architectural decisions
   - Format: `ADR/XXXX-short-title.md`
   - Template: decision, context, consequences

2. **Feature Specifications**
   - Create for major new features
   - Include: user stories, acceptance criteria, implementation plan

3. **Migration Guides**
   - Create for breaking changes or major refactors
   - Include: what changed, why, how to migrate

### Documentation Maintenance

- Update docs as code changes
- Mark outdated sections clearly
- Keep examples current with codebase
- Link related documentation

---

## 🚀 Recent Updates

**January 2025:**
- ✅ Added comprehensive Capability-Oriented Access Design documentation
- ✅ Created Capability System Summary for quick reference
- ✅ Added visual architecture diagrams
- ✅ Documented authorization patterns and examples

**November 2025:**
- Architecture review and system documentation
- Organizer functional specification
- IA rationale and navigation decisions
- Recent implementation decisions log

---

## 📧 Questions or Suggestions?

For questions about:
- **Authorization/Security:** See [Capability-Oriented Access Design](./Capability-Oriented-Access-Design.md)
- **API Endpoints:** See [Organizer Routes and Endpoints](./Organizer-Routes-and-Endpoints.md)
- **Frontend Routes:** See [IA Rationale](../client/docs/IA-Rationale-and-Nav-Decisions.md)
- **Database Schema:** See [Schema Review](../server/docs/DataModelReview.md)

Can't find what you need? Check the [Project Decisions and Progress](./Project-Decisions-and-Progress.md) document for recent changes and known gaps.
