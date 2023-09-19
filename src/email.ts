import { GenericId } from "convex/values";
import { DocumentByName } from "convex/server";
import { Auth } from ".";

type EmptyObject = Record<string, never>;

type CustomUserFields = Omit<
  DocumentByName<ConvexLuciaAuth.DataModel, "users">,
  "_id" | "_creationTime" | "id" | "email"
>;
type CustomSessionFields = Omit<
  DocumentByName<ConvexLuciaAuth.DataModel, "sessions">,
  "_id" | "_creationTime" | "id" | "user_id" | "active_expires" | "idle_expires"
>;

export async function signInWithEmailAndPassword(
  ctx: { auth: Auth },
  email: string,
  password: string,
  ...additionalFields: CustomSessionFields extends EmptyObject
    ? [additionalFields?: { session?: EmptyObject }]
    : [additionalFields: { session: CustomSessionFields }]
) {
  const key = await ctx.auth.useKey("password", email, password);
  const session = await ctx.auth.createSession({
    userId: key.userId,
    attributes: {
      // These will be filled out by Convex
      _id: "" as GenericId<"sessions">,
      _creationTime: 0,
      ...additionalFields[0]?.session,
    },
  });
  return session;
}

export async function signUpWithEmailAndPassword(
  ctx: { auth: Auth },
  email: string,
  password: string,
  ...additionalFields:
    | CustomUserFields
    | CustomSessionFields extends EmptyObject
    ? [
        additionalFields?: {
          user?: EmptyObject;
          session?: EmptyObject;
        }
      ]
    : [
        additionalFields: {
          user: CustomUserFields;
          session: CustomSessionFields;
        }
      ]
) {
  const user = await ctx.auth.createUser({
    key: {
      password: password,
      providerId: "password",
      providerUserId: email,
    },
    attributes: {
      // @ts-ignore Consumers of email should have it in their schema
      email,
      // These will be filled out by Convex
      _id: "" as GenericId<"users">,
      _creationTime: 0,
      ...additionalFields[0]?.user,
    },
  });
  const session = await ctx.auth.createSession({
    userId: user.userId,
    attributes: {
      // These will be filled out by Convex
      _id: "" as GenericId<"sessions">,
      _creationTime: 0,
      ...additionalFields[0]?.session,
    },
  });
  return session;
}
