import { useEffect, useState } from 'react';
import { api } from '../api';
import { VistaAuthenticatorDialog } from './AuthenticatorDialog.vista.jsx';

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

  return <VistaAuthenticatorDialog {...{
    onClose, enabled, setup, setSetup, password, setPassword, code, setCode,
    busy, error, setError, submit,
  }} />;
}
