import { useState } from 'react';
import { TreinosTab } from './features/treinos/TreinosTab';
import { WorkoutEditor } from './features/treinos/WorkoutEditor';
import { WorkoutPreview } from './features/treinos/WorkoutPreview';
import { TemplatesScreen } from './features/treinos/TemplatesScreen';
import { TemplateDetail } from './features/treinos/TemplateDetail';
import { PlanMetaEditor } from './features/treinos/PlanMetaEditor';
import { starterPlan } from './data/templates';
import type { WorkoutId } from './domain/schemas';
import { HistoricoTab } from './features/historico/HistoricoTab';
import { AjustesTab } from './features/ajustes/AjustesTab';
import { ConfirmDialog } from './components/ConfirmDialog';
import { UpdateBanner } from './components/UpdateBanner';
import { statusLabel, useSync } from './sync/syncContext';
import { useAppData } from './data/appDataContext';
import { SessaoScreen } from './features/sessao/SessaoScreen';

type Tab = 'treinos' | 'historico' | 'ajustes';
type View =
  | { kind: 'list' }
  | { kind: 'preview'; id: WorkoutId }
  | { kind: 'edit'; id: WorkoutId }
  | { kind: 'templates' }
  | { kind: 'template'; id: string }
  | { kind: 'meta' };

const TABS: { id: Tab; label: string }[] = [
  { id: 'treinos', label: 'Treinos' },
  { id: 'historico', label: 'Histórico' },
  { id: 'ajustes', label: 'Ajustes' },
];

export function App() {
  const { active, readOnly, plan, savePlan, now } = useAppData();
  const { status } = useSync();
  const [tab, setTab] = useState<Tab>('treinos');
  const [view, setView] = useState<View>({ kind: 'list' });
  const [confirmScratch, setConfirmScratch] = useState(false);
  const [scratchError, setScratchError] = useState<string | null>(null);

  // "Montar do zero": começa com um treino A vazio e abre o editor.
  const startScratch = async () => {
    try {
      await savePlan(starterPlan(now()));
      setView({ kind: 'edit', id: 'A' });
    } catch (e) {
      setScratchError(
        `Não foi possível criar a ficha: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  };
  const hasOwnPlan =
    plan.updatedAt > 0 && plan.workouts.some((w) => w.exercises.length > 0);
  const onScratch = () => (hasOwnPlan ? setConfirmScratch(true) : void startScratch());

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
          <TreinosTab
            onView={(id) => setView({ kind: 'preview', id })}
            onEdit={(id) => setView({ kind: 'edit', id })}
            onTemplates={() => setView({ kind: 'templates' })}
            onScratch={onScratch}
            onMeta={() => setView({ kind: 'meta' })}
          />
        )}
        {tab === 'treinos' && view.kind === 'templates' && (
          <TemplatesScreen
            first={plan.updatedAt === 0}
            onBack={() => setView({ kind: 'list' })}
            onOpen={(id) => setView({ kind: 'template', id })}
            onScratch={onScratch}
          />
        )}
        {tab === 'treinos' && view.kind === 'template' && (
          <TemplateDetail
            id={view.id}
            onBack={() => setView({ kind: 'templates' })}
            onApplied={() => setView({ kind: 'list' })}
          />
        )}
        {tab === 'treinos' && view.kind === 'meta' && (
          <PlanMetaEditor onDone={() => setView({ kind: 'list' })} />
        )}
        {scratchError && (
          <p className="warn banner" role="alert">
            {scratchError}
          </p>
        )}
        {confirmScratch && (
          <ConfirmDialog
            title="Montar uma ficha do zero?"
            message={`Sua ficha atual (“${plan.name}”) será substituída por uma ficha vazia. O histórico não muda. Se quiser guardar a atual, exporte um backup em Ajustes antes.`}
            confirmLabel="Começar do zero"
            danger
            onCancel={() => setConfirmScratch(false)}
            onConfirm={() => {
              setConfirmScratch(false);
              void startScratch();
            }}
          />
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
