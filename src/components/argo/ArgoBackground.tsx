import type { ReactNode } from "react";

export function ArgoBackground() {
  return (
    <div className="argo-bg" aria-hidden="true">
      <div className="argo-bg__gradient" />
      <div className="argo-bg__vignette" />
      <div className="argo-bg__noise" />
    </div>
  );
}

export function ArgoShell({ children }: { children: ReactNode }) {
  return (
    <div className="argo-shell">
      <ArgoBackground />
      <div className="argo-shell__content">{children}</div>
    </div>
  );
}
