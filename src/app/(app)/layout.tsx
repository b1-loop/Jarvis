import Sidebar from '@/components/Sidebar';
import WizardGuide from '@/components/WizardGuide';
import LocationReminder from '@/components/LocationReminder';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 h-full overflow-y-auto">{children}</main>
      <WizardGuide />
      <LocationReminder />
    </div>
  );
}
