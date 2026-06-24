import { useEffect, useRef, useState } from "react";
import portrait from "@/assets/creator_portrait.png.asset.json";

const SHORT_DESC =
  "I'm the creator behind Adika AI — building a single intelligence layer where candidates grow and recruiters decide with clarity. Less noise, more signal. Always shipping.";

function useSlideUp() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => e.isIntersecting && setShown(true),
      { threshold: 0.15 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, shown };
}

export function CreatorShowcase() {
  const a = useSlideUp();

  const slide = (shown: boolean) =>
    `transition-all duration-1000 ease-out ${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`;

  return (
    <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">The creator</p>
      <h2 className="mt-3 font-display text-3xl md:text-4xl">A philosophy, in one frame.</h2>

      <div className="mt-12">
        <div ref={a.ref} className={`relative overflow-hidden rounded-3xl bg-[#0a0816] p-8 md:p-10 ${slide(a.shown)}`}>
          <div className="grid items-center gap-6 md:grid-cols-[1fr_1.1fr]">
            <div className="text-white/80">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">Manifesto · 01</p>
              <p className="mt-4 text-sm leading-relaxed text-white/70">{SHORT_DESC}</p>
              <a
                href="https://aditya-31.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-block border-b border-white/40 pb-0.5 text-xs uppercase tracking-widest text-white hover:border-white"
              >
                Read more
              </a>
            </div>
            <div className="relative flex h-72 items-end justify-center md:h-96">
              <div
                aria-hidden
                className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full md:h-72 md:w-72"
                style={{
                  background: "radial-gradient(circle at 50% 50%, #efe9ff 0%, #d9c9ff 55%, #b79bff 100%)",
                  filter: "blur(0.5px)",
                }}
              />
              <img
                src={portrait.url}
                alt="Adika AI creator portrait"
                className="relative z-10 h-full w-auto max-w-full object-contain object-bottom"
              />
              <p className="absolute right-4 top-6 z-20 max-w-[55%] text-right font-display text-3xl leading-[0.95] text-white md:text-5xl">
                Never<br />More<br />to <em className="not-italic text-gold">Have</em>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
