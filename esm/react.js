import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery } from "convex/react";
import { createContext, useCallback, useContext, useState, } from "react";
const SessionContext = createContext(undefined);
export function useSessionId() {
    return useContext(SessionContext).sessionId;
}
export function useSetSessionId() {
    return useContext(SessionContext).setSessionId;
}
export function SessionProvider({ children }) {
    const [sessionId, setSessionIdState] = useState(getSavedSessionId());
    const setSessionId = useCallback((value) => {
        setSavedSessionId(value);
        setSessionIdState(value);
    }, [setSessionIdState]);
    return (_jsx(SessionContext.Provider, { value: { sessionId, setSessionId }, children: children }));
}
function getSavedSessionId() {
    return localStorage.getItem("sessionId");
}
export function setSavedSessionId(sessionId) {
    if (sessionId == null) {
        localStorage.removeItem("sessionId");
    }
    else {
        localStorage.setItem("sessionId", sessionId);
    }
}
// Sign in / sign up
export function SignUpSignIn({ labelClassName, inputClassName, buttonClassName, flowToggleClassName, errorDisplayClassName, signIn, signUp, onError, }) {
    const { flow, toggleFlow, onSubmit, error } = useSignUpSignIn({
        signIn,
        signUp,
        onError,
    });
    return (_jsxs("form", { onSubmit: onSubmit, children: [_jsx("label", { className: labelClassName, htmlFor: "username", children: "Email" }), _jsx("input", { className: inputClassName, name: "email", id: "email", autoComplete: "username" }), _jsx("label", { className: labelClassName, htmlFor: "password", children: "Password" }), _jsx("input", { className: inputClassName, type: "password", name: "password", id: "password", autoComplete: flow === "signIn" ? "current-password" : "new-password" }), _jsx("input", { className: buttonClassName, type: "submit", value: flow === "signIn" ? "Sign in" : "Sign up" }), _jsx("a", { className: flowToggleClassName, onClick: toggleFlow, children: flow === "signIn"
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Sign in" }), _jsx("div", { className: errorDisplayClassName, children: error !== undefined
                    ? flow === "signIn"
                        ? "Could not sign in, did you mean to sign up?"
                        : "Could not sign up, did you mean to sign in?"
                    : null })] }));
}
// Sign out
export function SignOutButton({ className }) {
    return (_jsx("button", { className: className, onClick: useSignOut(), children: "Logout" }));
}
// Hooks
export function useSignUpSignIn({ signIn, signUp, onError, }) {
    const setSessionId = useSetSessionId();
    const [flow, setFlow] = useState("signIn");
    const [error, setError] = useState();
    const toggleFlow = useCallback(() => {
        setFlow(flow === "signIn" ? "signUp" : "signIn");
        clearError();
    }, [flow, setFlow]);
    const clearError = useCallback(() => setError(undefined), [setError]);
    const onSubmit = async (event) => {
        event.preventDefault();
        clearError();
        const data = new FormData(event.currentTarget);
        try {
            const sessionId = await (flow === "signIn" ? signIn : signUp)({
                email: data.get("email") ?? "",
                password: data.get("password") ?? "",
            });
            setSessionId(sessionId);
        }
        catch (error) {
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
export function useQueryWithAuth(query, args) {
    const sessionId = useSessionId();
    return useQuery(query, { ...args, sessionId });
}
export function useMutationWithAuth(mutation) {
    const doMutation = useMutation(mutation);
    const sessionId = useSessionId();
    return useCallback((args) => {
        return doMutation({ ...args, sessionId });
    }, [doMutation, sessionId]); // We don't support optimistic updates
}
//# sourceMappingURL=react.js.map