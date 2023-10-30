"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMutationWithAuth = exports.useQueryWithAuth = exports.useSignOut = exports.useSignUpSignIn = exports.SignOutButton = exports.SignUpSignIn = exports.setSavedSessionId = exports.SessionProvider = exports.useSetSessionId = exports.useSessionId = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("convex/react");
const react_2 = require("react");
const SessionContext = (0, react_2.createContext)(undefined);
function useSessionId() {
    return (0, react_2.useContext)(SessionContext).sessionId;
}
exports.useSessionId = useSessionId;
function useSetSessionId() {
    return (0, react_2.useContext)(SessionContext).setSessionId;
}
exports.useSetSessionId = useSetSessionId;
function SessionProvider({ children }) {
    const [sessionId, setSessionIdState] = (0, react_2.useState)(getSavedSessionId());
    const setSessionId = (0, react_2.useCallback)((value) => {
        setSavedSessionId(value);
        setSessionIdState(value);
    }, [setSessionIdState]);
    return ((0, jsx_runtime_1.jsx)(SessionContext.Provider, { value: { sessionId, setSessionId }, children: children }));
}
exports.SessionProvider = SessionProvider;
function getSavedSessionId() {
    return localStorage.getItem("sessionId");
}
function setSavedSessionId(sessionId) {
    if (sessionId == null) {
        localStorage.removeItem("sessionId");
    }
    else {
        localStorage.setItem("sessionId", sessionId);
    }
}
exports.setSavedSessionId = setSavedSessionId;
// Sign in / sign up
function SignUpSignIn({ labelClassName, inputClassName, buttonClassName, flowToggleClassName, errorDisplayClassName, signIn, signUp, onError, }) {
    const { flow, toggleFlow, onSubmit, error } = useSignUpSignIn({
        signIn,
        signUp,
        onError,
    });
    return ((0, jsx_runtime_1.jsxs)("form", { onSubmit: onSubmit, children: [(0, jsx_runtime_1.jsx)("label", { className: labelClassName, htmlFor: "username", children: "Email" }), (0, jsx_runtime_1.jsx)("input", { className: inputClassName, name: "email", id: "email", autoComplete: "username" }), (0, jsx_runtime_1.jsx)("label", { className: labelClassName, htmlFor: "password", children: "Password" }), (0, jsx_runtime_1.jsx)("input", { className: inputClassName, type: "password", name: "password", id: "password", autoComplete: flow === "signIn" ? "current-password" : "new-password" }), (0, jsx_runtime_1.jsx)("input", { className: buttonClassName, type: "submit", value: flow === "signIn" ? "Sign in" : "Sign up" }), (0, jsx_runtime_1.jsx)("a", { className: flowToggleClassName, onClick: toggleFlow, children: flow === "signIn"
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Sign in" }), (0, jsx_runtime_1.jsx)("div", { className: errorDisplayClassName, children: error !== undefined
                    ? flow === "signIn"
                        ? "Could not sign in, did you mean to sign up?"
                        : "Could not sign up, did you mean to sign in?"
                    : null })] }));
}
exports.SignUpSignIn = SignUpSignIn;
// Sign out
function SignOutButton({ className }) {
    return ((0, jsx_runtime_1.jsx)("button", { className: className, onClick: useSignOut(), children: "Logout" }));
}
exports.SignOutButton = SignOutButton;
// Hooks
function useSignUpSignIn({ signIn, signUp, onError, }) {
    const setSessionId = useSetSessionId();
    const [flow, setFlow] = (0, react_2.useState)("signIn");
    const [error, setError] = (0, react_2.useState)();
    const toggleFlow = (0, react_2.useCallback)(() => {
        setFlow(flow === "signIn" ? "signUp" : "signIn");
        clearError();
    }, [flow, setFlow]);
    const clearError = (0, react_2.useCallback)(() => setError(undefined), [setError]);
    const onSubmit = (event) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        event.preventDefault();
        clearError();
        const data = new FormData(event.currentTarget);
        try {
            const sessionId = yield (flow === "signIn" ? signIn : signUp)({
                email: (_a = data.get("email")) !== null && _a !== void 0 ? _a : "",
                password: (_b = data.get("password")) !== null && _b !== void 0 ? _b : "",
            });
            setSessionId(sessionId);
        }
        catch (error) {
            // TODO: Display the error after the form,
            // because that's what most people will want to do anyway
            onError === null || onError === void 0 ? void 0 : onError(flow, error);
            setError(error);
        }
    });
    return { onSubmit, flow, setFlow, toggleFlow, error, setError, clearError };
}
exports.useSignUpSignIn = useSignUpSignIn;
function useSignOut() {
    const setSessionId = useSetSessionId();
    return (0, react_2.useCallback)(() => setSessionId(null), [setSessionId]);
}
exports.useSignOut = useSignOut;
// Convex Hooks
function useQueryWithAuth(query, args) {
    const sessionId = useSessionId();
    return (0, react_1.useQuery)(query, Object.assign(Object.assign({}, args), { sessionId }));
}
exports.useQueryWithAuth = useQueryWithAuth;
function useMutationWithAuth(mutation) {
    const doMutation = (0, react_1.useMutation)(mutation);
    const sessionId = useSessionId();
    return (0, react_2.useCallback)((args) => {
        return doMutation(Object.assign(Object.assign({}, args), { sessionId }));
    }, [doMutation, sessionId]); // We don't support optimistic updates
}
exports.useMutationWithAuth = useMutationWithAuth;
//# sourceMappingURL=react.js.map