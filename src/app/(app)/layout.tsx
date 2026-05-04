import Sidebar from '@/components/Sidebar';
import WizardGuide from '@/components/WizardGuide';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 h-full overflow-y-auto">{children}</main>
      <WizardGuide />
    </div>
  );
}
