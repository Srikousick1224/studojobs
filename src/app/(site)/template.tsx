/** Re-mounts on every navigation inside the public site, giving each page a soft entrance. */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-rise">{children}</div>;
}
