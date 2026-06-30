import crystalBg from "@/assets/crystal_bg.png.asset.json";

export function MeshBackground({ variant = "mint" }: { variant?: "mint" | "constellation" }) {
  if (variant === "constellation") {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-constellation"
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-90"
          style={{ backgroundImage: `url(${crystalBg.url})` }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,rgba(10,8,22,0.6)_70%,rgba(10,8,22,0.95)_100%)]" />
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
