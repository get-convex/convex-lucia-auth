import { ReactMutation, useMutation, useQuery } from "convex/react";
import { FunctionReference } from "convex/server";
import {
  FormEvent,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

type SessionId = string;

const SessionContext = createContext<{
  sessionId: SessionId | null;
  setSessionId: (sessionId: SessionId | null) => void;
}>(undefined as any);

export function useSessionId() {
  return useContext(SessionContext)!.sessionId;
}

export function useSetSessionId() {
  return useContext(SessionContext!)!.setSessionId;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionIdState] = useState(getSavedSessionId());
  const setSessionId = useCallback(
    (value: SessionId | null) => {
      setSavedSessionId(value);
      setSessionIdState(value);
    },
    [setSessionIdState]
  );
  return (
    <SessionContext.Provider value={{ sessionId, setSessionId }}>
      {children}
    </SessionContext.Provider>
  );
}

function getSavedSessionId() {
  return localStorage.getItem("sessionId");
}

export function setSavedSessionId(sessionId: SessionId | null) {
  if (sessionId == null) {
    localStorage.removeItem("sessionId");
  } else {
    localStorage.setItem("sessionId", sessionId);
  }
}

// Sign in / sign up
export function SignUpSignIn({
  labelClassName,
  inputClassName,
  buttonClassName,
  flowToggleClassName,
  errorDisplayClassName,
  signIn,
  signUp,
  onError,
}: {
  labelClassName?: string;
  inputClassName?: string;
  buttonClassName?: string;
  flowToggleClassName?: string;
  errorDisplayClassName?: string;
  signIn: (args: { email: string; password: string }) => Promise<SessionId>;
  signUp: (args: { email: string; password: string }) => Promise<SessionId>;
  onError?: (flow: "signIn" | "signUp", error: unknown) => void;
}) {
  const { flow, toggleFlow, onSubmit, error } = useSignUpSignIn({
    signIn,
    signUp,
    onError,
  });
  return (
    <form onSubmit={onSubmit}>
      <label className={labelClassName} htmlFor="username">
        Email
      </label>
      <input
        className={inputClassName}
        name="email"
        id="email"
        autoComplete="username"
      />
      <label className={labelClassName} htmlFor="password">
        Password
      </label>
      <input
        className={inputClassName}
        type="password"
        name="password"
        id="password"
        autoComplete={flow === "signIn" ? "current-password" : "new-password"}
      />
      <input
        className={buttonClassName}
        type="submit"
        value={flow === "signIn" ? "Sign in" : "Sign up"}
      />
      <a className={flowToggleClassName} onClick={toggleFlow}>
        {flow === "signIn"
          ? "Don't have an account? Sign up"
          : "Already have an account? Sign in"}
      </a>
      <div className={errorDisplayClassName}>
        {error !== undefined
          ? flow === "signIn"
            ? "Could not sign in, did you mean to sign up?"
            : "Could not sign up, did you mean to sign in?"
          : null}
      </div>
    </form>
  );
}

// Sign out
export function SignOutButton({ className }: { className?: string }) {
  return (
    <button className={className} onClick={useSignOut()}>
      Logout
    </button>
  );
}

// Hooks

export function useSignUpSignIn({
  signIn,
  signUp,
  onError,
}: {
  signIn: (args: { email: string; password: string }) => Promise<SessionId>;
  signUp: (args: { email: string; password: string }) => Promise<SessionId>;
  onError?: (flow: "signIn" | "signUp", error: unknown) => void;
}) {
  const setSessionId = useSetSessionId();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<unknown>();
  const toggleFlow = useCallback(() => {
    setFlow(flow === "signIn" ? "signUp" : "signIn");
    clearError();
  }, [flow, setFlow]);
  const clearError = useCallback(() => setError(undefined), [setError]);
  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearError();
    const data = new FormData(event.currentTarget);
    try {
      const sessionId = await (flow === "signIn" ? signIn : signUp)({
        email: (data.get("email") as string | null) ?? "",
        password: (data.get("password") as string | null) ?? "",
      });
      setSessionId(sessionId);
    } catch (error) {
      // TODO: Display the error after the form,
      // because that's what most people will want to do anyway
      onError?.(flow, error);
      setError(error);
    }
  };
  return { onSubmit, flow, setFlow, toggleFlow, error, setError, clearError };
}

export function useSignOut() {
  const setSessionId = useSetSessionId();
  return useCallback(() => setSessionId(null), [setSessionId]);
}

// Convex Hooks

export function useQueryWithAuth<
  Args extends { sessionId: string | null },
  Query extends FunctionReference<"query", "public", Args>
>(
  query: Query,
  args: Omit<Query["_args"], "sessionId">
): Query["_returnType"] | undefined {
  const sessionId = useSessionId();
  return useQuery(query, { ...args, sessionId } as any);
}

export function useMutationWithAuth<
  Args extends { sessionId: string | null },
  Mutation extends FunctionReference<"mutation", "public", Args>
>(
  mutation: Mutation
): ReactMutation<
  FunctionReference<"mutation", "public", Omit<Mutation["_args"], "sessionId">>
> {
  const doMutation = useMutation(mutation);
  const sessionId = useSessionId();
  return useCallback(
    (args: Omit<Mutation["_args"], "sessionId">) => {
      return doMutation({ ...args, sessionId } as any);
    },
    [doMutation, sessionId]
  ) as any; // We don't support optimistic updates
}
