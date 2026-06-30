type AdikaErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type AdikaEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: AdikaErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __adikaEvents?: AdikaEvents;
  }
}

export function reportAdikaError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.__adikaEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context,
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    },
  );
}
