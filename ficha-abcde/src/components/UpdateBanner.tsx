import { useUpdateAvailable } from '../pwa/update';

/** Aviso de nova versão. Só existe fora de sessão: atualizar recarrega o app. */
export function UpdateBanner() {
  const apply = useUpdateAvailable();
  if (!apply) return null;
  return (
    <div className="warn banner update" role="status">
      <span>Nova versão disponível.</span>
      <button className="btn btn-primary" onClick={apply}>
        Atualizar
      </button>
    </div>
  );
}
