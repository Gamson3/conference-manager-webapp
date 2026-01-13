# Cognito User Backfill & Dev Reset Strategy

When developing locally you may clear the Postgres database (dropping all rows) while still retaining users in Cognito. After a reset, those users can still sign in (Cognito validates credentials) but they won't exist in the `User` table yet. The frontend now auto-upserts on successful login (`/users/upsert`), but you may also want to bulk backfill ahead of testing.

## Automatic On Login
1. User signs in via Cognito.
2. Frontend calls `/users/upsert` with `cognitoId`, `email`, `name`, `role` (default `user`).
3. Backend `upsertUser` creates or updates the row.

If the DB was wiped, the first login recreates that user seamlessly.

## Bulk Backfill Script (Optional)
Create a script (example name `scripts/backfill-cognito-users.ts`) that:
1. Uses AWS SDK `CognitoIdentityProviderClient` + `ListUsersCommand`.
2. Iterates over returned users extracting `sub` (cognitoId), `email`, `name`.
3. Calls the same `/users/upsert` endpoint or directly uses Prisma `user.upsert`.

Pseudo outline:
```ts
import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import prisma from '../server/src/lib/prisma';

async function run() {
	const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
	const userPoolId = process.env.AWS_COGNITO_USER_POOL_ID!;
	const resp = await client.send(new ListUsersCommand({ UserPoolId: userPoolId }));
	for (const u of resp.Users || []) {
		const idAttr = u.Attributes?.find(a => a.Name === 'sub');
		const emailAttr = u.Attributes?.find(a => a.Name === 'email');
		const nameAttr = u.Attributes?.find(a => a.Name === 'name');
		if (!idAttr?.Value) continue;
		await prisma.user.upsert({
			where: { cognitoId: idAttr.Value },
			update: {},
			create: {
				cognitoId: idAttr.Value,
				email: emailAttr?.Value || `${idAttr.Value}@example.local`,
				name: nameAttr?.Value || 'User',
				password: '',
				role: 'user'
			}
		});
	}
	console.log('Backfill complete');
}

run().catch(e => { console.error(e); process.exit(1); });
```

Run with:
```bash
TS_NODE_TRANSPILE_ONLY=1 ts-node scripts/backfill-cognito-users.ts
```

## Environment Requirements
Ensure these env vars exist for both frontend and backend:

```
AWS_REGION=eu-north-1
AWS_COGNITO_USER_POOL_ID=eu-north-1_XXXXXXX
AWS_COGNITO_USER_POOL_CLIENT_ID=YOURCLIENTID
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID=eu-north-1_XXXXXXX
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID=YOURCLIENTID
NEXT_PUBLIC_AWS_COGNITO_REGION=eu-north-1
```

## Common Login Issues
- `Incorrect email or password.`: Credential mismatch, or user not confirmed.
- After DB wipe: first login recreates user automatically (verify row inserted).
- 400 from cognito-idp: Often due to missing region or malformed pool ID; confirm `region` now passed in `configureAmplify()`.

## Test Strategy After Reset
1. Clear DB.
2. Sign in with existing Cognito user → expect silent recreation in DB.
3. Hit `/users/me` (via app) → profile loads.
4. Sign out, sign in again → no errors.

This flow removes manual intervention while iterating quickly.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
