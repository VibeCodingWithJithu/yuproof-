"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { UploadButton } from "@/components/HomeActions";
import { Icon } from "@/components/Icon";
import { parseQrPayload } from "@/lib/types";

type CamState = "starting" | "on" | "denied" | "unavailable";

/** VerifyScan: full-screen camera; the check starts as soon as a YuProof QR is in the frame. */
export function Scanner() {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const track = useRef<MediaStreamTrack | null>(null);
  const [cam, setCam] = useState<CamState>("starting");
  const [torch, setTorch] = useState<{ supported: boolean; on: boolean }>({ supported: false, on: false });
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let last = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const tick = (t: number) => {
      if (stopped) return;
      raf = requestAnimationFrame(tick);
      const v = video.current;
      if (!v || !ctx || v.readyState < 2 || t - last < 150) return;
      last = t;
      // Decode only the centre square, scaled down: faster and matches the on-screen frame.
      const side = Math.min(v.videoWidth, v.videoHeight);
      const size = Math.min(side, 640);
      canvas.width = canvas.height = size;
      ctx.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, size, size);
      const code = jsQR(ctx.getImageData(0, 0, size, size).data, size, size, { inversionAttempts: "dontInvert" });
      if (!code?.data) return;
      const parsed = parseQrPayload(code.data);
      if (!parsed) {
        setHint("This QR code isn't a YuProof document code.");
        return;
      }
      stopped = true;
      navigator.vibrate?.(40);
      router.push(parsed.docId ? `/v/${parsed.docId}` : `/s/${parsed.shareCode}`);
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCam("unavailable");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        const v = video.current!;
        v.srcObject = stream;
        await v.play().catch(() => {});
        track.current = stream.getVideoTracks()[0] ?? null;
        const caps = (track.current?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
        setTorch({ supported: !!caps.torch, on: false });
        setCam("on");
        raf = requestAnimationFrame(tick);
      } catch (err) {
        setCam((err as DOMException)?.name === "NotAllowedError" ? "denied" : "unavailable");
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [router]);

  async function toggleTorch() {
    const on = !torch.on;
    try {
      await track.current?.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
      setTorch({ supported: true, on });
    } catch {
      setTorch({ supported: false, on: false });
    }
  }

  return (
    <div className="phone" style={{ background: "#0A0E24", color: "#FFFFFF" }}>
      <video
        ref={video}
        playsInline
        muted
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: cam === "on" ? 0.55 : 0 }}
      />
      <header style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 12px" }}>
        <Link href="/" aria-label="Close" style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF" }}>
          <Icon name="close" size={24} />
        </Link>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Scan the QR code</h1>
        {torch.supported ? (
          <button
            type="button"
            aria-label={torch.on ? "Turn off torch" : "Turn on torch"}
            aria-pressed={torch.on}
            onClick={toggleTorch}
            style={{ width: 44, height: 44, border: 0, background: "transparent", color: torch.on ? "#FCD34D" : "#FFFFFF", cursor: "pointer" }}
          >
            <Icon name="torch" size={22} />
          </button>
        ) : (
          <span style={{ width: 44 }} />
        )}
      </header>

      <div style={{ position: "relative", flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
        <div style={{ position: "relative", width: 260, height: 260 }}>
          {cam !== "on" && (
            <div style={{ position: "absolute", inset: 30, borderRadius: 12, background: "#1B2244", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, textAlign: "center", fontSize: 14, color: "#DDE2F5" }}>
              {cam === "starting" ? "Starting camera…" : cam === "denied" ? "Camera access was blocked. Allow it in your browser settings, or upload the PDF." : "No camera available. Upload the PDF instead."}
            </div>
          )}
          <svg width="260" height="260" viewBox="0 0 260 260" aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
            <g fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round">
              <path d="M4 54V22a18 18 0 0 1 18-18h32" />
              <path d="M206 4h32a18 18 0 0 1 18 18v32" />
              <path d="M256 206v32a18 18 0 0 1-18 18h-32" />
              <path d="M54 256H22a18 18 0 0 1-18-18v-32" />
            </g>
            {cam === "on" && <rect className="scanline" x="24" y="128" width="212" height="3" rx="1.5" fill="#34D399" />}
          </svg>
        </div>
        <p role="status" style={{ margin: 0, maxWidth: 260, textAlign: "center", fontSize: 15, lineHeight: 1.5, color: "#DDE2F5" }}>
          {hint ?? "Hold steady. The check starts by itself when the code is in the frame."}
        </p>
      </div>

      <div style={{ position: "relative", padding: "20px 20px 30px", display: "flex", flexDirection: "column", gap: 10 }}>
        <UploadButton className="btn" style={{ height: 52, background: "#1E2754", color: "#FFFFFF" }} label="Upload PDF instead" />
        <p style={{ margin: 0, textAlign: "center", fontSize: 12, color: "#AEB7E0" }}>
          Camera is used only for scanning. Nothing is recorded.
        </p>
      </div>
    </div>
  );
}
