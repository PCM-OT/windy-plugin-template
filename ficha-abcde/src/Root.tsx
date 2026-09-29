import { useCallback, useMemo, useState } from 'react';
import { App } from './App';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppDataProvider } from './data/AppData';
import {
  hasLocalData,
  loadProfile,
  moveLocalData,
  openHandle,
  saveProfile,
  loadGuest,
  saveGuest,
} from './data/profile';
import type { Handle, Profile } from './data/profile';
import { ensurePersistence } from './pwa/storage';
import { LoginScreen } from './features/login/LoginScreen';
import { useAppData } from './data/appDataContext';
import { SyncProvider } from './sync/SyncProvider';
import { useSync } from './sync/syncContext';
import type { SyncBackend, SyncUser } from './sync/types';

interface Props {
  /** Injetáveis nos testes. */
  loadBackend?: () => Promise<SyncBackend | null>;
  configured?: boolean;
}

/**
 * Raiz do app: escolhe o banco local conforme a conta (perfil). Ao entrar numa conta, se houver treinos
 * salvos no perfil anônimo, pergunta se devem ser vinculados a ela. Sair não apaga nada (a menos que
 * o usuário peça); a conta seguinte abre o próprio banco, sem ver os dados da anterior.
 */
export function Root({ loadBackend, configured }: Props) {
  const [profile, setProfile] = useState<Profile | null>(loadProfile);
  const [claim, setClaim] = useState<{ user: SyncUser } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userKey = profile?.userId ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- o banco só muda quando muda a conta
  const handle: Handle = useMemo(() => openHandle(profile), [userKey]);

  const switchTo = useCallback((p: Profile | null) => {
    saveProfile(p);
    setProfile(p);
  }, []);

  const onLogin = useCallback(
    async (user: SyncUser) => {
      try {
        // Só o perfil anônimo tem dados "sem dono" para vincular.
        if (userKey === null && (await hasLocalData(handle.db))) {
          setClaim({ user });
          return;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
      switchTo({ userId: user.id, email: user.email });
    },
    [userKey, handle, switchTo],
  );

  const onLogout = useCallback(
    (wipe: boolean) => {
      const old = handle;
      saveGuest(false); // saiu da conta: o próximo acesso começa pela tela de login
      switchTo(null);
      // Apaga depois que a árvore trocou de banco (senão a exclusão espera as conexões abertas).
      if (wipe && userKey)
        setTimeout(() => void old.db.delete().catch(() => undefined), 0);
    },
    [handle, userKey, switchTo],
  );

  async function confirmClaim(bring: boolean) {
    if (!claim) return;
    const target: Profile = { userId: claim.user.id, email: claim.user.email };
    setBusy(true);
    try {
      if (bring) {
        const to = openHandle(target);
        try {
          await moveLocalData(handle.db, to.db);
        } finally {
          to.db.close();
        }
      }
      setClaim(null);
      switchTo(target);
    } catch (e) {
      setError(
        `Não foi possível vincular os treinos: ${e instanceof Error ? e.message : String(e)}. Nada foi apagado.`,
      );
      setClaim(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ErrorBoundary key={userKey ?? 'anon'} repo={handle.repo} db={handle.db}>
      <AppDataProvider repo={handle.repo}>
        <SyncProvider
          db={handle.db}
          profileUserId={userKey}
          onLogin={(u) => void onLogin(u)}
          onLogout={onLogout}
          loadBackend={loadBackend}
          configured={configured}
        >
          <PersistOnce handle={handle} />
          <Gate profile={profile}>
            <App />
          </Gate>
          {error && (
            <p className="warn banner" role="alert">
              {error}
            </p>
          )}
          {claim && (
            <ConfirmDialog
              title="Vincular os treinos deste aparelho?"
              message={`Há treinos salvos neste aparelho. Quer vinculá-los à conta ${claim.user.email ?? ''}? Eles serão enviados para a nuvem dessa conta e deixarão de aparecer sem login.`}
              confirmLabel={busy ? 'Vinculando…' : 'Vincular à conta'}
              cancelLabel="Começar do zero"
              onCancel={() => void confirmClaim(false)}
              onConfirm={() => void confirmClaim(true)}
            />
          )}
        </SyncProvider>
      </AppDataProvider>
    </ErrorBoundary>
  );
}

/** Primeiro uso do banco: pede armazenamento persistente e guarda o resultado (visível em Ajustes). */
function PersistOnce({ handle }: { handle: Handle }) {
  useState(() => {
    ensurePersistence(handle.repo).catch((e: unknown) =>
      console.error('Armazenamento persistente:', e instanceof Error ? e.message : e),
    );
  });
  return null;
}

/**
 * Primeiro acesso: sem conta e sem ter escolhido "continuar sem conta", mostra a tela de login.
 * Nunca esconde um treino em andamento nem aparece se a conta não estiver configurada neste build.
 */
function Gate({
  profile,
  children,
}: {
  profile: Profile | null;
  children: React.ReactNode;
}) {
  const { configured, user } = useSync();
  const { active } = useAppData();
  const [guest, setGuest] = useState(loadGuest);
  if (!configured || profile || guest || active) return <>{children}</>;
  if (user) {
    return (
      <main className="screen" role="status">
        <p>Conectado. Preparando seus treinos…</p>
      </main>
    );
  }
  return (
    <LoginScreen
      onGuest={() => {
        saveGuest(true);
        setGuest(true);
      }}
    />
  );
}
