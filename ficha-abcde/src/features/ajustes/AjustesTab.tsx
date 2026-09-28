import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../../data/appDataContext';
import type { Settings } from '../../domain/schemas';
import { createAlerts } from '../../pwa/alerts';
import { backupFilename, downloadText } from '../../pwa/download';
import { ensurePersistence, storageEstimate } from '../../pwa/storage';

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;

export function AjustesTab() {
  const { repo, now, reload, readOnly } = useAppData();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [ignored, setIgnored] = useState(0);
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const alerts = useMemo(() => createAlerts(() => repo.getSettings()), [repo]);

  useEffect(() => {
    let alive = true;
    void Promise.all([
      repo.getSettings(),
      repo.quarantineCount(),
      storageEstimate().catch(() => null),
    ]).then(
      ([s, q, u]) => {
        if (!alive) return;
        setSettings(s);
        setIgnored(q);
        setUsage(u);
      },
      (e: unknown) =>
        alive &&
        setMsg({ kind: 'err', text: `Não foi possível ler os ajustes: ${String(e)}` }),
    );
    return () => {
      alive = false;
    };
  }, [repo]);

  async function toggle(key: 'sound' | 'vibration') {
    if (!settings) return;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    try {
      await repo.saveSettings(next);
    } catch (e) {
      setSettings(settings);
      setMsg({
        kind: 'err',
        text: `Não foi possível salvar: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  async function exportBackup() {
    try {
      downloadText(backupFilename(now()), await repo.exportBackup());
      setMsg({ kind: 'ok', text: 'Backup exportado.' });
    } catch (e) {
      setMsg({
        kind: 'err',
        text: `Não foi possível exportar: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  async function importBackup(file: File) {
    try {
      const r = await repo.importBackup(await file.text());
      await reload();
      setIgnored(await repo.quarantineCount());
      setMsg({
        kind: 'ok',
        text: `Backup importado: ${r.added} ${r.added === 1 ? 'treino adicionado' : 'treinos adicionados'}, ${r.skipped} já existiam${
          r.ignored
            ? `, ${r.ignored} ${r.ignored === 1 ? 'registro ignorado' : 'registros ignorados'} (inválidos)`
            : ''
        }.`,
      });
    } catch (e) {
      setMsg({
        kind: 'err',
        text: `Importação cancelada, nada foi alterado. ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  async function askPersist() {
    try {
      const granted = await ensurePersistence(repo);
      setSettings(await repo.getSettings());
      if (granted === null)
        setMsg({
          kind: 'err',
          text: 'Este navegador não oferece armazenamento persistente.',
        });
    } catch (e) {
      setMsg({ kind: 'err', text: String(e) });
    }
  }

  if (!settings) {
    return (
      <div className="screen">
        <p>Carregando…</p>
      </div>
    );
  }

  return (
    <div className="screen">
      {msg && (
        <p
          className={msg.kind === 'err' ? 'warn' : 'ok'}
          role={msg.kind === 'err' ? 'alert' : 'status'}
        >
          {msg.text}
        </p>
      )}

      <section className="card" aria-labelledby="alerta-title">
        <h2 id="alerta-title" className="small">
          Alerta de descanso
        </h2>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.sound}
            disabled={readOnly}
            onChange={() => void toggle('sound')}
          />
          <span>Som</span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.vibration}
            disabled={readOnly}
            onChange={() => void toggle('vibration')}
          />
          <span>Vibração</span>
        </label>
        <button
          className="btn"
          onClick={() => {
            alerts.prime();
            void alerts.finished();
          }}
        >
          Testar alerta
        </button>
      </section>

      <section className="card" aria-labelledby="backup-title">
        <h2 id="backup-title" className="small">
          Backup
        </h2>
        <p className="muted">
          Exporte para guardar uma cópia. Importar mescla com o que já existe, sem
          duplicar.
        </p>
        <div className="row">
          <button className="btn" onClick={() => void exportBackup()}>
            Exportar backup
          </button>
          <label className={`btn file-btn ${readOnly ? 'is-disabled' : ''}`}>
            Importar backup
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              disabled={readOnly}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void importBackup(f);
              }}
            />
          </label>
        </div>
      </section>

      <section className="card" aria-labelledby="arm-title">
        <h2 id="arm-title" className="small">
          Armazenamento
        </h2>
        <p>
          Armazenamento persistente:{' '}
          <strong>
            {settings.persistGranted === null
              ? 'não verificado'
              : settings.persistGranted
                ? 'ativo'
                : 'negado'}
          </strong>
        </p>
        {settings.persistGranted === false && (
          <p className="warn">
            O navegador pode apagar os dados se faltar espaço. Instale o app na tela
            inicial e exporte backups de vez em quando.
          </p>
        )}
        {settings.persistGranted !== true && (
          <button className="btn" onClick={() => void askPersist()}>
            Pedir armazenamento persistente
          </button>
        )}
        {usage && (
          <p className="muted">
            Usando {mb(usage.usage)} de {mb(usage.quota)} disponíveis.
          </p>
        )}
        {ignored > 0 && (
          <p className="warn" role="status">
            {ignored} {ignored === 1 ? 'registro ignorado' : 'registros ignorados'} por
            estarem inválidos (isolados, sem afetar o app).
          </p>
        )}
      </section>

      <section className="card" aria-labelledby="sync-title">
        <h2 id="sync-title" className="small">
          Sincronização
        </h2>
        <p>Salvo neste aparelho.</p>
        <p className="muted">
          A sincronização entre aparelhos é opcional e ainda não está ativada.
        </p>
      </section>

      <section className="card" aria-labelledby="inst-title">
        <h2 id="inst-title" className="small">
          Instalar na tela inicial
        </h2>
        <p>
          <strong>Android (Chrome):</strong> menu ⋮ → “Instalar app” ou “Adicionar à tela
          inicial”.
        </p>
        <p>
          <strong>iPhone (Safari):</strong> botão Compartilhar → “Adicionar à Tela de
          Início”.
        </p>
        <p className="muted">
          Instalado, o app abre sem barra do navegador, funciona sem internet e o sistema
          protege melhor os seus dados.
        </p>
      </section>
    </div>
  );
}
