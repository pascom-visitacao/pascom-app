"use client";

// Campo "Áudio (opcional)" do formulário público (spec-audio-pedidos.md,
// seção 6.1): grava na hora (MediaRecorder) ou anexa um arquivo, com
// prévia num <audio controls> nativo (custo zero). O áudio NÃO sobe
// daqui - o componente só entrega o File pro form, que manda tudo junto
// no mesmo envio (request-form.tsx).

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Mic, Paperclip, Square } from "lucide-react";
import { Icon } from "@/components/icon";

export type AudioValue = { file: File; durationSeconds: number | null; source: "recorded" | "attached" };

export const AUDIO_MAX_BYTES = 2.5 * 1024 * 1024;
const MAX_SECONDS = 180;
const WARN_REMAINING_SECONDS = 15;
const RECORDER_BITRATE = 32000; // voz: ~0,7MB pra 3 min

const EXTENSION_BY_TYPE: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/aac": "aac",
  "audio/x-m4a": "m4a",
  "audio/wav": "wav",
};

// Alguns navegadores/SOs devolvem nomes de tipo não canônicos (ou vazio,
// pra .m4a/.opus vindos do WhatsApp) - normaliza pro que o servidor aceita.
const TYPE_ALIASES: Record<string, string> = {
  "audio/mp3": "audio/mpeg",
  "audio/x-mpeg": "audio/mpeg",
  "audio/x-wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/vnd.wave": "audio/wav",
  "audio/m4a": "audio/x-m4a",
  "audio/x-aac": "audio/aac",
};

const TYPE_BY_EXTENSION: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/x-m4a",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  oga: "audio/ogg",
  webm: "audio/webm",
  wav: "audio/wav",
  aac: "audio/aac",
  mp4: "audio/mp4",
};

const RECORDER_MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

const ERR_MIC_DENIED =
  "Não conseguimos acessar o microfone. Você pode liberar a permissão no navegador ou anexar um arquivo de áudio.";
const ERR_TOO_BIG = "Esse áudio passou de 2,5 MB. Tente um mais curto.";
const ERR_FORMAT = "Formato não aceito. Envie um áudio (.mp3, .m4a, .ogg, .webm, .wav).";

function baseType(type: string) {
  return type.split(";")[0].trim().toLowerCase();
}

function canonicalType(file: File): string | null {
  const fromType = baseType(file.type);
  const canonical = TYPE_ALIASES[fromType] ?? fromType;
  if (EXTENSION_BY_TYPE[canonical]) return canonical;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return TYPE_BY_EXTENSION[ext] ?? null;
}

function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Duração de arquivo anexado: lida do próprio arquivo, sem garantia -
// webm sem metadado devolve Infinity e o layout simplesmente esconde o
// tempo (duração nula).
function readDuration(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const probe = new Audio();
    probe.preload = "metadata";
    probe.onloadedmetadata = () =>
      resolve(Number.isFinite(probe.duration) && probe.duration > 0 ? Math.round(probe.duration) : null);
    probe.onerror = () => resolve(null);
    probe.src = url;
  });
}

