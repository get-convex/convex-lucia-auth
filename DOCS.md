# How to integrate Lucia auth into a Convex project

## (optional) Set up your schema

You can skip this step if you're not using TypeScript.

Set up the database schema:

```ts
// convex/schema.ts

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

Set up global types:

```ts
// convex/env.d.ts
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

Implement public mutations for the three operations using `convex-lucia-auth` and `convex-lucia-auth/email`, which return a `SessionId`:

```ts
// convex/users.ts or similar
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

Wrap your app in `SessionProvider` from `convex-lucia-auth/react`:

```tsx
// main.tsx or similar
import { ConvexProvider, ConvexReactClient } from "convex/react";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SessionProvider } from "@convex-dev/convex-lucia-auth/react";
import "./index.css";

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

In your app use the `SignInSignUp` component from `convex-lucia-auth/react`:

```tsx
// AuthForm.tsx or similar
import { useMutation } from "./usingSession";
import { api } from "../convex/_generated/api";
import { SignUpSignIn } from "@convex-dev/convex-lucia-auth/react";

export function AuthForm() {
  const signIn = useMutation(api.users.signIn);
  const signUp = useMutation(api.users.signUp);
  return <SignUpSignIn signIn={signIn} signUp={signUp} />;
}
```

And the `SignOutButton` component:

```tsx
import { SignOutButton } from "@convex-dev/convex-lucia-auth/react";
```

## Check whether the user is signed in

### Backend

Add a query exposing whatever information about the current user your frontend needs. In this example we expose the whole user document, from `ctx.session`:

```tsx
// users.ts
import { queryWithAuth } from "@convex-dev/convex-lucia-auth";

export const get = queryWithAuth({
  args: {},
  handler: async (ctx) => {
    return ctx.session?.user;
  },
});
```

### Frontend

Leverage the query, possibly rendering the `SignUpSignIn` component when the user isn't logged in:

```tsx
// src/App.tsx or similar
import {
  SignOutButton,
  SignUpSignIn,
  useMutationWithAuth,
  useQueryWithAuth,
} from "@convex-dev/convex-lucia-auth/react";
import { api } from "../convex/_generated/api";

export function App() {
  const user = useQueryWithAuth(api.users.get, {});
  const signUp = useMutationWithAuth(api.users.signUp);
  const signIn = useMutationWithAuth(api.users.signIn);

  return user === undefined ? (
    <>Loading...</>
  ) : user === null ? (
    <SignUpSignIn signIn={signIn} signUp={signUp} />
  ) : (
    <>
      <>Signed in with email: {user.email}</>
      <SignOutButton />
    </>
  );
}
```

## Clearing old dead sessions

Every time a user signs in a session is created for them. It is a good idea to delete old sessions so that they don't accummulate indefinitely, using `findAndDeleteDeadUserSessions` from `convex-lucia-auth`:

```ts
// convex/crons.ts

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

#### Custom SignUpSignIn

```tsx
// src/App.tsx or similar
import { useSignUpSignIn } from "@convex-dev/convex-lucia-auth/react";

function MySignUpSignIn() {
  const { flow, toggleFlow, error, onSubmit } = useSignUpSignIn({
    signIn: useMutationWithAuth(api.auth.signIn),
    signUp: useMutationWithAuth(api.auth.signUp),
  });
  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="username">Email</label>
      <MyInput name="email" id="email" />
      <label htmlFor="password">Password</label>
      <MyInput type="password" name="password" id="password" />
      <MyButton
        type="submit"
        value={flow === "signIn" ? "Sign in" : "Sign up"}
      />
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
    </form>
  );
}
```

#### Custom SignOutButton

```tsx
// src/App.tsx or similar
import { useSignOut } from "@convex-dev/convex-lucia-auth/react";

function MySignOutButton() {
  return <MyButton onClick={useSignOut()}>Logout</MyButton>;
}
```
