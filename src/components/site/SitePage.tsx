import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

export default function SitePage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
