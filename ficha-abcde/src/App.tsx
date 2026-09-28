import { useState } from 'react';
import { TreinosTab } from './features/treinos/TreinosTab';
import { WorkoutEditor } from './features/treinos/WorkoutEditor';
import { WorkoutPreview } from './features/treinos/WorkoutPreview';
import type { WorkoutId } from './domain/schemas';
import { HistoricoTab } from './features/historico/HistoricoTab';
import { AjustesTab } from './features/ajustes/AjustesTab';
import { UpdateBanner } from './components/UpdateBanner';
import { statusLabel, useSync } from './sync/syncContext';
import { useAppData } from './data/appDataContext';
import { SessaoScreen } from './features/sessao/SessaoScreen';

type Tab = 'treinos' | 'historico' | 'ajustes';
type View =
  { kind: 'list' } | { kind: 'preview'; id: WorkoutId } | { kind: 'edit'; id: WorkoutId };

const TABS: { id: Tab; label: string }[] = [
  { id: 'treinos', label: 'Treinos' },
  { id: 'historico', label: 'Histórico' },
  { id: 'ajustes', label: 'Ajustes' },
];

export function App() {
  const { active, readOnly } = useAppData();
  const { status } = useSync();
  const [tab, setTab] = useState<Tab>('treinos');
  const [view, setView] = useState<View>({ kind: 'list' });

  // Sessão em andamento tem prioridade: ao reabrir o app, retoma exatamente onde estava.
  if (active && readOnly) {
    return (
      <main className="screen" role="alert">
        <h1 className="big">Treino em andamento em outra aba</h1>
        <p>
          Este app já está aberto em outra aba ou janela, com um treino em andamento.
          Volte para ela, ou feche-a para continuar aqui.
        </p>
      </main>
    );
  }
  if (active) return <SessaoScreen key={active.id} initial={active} />;

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Ficha ABCDE</span>
        <span className="sync-status" aria-live="polite">
          {statusLabel(status)}
        </span>
      </header>
      {readOnly && (
        <p className="warn banner" role="status">
          Este app está aberto em outra aba. Aqui você só pode consultar; feche a outra
          aba para editar.
        </p>
      )}
      <UpdateBanner />
      <main>
        {tab === 'treinos' && view.kind === 'list' && (
          <TreinosTab onView={(id) => setView({ kind: 'preview', id })} />
        )}
        {tab === 'treinos' && view.kind === 'preview' && (
          <WorkoutPreview
            id={view.id}
            onBack={() => setView({ kind: 'list' })}
            onEdit={() => setView({ kind: 'edit', id: view.id })}
          />
        )}
        {tab === 'treinos' && view.kind === 'edit' && (
          <WorkoutEditor
            id={view.id}
            onDone={() => setView({ kind: 'preview', id: view.id })}
          />
        )}
        {tab === 'historico' && <HistoricoTab />}
        {tab === 'ajustes' && <AjustesTab />}
      </main>
      <nav className="tabbar" aria-label="Seções">
        {TABS.map((t) => (
          <button
            key={t.id}
            className="tab"
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => {
              setTab(t.id);
              setView({ kind: 'list' });
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
