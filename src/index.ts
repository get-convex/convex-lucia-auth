import {
  DataModelFromSchemaDefinition,
  DatabaseReader,
  DatabaseWriter,
  DocumentByName,
  MutationCtx,
  QueryCtx,
  defineSchema,
  defineTable,
  internalMutationGeneric as internalMutation,
  internalQueryGeneric as internalQuery,
  mutationGeneric as mutation,
  queryGeneric as query,
} from "convex/server";
import { ObjectType, PropertyValidators, Validator, v } from "convex/values";
import { Session } from "lucia";

export type DatabaseUserAttributes = Omit<
  DocumentByName<ConvexLuciaAuth.DataModel, "users">,
  "id"
>;

export type DatabaseSessionAttributes = Omit<
  DocumentByName<ConvexLuciaAuth.DataModel, "sessions">,
  "id" | "user_id" | "active_expires" | "idle_expires"
>;

export function queryWithAuth<
  ArgsValidator extends PropertyValidators,
  Output
>({
  args,
  handler,
}: {
  args: ArgsValidator;
  handler: (
    ctx: Omit<QueryCtx<ConvexLuciaAuth.DataModel>, "auth"> & {
      session: Session | null;
    },
    args: ObjectType<ArgsValidator>
  ) => Output;
}) {
  return query({
    args: {
      ...args,
      sessionId: v.union(v.null(), v.string()),
    },
    handler: async (ctx, args: any) => {
      const session = await getValidExistingSession(ctx, args.sessionId);
      return handler({ ...ctx, session }, args);
    },
  });
}

export function internalQueryWithAuth<
  ArgsValidator extends PropertyValidators,
  Output
>({
  args,
  handler,
}: {
  args: ArgsValidator;
  handler: (
    ctx: Omit<QueryCtx<ConvexLuciaAuth.DataModel>, "auth"> & {
      session: Session | null;
    },
    args: ObjectType<ArgsValidator>
  ) => Output;
}) {
  return internalQuery({
    args: { ...args, sessionId: v.union(v.null(), v.string()) },
    handler: async (ctx, args: any) => {
      const session = await getValidExistingSession(ctx, args.sessionId);
      return handler({ ...ctx, session }, args);
    },
  });
}

export function mutationWithAuth<
  ArgsValidator extends PropertyValidators,
  Output
>({
  args,
  handler,
}: {
  args: ArgsValidator;
  handler: (
    ctx: Omit<MutationCtx<ConvexLuciaAuth.DataModel>, "auth"> & {
      auth: Auth;
      session: Session | null;
    },
    args: ObjectType<ArgsValidator>
  ) => Output;
}) {
  return mutation({
    args: { ...args, sessionId: v.union(v.null(), v.string()) },
    handler: async (ctx, args: any) => {
      const auth = getAuth(ctx.db);
      const session = await getValidSessionAndRenew(auth, args.sessionId);
      return handler({ ...ctx, session, auth }, args);
    },
  });
}

export function internalMutationWithAuth<
  ArgsValidator extends PropertyValidators,
  Output
>({
  args,
  handler,
}: {
  args: ArgsValidator;
  handler: (
    ctx: Omit<MutationCtx<ConvexLuciaAuth.DataModel>, "auth"> & {
      auth: Auth;
      session: Session | null;
    },
    args: ObjectType<ArgsValidator>
  ) => Output;
}) {
  return internalMutation({
    args: { ...args, sessionId: v.union(v.null(), v.string()) },
    handler: async (ctx, args: any) => {
      const auth = getAuth(ctx.db);
      const session = await getValidSessionAndRenew(auth, args.sessionId);
      return handler({ ...ctx, session, auth }, args);
    },
  });
}

async function getValidExistingSession(
  ctx: QueryCtx<ConvexLuciaAuth.DataModel>,
  sessionId: string | null
) {
  if (sessionId === null) {
    return null;
  }
  // The cast is OK because we will only expose the existing session
  const auth = getAuth(ctx.db as DatabaseWriter<ConvexLuciaAuth.DataModel>);
  try {
    const session = (await auth.getSession(sessionId)) as Session | null;
    if (session === null || session.state === "idle") {
      return null;
    }
    return session;
  } catch (error) {
    // Invalid session ID
    return null;
  }
}

export async function getValidSessionAndRenew(
  auth: Auth,
  sessionId: string | null
) {
  if (sessionId === null) {
    return null;
  }
  try {
    return await auth.validateSession(sessionId);
  } catch (error) {
    // Invalid session ID
    return null;
  }
}

// lucia.ts
import {
  Adapter,
  KeySchema,
  LuciaErrorConstructor,
  SessionSchema,
  UserSchema,
  lucia,
} from "lucia";

type SessionId = string;
type UserId = string;
type KeyId = string;

const minimalSchema = defineSchema({
  ...authTables({
    user: {},
    session: {},
  }),
});

export type MinimalDataModel = DataModelFromSchemaDefinition<
  typeof minimalSchema
>;

export function authTables<
  UserFields extends Record<string, Validator<any, any, any>>,
  SchemaFields extends Record<string, Validator<any, any, any>>
>({ user, session }: { user: UserFields; session: SchemaFields }) {
  return {
    users: defineTable({
      ...user,
      id: v.string(),
    }).index("byId", ["id"]),
    sessions: defineTable({
      ...session,
      id: v.string(),
      user_id: v.string(),
      active_expires: v.float64(),
      idle_expires: v.float64(),
    })
      // `as any` because TypeScript can't infer the table fields correctly
      .index("byId", ["id" as any])
      .index("byUserId", ["user_id" as any]),
    auth_keys: defineTable({
      id: v.string(),
      hashed_password: v.union(v.string(), v.null()),
      user_id: v.string(),
    })
      .index("byId", ["id"])
      .index("byUserId", ["user_id"]),
  };
}

