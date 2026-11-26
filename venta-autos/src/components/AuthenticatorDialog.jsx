import { useEffect, useState } from 'react';
import { api } from '../api';
import AccessibleDialog from './AccessibleDialog';

const INPUT = 'w-full bg-surface border border-line rounded p-3 text-sm text-content';
const BUTTON = 'w-full bg-panel border border-line rounded p-3 text-sm font-bold text-content disabled:opacity-60';

export default function AuthenticatorDialog({ user, onClose }) {
  const [enabled, setEnabled] = useState(null);
  const [setup, setSetup] = useState(null);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    api('/api/auth/autenticador', user, { signal: controller.signal })
      .then(data => setEnabled(data.enabled))
      .catch(err => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [user]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const endpoint = setup ? '/api/auth/autenticador/confirmar' : '/api/auth/autenticador';
      const data = await api(endpoint, user, { method: 'POST', body: JSON.stringify(setup ? { code } : { password }) });
      if (setup) {
        setEnabled(data.enabled);
        setSetup(null);
      } else {
        setSetup(data);
      }
      setCode('');
      setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccessibleDialog title="App autenticadora" onClose={onClose}>
      <div className="p-6 space-y-4 text-content">
        {error && <p role="alert" className="border border-line rounded p-3">{error}</p>}
        {enabled === null && !error && <p role="status">Consultando la configuración…</p>}
        {enabled && <p role="status">App autenticadora activa. La próxima vez que inicies sesión, selecciona <strong>Usar código de la app autenticadora</strong>.</p>}
        {enabled === false && <form className="space-y-4" aria-busy={busy} onSubmit={submit}>
          {setup ? <>
            <p>Escanea el QR con Google Authenticator o ingresa la clave manualmente. Después escribe el código de seis dígitos que muestra la app.</p>
            <img src={setup.qr} alt="QR para vincular AutoPremium con tu app autenticadora" width={280} height={280} className="mx-auto max-w-full h-auto" />
            <label className="block" htmlFor="authenticator-key">Clave manual</label>
            <input id="authenticator-key" className={INPUT} type="text" autoComplete="off" spellCheck={false}
              readOnly value={setup.manualKey} onFocus={event => event.target.select()} />
            <label className="block" htmlFor="authenticator-code">Código de seis dígitos</label>
            <input id="authenticator-code" className={INPUT} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}"
              required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
            <button className={BUTTON} type="submit" disabled={busy || code.length !== 6}>Activar app autenticadora</button>
            <button className="text-sm underline" type="button" disabled={busy}
              onClick={() => { setSetup(null); setCode(''); setError(''); }}>Generar otro QR</button>
          </> : <>
            <p>Confirma tu contraseña para vincular Google Authenticator u otra app compatible.</p>
            <label className="block" htmlFor="authenticator-password">Contraseña actual</label>
            <input id="authenticator-password" className={INPUT} type="password" autoComplete="current-password" maxLength={256}
              required value={password} onChange={event => setPassword(event.target.value)} />
            <button className={BUTTON} type="submit" disabled={busy}>Generar código QR</button>
          </>}
        </form>}
      </div>
    </AccessibleDialog>
  );
}
