import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth/session';
import { AppShell } from '@/components/layout/AppShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <AppShell
      currentUser={{
        id: session.user.id,
        displayName: session.user.displayName,
        email: session.user.email,
        username: session.user.username,
        role: session.role,
      }}
      organization={{
        id: session.organization.id,
        name: session.organization.name,
      }}
    >
      {children}
    </AppShell>
  );
}
