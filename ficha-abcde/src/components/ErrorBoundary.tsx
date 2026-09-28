import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import type { FichaDB } from '../data/db';
import type { Repo } from '../data/repo';
import { backupFilename, downloadText } from '../pwa/download';

interface Props {
  repo: Repo;
  db: FichaDB;
  children: ReactNode;
}
interface State {
  error: Error | null;
  notice: string | null;
  confirmClear: boolean;
}

/** Rede de segurança: nada de tela branca. Oferece exportar os dados antes de limpar. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, notice: null, confirmClear: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Só o erro técnico: nunca dados de treino em logs.
    console.error(
      'Falha na interface:',
      error.message,
      info.componentStack?.split('\n')[1]?.trim(),
    );
  }

  exportData = async () => {
    try {
      downloadText(backupFilename(Date.now()), await this.props.repo.exportBackup());
      this.setState({ notice: 'Backup baixado. Guarde o arquivo em local seguro.' });
    } catch (e) {
      this.setState({
        notice: `Não foi possível exportar: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  };

  clearData = async () => {
    try {
      await this.props.db.delete();
      location.reload();
    } catch (e) {
      this.setState({
        notice: `Não foi possível limpar: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="screen" role="alert">
        <h1 className="big">Algo deu errado</h1>
        <p>
          O app encontrou um erro inesperado. Seus treinos continuam salvos neste
          aparelho.
        </p>
        <p className="muted">{this.state.error.message}</p>
        {this.state.notice && <p className="warn">{this.state.notice}</p>}
        <button className="btn btn-primary" onClick={() => location.reload()}>
          Recarregar o app
        </button>
        <button className="btn" onClick={() => void this.exportData()}>
          Exportar meus dados (backup)
        </button>
        {!this.state.confirmClear ? (
          <button
            className="btn btn-danger"
            onClick={() => this.setState({ confirmClear: true })}
          >
            Limpar dados locais…
          </button>
        ) : (
          <div className="card">
            <p>
              Isso apaga todos os treinos deste aparelho. Exporte o backup antes.
              Continuar?
            </p>
            <div className="row">
              <button
                className="btn"
                onClick={() => this.setState({ confirmClear: false })}
              >
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={() => void this.clearData()}>
                Apagar tudo
              </button>
            </div>
          </div>
        )}
      </main>
    );
  }
}
