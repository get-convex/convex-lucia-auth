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
export function SignUpSignIn({ labelClassName, inputClassName, buttonClassName, flowToggleClassName, signIn, signUp, onError, }) {
    const setSessionId = useSetSessionId();
    const [flow, setFlow] = useState("signIn");
    const handleSubmit = async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        try {
            const sessionId = await (flow === "signIn" ? signIn : signUp)({
                email: data.get("email") ?? "",
                password: data.get("password") ?? "",
            });
            setSessionId(sessionId);
        }
        catch (error) {
            // TODO: Display the error after the form,
            // because that's what most people will want to do anyway
            onError?.(flow, error);
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, children: [_jsx("label", { className: labelClassName, htmlFor: "username", children: "Email" }), _jsx("input", { className: inputClassName, name: "email", id: "email" }), _jsx("label", { className: labelClassName, htmlFor: "password", children: "Password" }), _jsx("input", { className: inputClassName, type: "password", name: "password", id: "password" }), _jsx("input", { className: buttonClassName, type: "submit", value: flow === "signIn" ? "Sign in" : "Sign up" }), _jsx("a", { className: flowToggleClassName, onClick: () => {
                    setFlow(flow === "signIn" ? "signUp" : "signIn");
                }, children: flow === "signIn"
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Sign in" })] }));
}
// Sign out
export function SignOutButton({ className }) {
    const setSessionId = useSetSessionId();
    return (_jsx("button", { className: className, onClick: () => setSessionId(null), children: "Logout" }));
}
// Hooks
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