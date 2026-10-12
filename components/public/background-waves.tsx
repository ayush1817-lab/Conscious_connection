// Decorative, CSS-only motion. No focusable elements or client-side state.
export function BackgroundWaves({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`ambient-waves ${className}`}>
      <svg className="wave-layer wave-layer-one" viewBox="0 0 1440 360" preserveAspectRatio="none" fill="none">
        <path d="M-80 190C160 20 310 330 560 190S940 30 1160 170s340 130 430-20" />
        <path d="M-80 215C160 45 310 355 560 215S940 55 1160 195s340 130 430-20" />
      </svg>
      <svg className="wave-layer wave-layer-two" viewBox="0 0 1440 360" preserveAspectRatio="none" fill="none">
        <path d="M-80 160C190 340 360 20 620 160s330 180 550 10 340-110 420 10" />
      </svg>
    </div>
  );
}
