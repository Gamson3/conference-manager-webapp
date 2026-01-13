"use client";

import { Amplify } from 'aws-amplify';
import {
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  signUp as amplifySignUp,
  resetPassword as amplifyResetPassword,
  confirmResetPassword as amplifyConfirmResetPassword,
  confirmSignUp as amplifyConfirmSignUp,
  resendSignUpCode as amplifyResendSignUpCode,
  fetchUserAttributes,
  fetchAuthSession,
  getCurrentUser,
} from 'aws-amplify/auth';

let configured = false;

export function configureAmplify() {
  if (configured) return;
  const userPoolId = process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID;
  const userPoolClientId = process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID;

  if (!userPoolId || !userPoolClientId) {
    // Allow local dev without Cognito configured
    console.warn('[Amplify] Missing Cognito envs. Auth features may not work.');
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: userPoolId || '',
  userPoolClientId: userPoolClientId || '',
        loginWith: { username: false, email: true, phone: false },
      },
    },
  });
  configured = true;
}

export async function signIn(email: string, password: string) {
  const res = await amplifySignIn({ username: email, password });
  const session = await fetchAuthSession();
  const tokens = session.tokens;
  return { res, tokens };
}

export async function signUp(name: string, email: string, password: string) {
  // When the pool uses email as an alias, Cognito rejects usernames that look like emails.
  // Use a generated username while storing the real email in user attributes.
  const username = `user_${email.replace(/[^A-Za-z0-9]/g, '_')}_${Date.now()}`;
  const res = await amplifySignUp({
    username,
    password,
    options: {
      userAttributes: {
        email,
        name,
      },
    },
  });
  return { res, username };
}

export async function signOut() {
  await amplifySignOut();
}

export async function getTokens() {
  const session = await fetchAuthSession();
  return session.tokens ?? null;
}

export async function getUser() {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export type CognitoUserAttributes = {
  name?: string;
  email?: string;
};

export async function getUserAttributes(): Promise<CognitoUserAttributes | null> {
  try {
    const attrs = await fetchUserAttributes();
    return {
      name: typeof attrs.name === 'string' ? attrs.name : undefined,
      email: typeof attrs.email === 'string' ? attrs.email : undefined,
    };
  } catch {
    return null;
  }
}

export async function startForgotPassword(email: string) {
  return amplifyResetPassword({ username: email });
}

export async function confirmForgotPassword(email: string, code: string, newPassword: string) {
  return amplifyConfirmResetPassword({ username: email, confirmationCode: code, newPassword });
}

export async function confirmSignUp(email: string, code: string) {
  return amplifyConfirmSignUp({ username: email, confirmationCode: code });
}

export async function resendSignUpCode(email: string) {
  return amplifyResendSignUpCode({ username: email });
}
