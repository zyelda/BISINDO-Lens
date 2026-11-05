import type { ReactNode, RefObject } from "react";

interface CameraStageProps {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  mirror: boolean;
  live: boolean;
  children?: ReactNode;
}

export default function CameraStage({
  videoRef,
  canvasRef,
  mirror,
  live,
  children,
}: CameraStageProps) {
  return (
    <div className="relative overflow-hidden border border-[color:var(--rule)] bg-stage">
      <div className="relative aspect-[4/3] w-full">
        <div
          className={`absolute inset-0 ${mirror ? "[transform:scaleX(-1)]" : ""}`}
        >
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
            autoPlay
            aria-label="Pratinjau kamera"
          />
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
          />
        </div>

        {!live ? (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            {children}
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-3" aria-hidden="true">
          <span className="absolute left-0 top-0 h-4 w-4 border-l border-t border-paper/50" />
          <span className="absolute right-0 top-0 h-4 w-4 border-r border-t border-paper/50" />
          <span className="absolute bottom-0 left-0 h-4 w-4 border-b border-l border-paper/50" />
          <span className="absolute bottom-0 right-0 h-4 w-4 border-b border-r border-paper/50" />
        </div>
      </div>
    </div>
  );
}
