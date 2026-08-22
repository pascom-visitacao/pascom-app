"use client";

import { useTransition } from "react";
import { deleteSocialMediaAccount } from "./actions";

export function DeleteSocialMediaButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-outline btn-sm"
      disabled={isPending}
      onClick={() => startTransition(() => deleteSocialMediaAccount(id))}
    >
      Remover
    </button>
  );
}
