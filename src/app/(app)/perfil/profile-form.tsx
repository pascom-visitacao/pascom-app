"use client";

import { useRef, useState, useTransition } from "react";
import { updateProfile } from "./actions";

export type ProfileData = {
  name: string;
  phone: string | null;
  bio: string | null;
  skills: string[];
  social_links: string[];
};

export function ProfileForm({ profile }: { profile: ProfileData }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", maxWidth: 480 }}
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

      <div className="field">
        <label className="field-label">Nome</label>
        <div className="input-wrap">
          <input type="text" name="name" defaultValue={profile.name} required />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Telefone / WhatsApp (opcional)</label>
        <div className="input-wrap">
          <input type="text" name="phone" defaultValue={profile.phone ?? ""} placeholder="(00) 00000-0000" />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Biografia curta (opcional)</label>
        <textarea className="ds-textarea" name="bio" defaultValue={profile.bio ?? ""} rows={3} />
      </div>

      <div className="field">
        <label className="field-label">Habilidades (opcional, uma por linha)</label>
        <textarea
          className="ds-textarea"
          name="skills"
          defaultValue={profile.skills.join("\n")}
          rows={3}
          placeholder={"Fotografia\nEdição de vídeo"}
        />
      </div>

      <div className="field">
        <label className="field-label">Redes sociais pessoais (opcional, um link por linha)</label>
        <textarea
          className="ds-textarea"
          name="social_links"
          defaultValue={profile.social_links.join("\n")}
          rows={3}
          placeholder={"https://instagram.com/..."}
        />
      </div>

      <div className="field">
        <label className="field-label">Foto de perfil (opcional)</label>
        <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" />
      </div>

      <button type="submit" className="btn btn-primary btn-md" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
