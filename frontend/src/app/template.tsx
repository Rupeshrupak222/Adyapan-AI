// Root template.
// Next.js gives this a fresh key on every navigation, which guarantees the
// previous page's DOM is fully unmounted and recreated — no stale content or
// lingering page state can survive a route change.
export default function RootTemplate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
