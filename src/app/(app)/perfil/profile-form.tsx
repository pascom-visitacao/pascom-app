"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { updateProfile } from "./actions";

export type ProfileData = {
  name: string;
  phone: string | null;
  bio: string | null;
  skills: string[];
  social_links: string[];
  avatar_url: string | null;
  roleLabel: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_SIZE = 96;

export function ProfileForm({ profile }: { profile: ProfileData }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-7)", maxWidth: 480, width: "100%" }}
      action={(formData) => {
        setError(null);
        setSuccess(false);
        startTransition(async () => {
          const result = await updateProfile(formData);
          if (result?.error) {
            setError(result.error);
          } else {
            setSuccess(true);
          }
        });
      }}
    >
      <div className="flex items-center" style={{ gap: "var(--space-5)" }}>
        <div style={{ position: "relative", width: AVATAR_SIZE, height: AVATAR_SIZE, flexShrink: 0 }}>
          {previewUrl ? (
            // preview local do arquivo escolhido (blob: URL) - next/image não lida com isso
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={profile.name}
              width={AVATAR_SIZE}
              height={AVATAR_SIZE}
              className="avatar-photo"
              style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
            />
          ) : profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.name}
              width={AVATAR_SIZE}
              height={AVATAR_SIZE}
              className="avatar-photo"
              style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
            />
          ) : (
            <span className="avatar avatar-lg" style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, fontSize: "var(--text-2xl)" }}>
              {initials(profile.name)}
            </span>
          )}
          <button
            type="button"
            aria-label="Alterar foto de perfil"
            onClick={() => fileInputRef.current?.click()}
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 32,
              height: 32,
              borderRadius: "var(--radius-full)",
              background: "var(--color-primary)",
              color: "#fff",
              border: "2px solid var(--color-surface)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
              <circle cx="12" cy="13" r="3.3" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPreviewUrl(URL.createObjectURL(file));
            }}
          />
        </div>
        <div className="flex flex-col" style={{ gap: "var(--space-2)", alignItems: "flex-start" }}>
          <div style={{ fontSize: "var(--text-lg)", fontWeight: "var(--weight-semibold)" }}>{profile.name}</div>
          <span className="badge badge-neutral">{profile.roleLabel}</span>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <div>{error}</div>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <div>Perfil atualizado.</div>
        </div>
      )}

      <div className="flex flex-col" style={{ gap: "var(--space-5)" }}>
        <div className="card-title" style={{ marginBottom: 0 }}>
          Informações pessoais
        </div>

        <div className="field" style={{ maxWidth: "none" }}>
          <label className="field-label">Nome</label>
          <div className="input-wrap">
            <input type="text" name="name" defaultValue={profile.name} required />
          </div>
        </div>

        <div className="field" style={{ maxWidth: "none" }}>
          <label className="field-label">Telefone / WhatsApp (opcional)</label>
          <div className="input-wrap">
            <input type="text" name="phone" defaultValue={profile.phone ?? ""} placeholder="(00) 00000-0000" />
          </div>
        </div>

        <div className="field" style={{ maxWidth: "none" }}>
          <label className="field-label">Biografia curta (opcional)</label>
          <textarea className="ds-textarea" name="bio" defaultValue={profile.bio ?? ""} rows={3} />
        </div>
      </div>

      <div className="flex flex-col" style={{ gap: "var(--space-3)" }}>
        <div className="card-title" style={{ marginBottom: 0 }}>
          Habilidades
        </div>
        <textarea
          className="ds-textarea"
          name="skills"
          defaultValue={profile.skills.join("\n")}
          rows={3}
          placeholder={"Fotografia\nEdição de vídeo"}
        />
      </div>

      <div className="flex flex-col" style={{ gap: "var(--space-3)" }}>
        <div className="card-title" style={{ marginBottom: 0 }}>
          Redes sociais
        </div>
        <textarea
          className="ds-textarea"
          name="social_links"
          defaultValue={profile.social_links.join("\n")}
          rows={3}
          placeholder={"https://instagram.com/..."}
        />
      </div>

      <button type="submit" className="btn btn-primary btn-md" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
