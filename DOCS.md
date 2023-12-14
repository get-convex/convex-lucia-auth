# How to integrate Lucia auth into a Convex project

## (optional) Set up your schema

You can skip this step if you're not using TypeScript.

### Set up the database schema

In `convex/schema.ts`:

```ts
import { defineSchema } from "convex/server";
import { authTables } from "@convex-dev/convex-lucia-auth";
import { v } from "convex/values";

export default defineSchema({
  ...authTables({
    user: {
      email: v.string(),
    },
    session: {},
  }),
});
```

### Set up global types

In `convex/env.d.ts`:

```ts
declare namespace Lucia {
  type Auth = import("@convex-dev/convex-lucia-auth").Auth;
  type DatabaseUserAttributes =
    import("@convex-dev/convex-lucia-auth").DatabaseUserAttributes & {
      email: string;
    };
  type DatabaseSessionAttributes =
    import("@convex-dev/convex-lucia-auth").DatabaseSessionAttributes;
}

declare namespace ConvexLuciaAuth {
  type DataModel = import("./_generated/dataModel").DataModel;
}
```

## Implement Sign Up / Sign In / Log out

### Backend

Implement public mutations for the three operations using `convex-lucia-auth`
and `convex-lucia-auth/email`, which return a `SessionId`.

In `convex/users.ts` or similar:

```ts
import { v } from "convex/values";
import { queryWithAuth, mutationWithAuth } from "@convex-dev/convex-lucia-auth";
import {
  signInWithEmailAndPassword,
  signUpWithEmailAndPassword,
} from "@convex-dev/convex-lucia-auth/email";

export const signIn = mutationWithAuth({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { email, password }) => {
    const session = await signInWithEmailAndPassword(ctx, email, password);
    return session.sessionId;
  },
});

export const signUp = mutationWithAuth({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { email, password }) => {
    const session = await signUpWithEmailAndPassword(ctx, email, password);
    return session.sessionId;
  },
});
```

### Frontend

Wrap your app in `SessionProvider` from `convex-lucia-auth/react`.

In `main.tsx` or similar:

```tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";
import React from "react";
import ReactDOM from "react-dom/client";
import { SessionProvider } from "@convex-dev/convex-lucia-auth/react";
import App from "./App";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SessionProvider>
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </SessionProvider>
  </React.StrictMode>
);
```

In your app use the `SignInSignUp` component from `convex-lucia-auth/react`.

In `AuthForm.tsx` or similar:

```tsx
import {
  SignUpSignIn,
  useMutationWithAuth,
} from "@convex-dev/convex-lucia-auth/react";
// This path is relative so you might need to update it:
import { api } from "../convex/_generated/api";

export function AuthForm() {
  const signIn = useMutationWithAuth(api.users.signIn);
  const signUp = useMutationWithAuth(api.users.signUp);
  return <SignUpSignIn signIn={signIn} signUp={signUp} />;
}
```

Similarly you can use the `SignOutButton` component.

```tsx
import { SignOutButton } from "@convex-dev/convex-lucia-auth/react";
```

## Check whether the user is signed in

### Backend

Add a query exposing whatever information about the current user your frontend
needs. In this example we expose the whole user document, from `ctx.session`.

In `convex/users.ts` or similar:

```tsx
import { queryWithAuth } from "@convex-dev/convex-lucia-auth";

export const get = queryWithAuth({
  args: {},
  handler: async (ctx) => {
    return ctx.session?.user;
  },
});
```

### Frontend

Leverage the query, possibly rendering the `SignUpSignIn` component when the
user isn't logged in.

In `src/App.tsx` or similar:

```tsx
import { useQueryWithAuth } from "@convex-dev/convex-lucia-auth/react";
// This path is relative so you might need to update it:
import { api } from "../convex/_generated/api";
import { AuthForm } from "./AuthForm";

export function App() {
  const user = useQueryWithAuth(api.users.get, {});

  return user === undefined ? (
    <>Loading...</>
  ) : user === null ? (
    <AuthForm />
  ) : (
    <>
      <>Signed in with email: {user.email}</>
      <SignOutButton />
    </>
  );
}
```

## Clearing old dead sessions

Every time a user signs in a session is created for them. It is a good idea to
delete old sessions so that they don't accummulate indefinitely, using
`findAndDeleteDeadUserSessions` from `convex-lucia-auth`.

In `convex/crons.ts`:

```ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { findAndDeleteDeadUserSessions } from "@convex-dev/convex-lucia-auth";

const crons = cronJobs();

crons.daily(
  "clear stale sessions and keys",
  { hourUTC: 8, minuteUTC: 0 },
  internal.crons.clearStaleSessionsAndKeys
);

export const clearStaleSessionsAndKeys = internalMutation(
  findAndDeleteDeadUserSessions
);

export default crons;
```

## Advanced

### Customize frontend

To customize the UX appearance, you can either:

1. Specify classnames props for each component
2. Use hooks and use your own components

For the second approach, follow these recipes:

#### Using custom components for sign up and sign in

In `src/CustomAuthForm.tsx` or similar:

```tsx
import { useSignUpSignIn } from "@convex-dev/convex-lucia-auth/react";

export function CustomAuthForm() {
  const { flow, toggleFlow, error, onSubmit } = useSignUpSignIn({
    signIn: useMutationWithAuth(api.auth.signIn),
    signUp: useMutationWithAuth(api.auth.signUp),
  });
  return (
    <>
      <form onSubmit={onSubmit}>
        <label htmlFor="username">Email</label>
        <MyInput name="email" id="email" />
        <label htmlFor="password">Password</label>
        <MyInput type="password" name="password" id="password" />
        <MyButton
          type="submit"
          value={flow === "signIn" ? "Sign in" : "Sign up"}
        />
      </form>
      <MyLinkButton onClick={toggleFlow}>
        {flow === "signIn"
          ? "Don't have an account? Sign up"
          : "Already have an account? Sign in"}
      </MyLinkButton>
      {error !== undefined
        ? flow === "signIn"
          ? "Could not sign in, did you mean to sign up?"
          : "Could not sign up, did you mean to sign in?"
        : null}
    </>
  );
}
```

#### Custom SignOutButton

In `src/CustomSignOutButton.tsx` or similar:

```tsx
import { useSignOut } from "@convex-dev/convex-lucia-auth/react";

export function CustomSignOutButton() {
  return <MyButton onClick={useSignOut()}>Logout</MyButton>;
}
```
