import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export type CameraStatus =
  | "idle"
  | "requesting"
  | "live"
  | "denied"
  | "unavailable"
  | "insecure"
  | "busy"
  | "error";

export interface CameraFailure {
  code: CameraStatus;
  title: string;
  detail: string;
  hint: string;
}

const FAILURES: Record<string, CameraFailure> = {
  denied: {
    code: "denied",
    title: "Izin kamera ditolak",
    detail: "Browser memblokir akses kamera untuk situs ini.",
    hint: "Buka ikon kunci di address bar, izinkan kamera, lalu muat ulang halaman.",
  },
  unavailable: {
    code: "unavailable",
    title: "Kamera tidak ditemukan",
    detail: "Tidak ada perangkat kamera yang bisa dipakai.",
    hint: "Sambungkan webcam dan pastikan tidak dinonaktifkan di sistem operasi.",
  },
  insecure: {
    code: "insecure",
    title: "Koneksi tidak aman",
    detail: "Browser hanya mengizinkan kamera pada HTTPS atau localhost.",
    hint: "Jalankan lewat https:// atau http://localhost.",
  },
  busy: {
    code: "busy",
    title: "Kamera sedang dipakai",
    detail: "Aplikasi lain mengunci perangkat kamera.",
    hint: "Tutup aplikasi video conference atau tab lain yang memakai kamera.",
  },
  error: {
    code: "error",
    title: "Kamera gagal dimulai",
    detail: "Terjadi kesalahan saat membuka perangkat kamera.",
    hint: "Coba mulai ulang kamera atau muat ulang halaman.",
  },
};

export interface CameraController {
  status: CameraStatus;
  failure: CameraFailure | null;
  devices: MediaDeviceInfo[];
  activeDeviceId: string | null;
  start: (deviceId?: string) => Promise<void>;
  stop: () => void;
  switchCamera: () => Promise<void>;
}

export function useCamera(
  videoRef: RefObject<HTMLVideoElement>,
): CameraController {
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [failure, setFailure] = useState<CameraFailure | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus("idle");
  }, [videoRef]);

  const start = useCallback(
    async (deviceId?: string) => {
      if (!window.isSecureContext) {
        setFailure(FAILURES.insecure);
        setStatus("insecure");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setFailure(FAILURES.unavailable);
        setStatus("unavailable");
        return;
      }

      setStatus("requesting");
      setFailure(null);
      streamRef.current?.getTracks().forEach((track) => track.stop());

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: deviceId
            ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
            : {
                facingMode: "user",
                width: { ideal: 640 },
                height: { ideal: 480 },
              },
        });
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();
        setStatus("live");

        const track = stream.getVideoTracks()[0];
        const settings = track?.getSettings();
        if (settings?.deviceId) setActiveDeviceId(settings.deviceId);

        const all = await navigator.mediaDevices.enumerateDevices();
        setDevices(all.filter((device) => device.kind === "videoinput"));
      } catch (error) {
        streamRef.current = null;
        const name = error instanceof DOMException ? error.name : "";
        if (name === "NotAllowedError" || name === "SecurityError") {
          setFailure(FAILURES.denied);
          setStatus("denied");
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          setFailure(FAILURES.unavailable);
          setStatus("unavailable");
        } else if (name === "NotReadableError") {
          setFailure(FAILURES.busy);
          setStatus("busy");
        } else {
          setFailure(FAILURES.error);
          setStatus("error");
        }
      }
    },
    [videoRef],
  );

  const switchCamera = useCallback(async () => {
    if (devices.length < 2) return;
    const current = devices.findIndex((device) => device.deviceId === activeDeviceId);
    const next = devices[(current + 1) % devices.length];
    await start(next.deviceId);
  }, [activeDeviceId, devices, start]);

  useEffect(() => stop, [stop]);

  return { status, failure, devices, activeDeviceId, start, stop, switchCamera };
}
