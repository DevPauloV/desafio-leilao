import { AppShell } from '@/components/app-shell';
import { CrumbLotProvider } from '@/components/crumb-lot-provider';
import { Splash } from '@/components/splash';
import { useLoaderVisible } from '@/hooks/use-loader-visible';
import { usePersonalEvents } from '@/hooks/use-personal-events';
import { useAuth } from '@/lib/auth';

export default function App() {
  usePersonalEvents();
  const { loading } = useAuth();
  const splash = useLoaderVisible(loading);

  // O app só monta com a sessão resolvida; o splash fica na mesma posição da árvore para não reiniciar ao sair.
  return (
    <>
      {splash && <Splash leaving={!loading} />}
      {!loading && (
        <CrumbLotProvider>
          <AppShell />
        </CrumbLotProvider>
      )}
    </>
  );
}
