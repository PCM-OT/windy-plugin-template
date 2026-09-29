import { AccountForm } from '../ajustes/AccountForm';

/** Tela de entrada no primeiro acesso: entrar, criar conta ou continuar sem conta. */
export function LoginScreen({ onGuest }: { onGuest: () => void }) {
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Ficha ABCDE</span>
      </header>
      <main className="screen login">
        <h1 className="big">Entre na sua conta</h1>
        <p className="muted">
          Com uma conta, seus treinos ficam guardados e você usa em mais de um aparelho.
          Cada pessoa tem a própria conta: os treinos de uma não aparecem para a outra,
          nem no mesmo celular.
        </p>
        <section className="card" aria-label="Acesso à conta">
          <AccountForm />
        </section>
        <section className="card" aria-labelledby="guest-title">
          <h2 id="guest-title" className="small">
            Prefere não criar conta agora?
          </h2>
          <p className="muted">
            Você pode usar o app só neste aparelho, mesmo sem internet, e criar uma conta
            depois em Ajustes.
          </p>
          <button className="btn" onClick={onGuest}>
            Continuar sem conta
          </button>
        </section>
      </main>
    </div>
  );
}