// Set the LUCIA_ENVIRONMENT variable to "PROD"
// on your prod deployment's dashboard
export function getAuth(db: DatabaseWriter<ConvexLuciaAuth.DataModel>) {
  return lucia({
    adapter: convexAdapter(db),
    env: (process.env.LUCIA_ENVIRONMENT as "PROD" | undefined) ?? "DEV",
    getUserAttributes(user: UserSchema) {
      return user;
    },
    getSessionAttributes(session: SessionSchema) {
      return session;
    },
  });
}

export type Auth = ReturnType<typeof getAuth>;

export function convexAdapter(db: DatabaseWriter<ConvexLuciaAuth.DataModel>) {
  return (LuciaError: LuciaErrorConstructor): Adapter => ({
    async getSessionAndUser(
      sessionId: string
    ): Promise<[SessionSchema, UserSchema] | [null, null]> {
      const session = await getSession(db, sessionId);
      if (session === null) {
        return [null, null];
      }
      const user = await getUser(db, session.user_id);
      if (user === null) {
        return [null, null];
      }
      return [session, user];
    },
    async deleteSession(sessionId: SessionId): Promise<void> {
      const session = await getSession(db, sessionId);
      if (session === null) {
        return;
      }
      await db.delete(session._id);
    },
    async deleteSessionsByUserId(userId: UserId): Promise<void> {
      const sessions = await this.getSessionsByUserId(userId);
      await Promise.all(sessions.map((session) => db.delete(session._id)));
    },
    async getSession(sessionId: SessionId): Promise<SessionSchema | null> {
      return await getSession(db, sessionId);
    },
    async getSessionsByUserId(userId: UserId): Promise<SessionSchema[]> {
      return await db
        .query("sessions")
        .withIndex("byUserId", (q) => q.eq("user_id", userId))
        .collect();
    },
    async setSession(session: SessionSchema): Promise<void> {
      const { _id, _creationTime, ...data } = session;
      await db.insert("sessions", data);
    },
    async deleteKeysByUserId(userId: UserId): Promise<void> {
      const keys = await db
        .query("auth_keys")
        .withIndex("byUserId", (q) => q.eq("user_id", userId))
        .collect();
      await Promise.all(keys.map((key) => db.delete(key._id)));
    },
    async deleteKey(keyId: KeyId): Promise<void> {
      const key = await getKey(db, keyId);
      if (key === null) {
        return;
      }
      await db.delete(key._id);
    },
    async deleteUser(userId: UserId): Promise<void> {
      const user = await getUser(db, userId);
      if (user === null) {
        return;
      }
      await db.delete(user._id);
    },
    async getKey(keyId: KeyId): Promise<KeySchema | null> {
      return await getKey(db, keyId);
    },
    async getKeysByUserId(userId: UserId): Promise<KeySchema[]> {
      return await db
        .query("auth_keys")
        .withIndex("byUserId", (q) => q.eq("user_id", userId))
        .collect();
    },
    async getUser(userId: UserId): Promise<UserSchema | null> {
      return await getUser(db, userId);
    },
    async setKey(key: KeySchema): Promise<void> {
      const existingKey = await this.getKey(key.id);
      if (existingKey !== null) {
        throw new LuciaError("AUTH_DUPLICATE_KEY_ID");
      }
      const user = await this.getUser(key.user_id);
      if (user === null) {
        throw new LuciaError("AUTH_INVALID_USER_ID");
      }
      await db.insert("auth_keys", key);
    },
    async setUser(user: UserSchema, key: KeySchema | null): Promise<void> {
      const { _id, _creationTime, ...data } = user;
      await db.insert("users", data);
      if (key !== null) {
        await this.setKey(key);
      }
    },
    async updateKey(
      keyId: string,
      partialKey: Partial<KeySchema>
    ): Promise<void> {
      const key = await getKey(db, keyId);
      if (key === null) {
        throw new LuciaError("AUTH_INVALID_KEY_ID");
      }
      await db.patch(key._id, partialKey);
    },
    async updateUser(
      userId: string,
      partialUser: Partial<UserSchema>
    ): Promise<void> {
      const user = await getUser(db, userId);
      if (user === null) {
        throw new LuciaError("AUTH_INVALID_USER_ID");
      }
      await db.patch(user._id, partialUser);
    },
    async updateSession(
      sessionId: string,
      partialSession: Partial<SessionSchema>
    ): Promise<void> {
      const session = await getSession(db, sessionId);
      if (session === null) {
        throw new LuciaError("AUTH_INVALID_SESSION_ID");
      }
      await db.patch(session._id, partialSession);
    },
  });
}

export async function getSession(
  db: DatabaseReader<ConvexLuciaAuth.DataModel>,
  sessionId: string
) {
  return await db
    .query("sessions")
    .withIndex("byId", (q) => q.eq("id", sessionId))
    .first();
}

export async function getUser(
  db: DatabaseReader<ConvexLuciaAuth.DataModel>,
  userId: string
) {
  return await db
    .query("users")
    .withIndex("byId", (q) => q.eq("id", userId))
    .first();
}

export async function getKey(
  db: DatabaseReader<ConvexLuciaAuth.DataModel>,
  keyId: string
) {
  return await db
    .query("auth_keys")
    .withIndex("byId", (q) => q.eq("id", keyId))
    .first();
}

export async function findAndDeleteDeadUserSessions(ctx: {
  db: DatabaseWriter<ConvexLuciaAuth.DataModel>;
}) {
  const sessions = await ctx.db.query("sessions").collect();
  for (const session of sessions) {
    await getAuth(ctx.db).deleteDeadUserSessions(session.user_id);
  }
}
