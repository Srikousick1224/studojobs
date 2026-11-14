const skills = ["Python", "SQL", "React", "TypeScript", "Figma", "Excel", "Power BI", "SEO", "Java", "Machine learning", "Content writing", "Data analysis", "Node.js", "UI design", "Communication"];

/** Slow scrolling row of skills. Decorative; pauses on hover and stops for reduced-motion users. */
export function SkillMarquee() {
  const row = [...skills, ...skills];
  return (
    <div className="marquee overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]" aria-hidden="true">
      <div className="marquee-track gap-3">
        {row.map((s, i) => (
          <span key={`${s}-${i}`} className="mr-3 whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-700 shadow-soft ring-1 ring-ink-100">
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
