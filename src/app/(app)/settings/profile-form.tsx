"use client";

import { useState } from "react";
import Image from "next/image";
import { t, type Locale } from "@/lib/i18n";

type ProfileFormProps = {
  locale: Locale;
  initial: {
    name: string | null;
    username: string | null;
    imageUrl: string | null;
    email: string;
  };
};

export function ProfileForm({ locale, initial }: ProfileFormProps) {
  const [name, setName] = useState(initial.name ?? "");
  const [username, setUsername] = useState(initial.username ?? "");
  const [imageUrl, setImageUrl] = useState(initial.imageUrl ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("saving");
    setError(null);

    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || undefined,
        username: username.trim() || undefined,
        imageUrl: imageUrl.trim(),
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t("settings.profileError", locale));
      setStatus("error");
      return;
    }

    setStatus("saved");
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="h-16 w-16 overflow-hidden rounded-full border border-border/80 bg-white">
          {imageUrl ? (
            <Image src={imageUrl} alt="" width={64} height={64} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted">
              {t("settings.profilePhotoEmpty", locale)}
            </div>
          )}
        </div>
        <div className="min-w-[220px] flex-1 space-y-2">
          <label className="text-sm text-ink">{t("settings.profilePhoto", locale)}</label>
          <input
            type="file"
            accept="image/*"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setUploading(true);
              setUploadError(null);
              try {
                const formData = new FormData();
                formData.append("file", file);
                const res = await fetch("/api/upload", {
                  method: "POST",
                  body: formData,
                });
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  throw new Error(data.error ?? "Upload failed.");
                }
                const data = (await res.json()) as { url?: string };
                if (data.url) {
                  setImageUrl(data.url);
                } else {
                  throw new Error("Upload failed.");
                }
              } catch (err) {
                setUploadError(err instanceof Error ? err.message : "Upload failed.");
              } finally {
                setUploading(false);
              }
            }}
            className="w-full rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-emerald-500/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-emerald-700"
          />
          <input
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
          />
          <p className="sr-only">{t("settings.profilePhotoHint", locale)}</p>
          {uploading ? (
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
              Uploading...
            </p>
          ) : null}
          {uploadError ? (
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">
              {uploadError}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-ink">{t("settings.fullName", locale)}</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
          placeholder={t("settings.placeholders.fullName", locale)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm text-ink">{t("settings.username", locale)}</label>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="w-full rounded-sm border border-border/80 bg-white/80 px-3 py-2 text-sm text-ink focus:border-emerald-500 focus:outline-none"
          placeholder={t("settings.placeholders.username", locale)}
        />
        <p className="text-xs text-muted">{t("settings.usernameHint", locale)}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-ink">{t("settings.email", locale)}</label>
        <input
          value={initial.email}
          readOnly
          className="w-full rounded-sm border border-border/80 bg-white/60 px-3 py-2 text-sm text-ink"
        />
        <p className="text-xs text-muted">{t("settings.helpers.email", locale)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="pill bg-emerald-500 text-white border-transparent shadow-[0_10px_24px_rgba(121,211,198,0.32)] hover:brightness-105 disabled:opacity-60"
          disabled={status === "saving"}
        >
          {status === "saving"
            ? t("settings.profileSaving", locale)
            : t("settings.profileSave", locale)}
        </button>
        {status === "saved" ? (
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
            {t("settings.profileSaved", locale)}
          </span>
        ) : null}
        {status === "error" && error ? (
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">
            {error}
          </span>
        ) : null}
      </div>
    </form>
  );
}
