# Cognito Triggers Setup

This guide describes two AWS Cognito triggers to harden auth and keep roles authoritative.

## 1) Post-Confirmation (Create user in DB)

Trigger: Post Confirmation

Purpose: After a user confirms signup, create/update the user in your DB with initial role.

Endpoint to call (already implemented):

- POST `/users/upsert`
- Body: `{ cognitoId: string, name?: string, email?: string, role?: 'attendee'|'organizer'|'admin' }`

Example Lambda (Node.js 20):

```ts
import axios from 'axios';

export const handler = async (event: any) => {
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') return event;

  const cognitoId = event.userName; // e.g. sub
  const email = event.request?.userAttributes?.email;
  const name = event.request?.userAttributes?.name || email;

  // Choose initial role. If you allow selecting role at registration,
  // you can store it as a custom attribute and read it here instead.
  const role = 'attendee';

  // Call your API (set URL via env)
  const API_BASE_URL = process.env.API_BASE_URL!;
  await axios.post(`${API_BASE_URL}/users/upsert`, { cognitoId, name, email, role });

  return event;
};
```

Permissions: Allow the Lambda to reach your API (VPC/private networking if needed).

## 2) Pre Token Generation (Inject custom:role)

Trigger: Pre Token Generation

Purpose: Insert `custom:role` into the ID and Access tokens so backend can trust the claim without an extra DB query.

Logic: Look up the role for the user in your DB and add it to claims.

Example Lambda (Node.js 20):

```ts
import axios from 'axios';

export const handler = async (event: any) => {
  if (event.triggerSource !== 'TokenGeneration_HostedAuth') return event;

  const cognitoId = event.userName; // sub
  const API_BASE_URL = process.env.API_BASE_URL!;
  
  // Fetch user from your API/DB
  const user = await axios.get(`${API_BASE_URL}/users/cognito/${cognitoId}`).then(r => r.data);
  const role = (user?.role || 'attendee');

  event.response.claimsOverrideDetails = event.response.claimsOverrideDetails || {};
  event.response.claimsOverrideDetails.claimsToAddOrOverride = {
    ...(event.response.claimsOverrideDetails.claimsToAddOrOverride || {}),
    'custom:role': role,
  };

  return event;
};
```

Notes:
- You can cache role externally to reduce latency.
- After enabling this, the backend will receive `custom:role` in tokens and can skip DB role fallback.

## Environment Variables
- `API_BASE_URL` pointing to your server API (e.g., `https://api.example.com`).

## Backend Behavior
- The backend already supports:
  - `POST /users/upsert` for creating/updating users (used by post-confirmation).
  - `GET /users/cognito/:cognitoId` for fetching a user by Cognito ID (used by pre-token-generation example).
  - JWT verification against Cognito JWKS with issuer validation.
  - Fallback to DB role when `custom:role` claim is missing.

## Acceptance Criteria
- New user confirmation automatically creates a DB row with the initial role.
- Issued tokens contain `custom:role` (after enabling pre-token-generation), so the backend can trust the claim.
- Backend continues to work even if the role claim is missing (fallback to DB).
