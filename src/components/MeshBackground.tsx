export function MeshBackground({ variant = "mint" }: { variant?: "mint" | "constellation" }) {
  if (variant === "constellation") {
    return (
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-constellation">
        <svg className="absolute inset-0 h-full w-full opacity-50" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="dot" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#c4b5fd" />
              <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0" />
            </radialGradient>
          </defs>
          {Array.from({ length: 28 }).map((_, i) => {
            const x = (i * 137.5) % 100;
            const y = (i * 73.3) % 100;
            return <circle key={i} cx={`${x}%`} cy={`${y}%`} r="2" fill="url(#dot)" />;
          })}
        </svg>
      </div>
    );
  }
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="bg-mesh animate-drift absolute -inset-[10%]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(167,215,211,0.35),transparent_55%)]" />
    </div>
  );
}