const noopSubscribe = () => () => {};
function detectRecordingSupport() {
  return typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

export function AudioField({
  onChange,
  onRecordingChange,
  disabled,
}: {
  onChange: (value: AudioValue | null) => void;
  onRecordingChange: (recording: boolean) => void;
  disabled?: boolean;
}) {
  // false no servidor e na 1ª renderização do cliente, depois o valor
  // real - sem mismatch de hidratação. Navegador embutido (WhatsApp,
  // Instagram) não tem getUserMedia: o botão "Gravar" some sozinho.
  const canRecord = useSyncExternalStore(noopSubscribe, detectRecordingSupport, () => false);

  const [audio, setAudio] = useState<AudioValue | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const discardRef = useRef(false);
  const previewUrlRef = useRef<string | null>(null);

  function commit(next: AudioValue | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = next ? URL.createObjectURL(next.file) : null;
    previewUrlRef.current = url;
    setPreviewUrl(url);
    setAudio(next);
    onChange(next);
  }

  function stopTracks() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function clearTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  // Desmontar (envio concluído, navegação) com gravação em andamento:
  // descarta em vez de entregar um áudio que ninguém vai usar, e solta
  // o microfone (o indicador do navegador não pode ficar aceso).
  useEffect(() => {
    return () => {
      discardRef.current = true;
      clearTimer();
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
      stopTracks();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function finishRecording(recorder: MediaRecorder, durationSeconds: number) {
    clearTimer();
    stopTracks();
    setRecording(false);
    onRecordingChange(false);
    if (discardRef.current) return;

    const type = baseType(recorder.mimeType || RECORDER_MIME_CANDIDATES[0]);
    const blob = new Blob(chunksRef.current, { type });
    chunksRef.current = [];
    if (blob.size > AUDIO_MAX_BYTES) {
      setError(ERR_TOO_BIG);
      return;
    }
    const ext = EXTENSION_BY_TYPE[type] ?? "webm";
    commit({
      file: new File([blob], `audio-gravado.${ext}`, { type }),
      durationSeconds: Math.min(MAX_SECONDS, Math.max(1, Math.round(durationSeconds))),
      source: "recorded",
    });
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  async function startRecording() {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(ERR_MIC_DENIED);
      return;
    }

    const mimeType = RECORDER_MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t));
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: RECORDER_BITRATE,
      });
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setError(ERR_MIC_DENIED);
      return;
    }

    discardRef.current = false;
    chunksRef.current = [];
    streamRef.current = stream;
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => finishRecording(recorder, (Date.now() - startedAtRef.current) / 1000);

    startedAtRef.current = Date.now();
    recorder.start();
    setElapsed(0);
    setRecording(true);
    onRecordingChange(true);
    // Cronômetro do relógio, não contagem de ticks: setInterval atrasa
    // com a aba em segundo plano. Para sozinho em 3:00.
    timerRef.current = setInterval(() => {
      const seconds = (Date.now() - startedAtRef.current) / 1000;
      setElapsed(seconds);
      if (seconds >= MAX_SECONDS) stopRecording();
    }, 250);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    setError(null);

    const type = canonicalType(picked);
    if (!type) {
      setError(ERR_FORMAT);
      return;
    }
    if (picked.size > AUDIO_MAX_BYTES) {
      setError(ERR_TOO_BIG);
      return;
    }
    const file = picked.type === type ? picked : new File([picked], picked.name, { type });
    const probeUrl = URL.createObjectURL(file);
    const durationSeconds = await readDuration(probeUrl);
    URL.revokeObjectURL(probeUrl);
    commit({ file, durationSeconds, source: "attached" });
  }

  function remove() {
    setError(null);
    commit(null);
  }

  const remaining = MAX_SECONDS - elapsed;
  const nearLimit = recording && remaining <= WARN_REMAINING_SECONDS;
  const busy = disabled || recording;

  return (
    <div className="field new-request-field-full" role="group" aria-labelledby={titleId}>
      <span id={titleId} className="field-label">
        Áudio (opcional)
      </span>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.m4a,.opus,.ogg,.mp3,.wav,.webm,.aac"
        onChange={handleFile}
        style={{ display: "none" }}
      />

      {error && (
        <div className="alert alert-danger" role="alert">
          <div>{error}</div>
        </div>
      )}

      {recording ? (
        <div className="audio-box">
          <div className="audio-rec-row">
            <span className="audio-rec-status" role="status">
              <span className="audio-rec-dot" aria-hidden="true" />
              Gravando...
            </span>
            <span className="audio-rec-clock">
              {formatClock(elapsed)} / {formatClock(MAX_SECONDS)}
            </span>
          </div>
          <p
            className="field-hint"
            style={nearLimit ? { color: "var(--color-warning-text)", fontWeight: "var(--weight-medium)" } : undefined}
          >
            {nearLimit ? `Faltam ${Math.max(0, Math.ceil(remaining))} segundos: a gravação para sozinha em 3:00.` : "Limite de 3 minutos."}
          </p>
          <button type="button" className="btn btn-danger btn-md" onClick={stopRecording}>
            <Icon icon={Square} size={16} />
            Parar
          </button>
        </div>
      ) : audio ? (
        <div className="audio-box">
          <div className="audio-rec-row">
            <span style={{ fontWeight: "var(--weight-semibold)" }}>Seu áudio</span>
            {audio.durationSeconds !== null && <span className="audio-rec-clock">{formatClock(audio.durationSeconds)}</span>}
          </div>
          {previewUrl && <audio controls preload="metadata" src={previewUrl} style={{ width: "100%" }} />}
          {audio.source === "attached" && (
            <span className="field-hint">
              {audio.file.name} · {formatSize(audio.file.size)}
            </span>
          )}
          <div className="audio-actions">
            {audio.source === "recorded" ? (
              canRecord && (
                <button
                  type="button"
                  className="btn btn-outline btn-md"
                  disabled={disabled}
                  onClick={() => {
                    remove();
                    void startRecording();
                  }}
                >
                  <Icon icon={Mic} size={18} />
                  Regravar
                </button>
              )
            ) : (
              <button
                type="button"
                className="btn btn-outline btn-md"
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon icon={Paperclip} size={18} />
                Trocar arquivo
              </button>
            )}
            <button type="button" className="btn btn-outline btn-md" disabled={disabled} onClick={remove}>
              Remover
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="field-hint">Prefere explicar falando? Grave um áudio ou anexe um arquivo.</p>
          <div className="audio-actions">
            {canRecord && (
              <button type="button" className="btn btn-outline btn-md" disabled={busy} onClick={() => void startRecording()}>
                <Icon icon={Mic} size={18} />
                Gravar áudio
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline btn-md"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon icon={Paperclip} size={18} />
              Anexar arquivo
            </button>
          </div>
          {!canRecord && <span className="field-hint">Para gravar, abra este link no Chrome ou Safari.</span>}
          <span className="field-hint">
            Máx. 3 minutos ou 2,5 MB. Seu áudio será ouvido pela equipe da Pascom e apagado quando o pedido for
            concluído e removido.
          </span>
        </>
      )}
    </div>
  );
}
