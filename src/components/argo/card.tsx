import type { HTMLAttributes } from "react";

const baseCard =
  "relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]/90 text-[color:var(--text)] backdrop-blur";

const elevationMap = {
  sm: "shadow-[0_8px_20px_rgba(13,19,22,0.18)]",
  md: "shadow-[0_16px_36px_rgba(13,19,22,0.22)]",
  lg: "shadow-[0_24px_52px_rgba(13,19,22,0.26)]",
} as const;

type CardProps = HTMLAttributes<HTMLDivElement> & {
  elevation?: keyof typeof elevationMap;
  interactive?: boolean;
};

function cn(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function Card({
  elevation = "md",
  interactive = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        baseCard,
        elevationMap[elevation],
        interactive
          ? "transition-transform duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(155,205,198,0.28)]"
          : undefined,
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pt-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold text-[color:var(--text)]", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-2 text-sm text-[color:var(--muted)]", className)} {...props} />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pb-6", className)} {...props} />;
}
