import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export function AccessGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isConfigured, loginDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (isLoading) return <main className="pms-card">Verificando acesso...</main>;
  if (user) return <>{children}</>;
  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      const profile = await supabase.from('user_profiles').select('active').eq('id', result.data.user.id).single();
      if (profile.error || !profile.data?.active) {
        await supabase.auth.signOut();
        throw new Error('Sua conta ainda não tem um perfil ativo nesta pousada. Solicite a configuração ao administrador.');
      }
      setPassword('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível entrar.'); }
    finally { setBusy(false); }
  };
  return <main className="pms-card" style={{ maxWidth: 440, margin: '10vh auto', padding: 28 }}>
    <h1>Acesso à recepção</h1>
    {isConfigured ? <form onSubmit={login}>
      <div className="form-group"><label htmlFor="login-email">E-mail</label><input id="login-email" className="form-control" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div className="form-group"><label htmlFor="login-password">Senha</label><input id="login-password" className="form-control" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
      {error && <p role="alert">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Entrando...' : 'Entrar'}</button>
    </form> : <><p>Os registros do modo local ficam neste navegador.</p><button className="btn btn-primary" onClick={() => loginDemo()}>Abrir modo local</button></>}
  </main>;
}
