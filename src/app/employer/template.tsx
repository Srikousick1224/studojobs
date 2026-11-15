/** Re-mounts on every navigation inside this dashboard, so each page glides in. */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in space-y-6">{children}</div>;
}
