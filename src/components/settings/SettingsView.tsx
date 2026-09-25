import React, { useEffect, useState } from 'react';
import { dataService } from '../../lib/storageStore';
import { useAuth } from '../../context/AuthContext';
import { PousadaConfig } from '../../types';

export const SettingsView: React.FC = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<PousadaConfig | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { dataService.fetchConfig().then(setConfig).catch(e => setMessage(e.message)); }, []);
  const fields: [keyof PousadaConfig, string, string][] = [
    ['name','Nome da pousada','text'], ['document_cnpj','CNPJ / documento','text'], ['address','Endereço','text'],
    ['phone','Telefone','text'], ['email','E-mail','email'], ['default_checkin_time','Entrada padrão','time'], ['default_checkout_time','Saída padrão','time']
  ];
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (!config || busy) return;
    setBusy(true); setMessage('');
    try { setConfig(await dataService.saveConfig(config)); setMessage('Configurações salvas.'); }
    catch(e: any) { setMessage(e.message); } finally { setBusy(false); }
  };
  return <section className="pms-card"><h2>Configurações da pousada</h2>
    {message && <p role="status">{message}</p>}
    {!config ? <p>Carregando configurações…</p> : <form onSubmit={save}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:16 }}>
        {fields.map(([key,label,type]) => <label key={key}>{label}<input className="form-control" type={type} value={config[key] || ''} required={key === 'name' || type === 'time'} disabled={busy || user?.role !== 'admin'} onChange={e => setConfig({...config,[key]:e.target.value})} /></label>)}
      </div><p>Fuso operacional: {config.timezone}. Horários de importação: entrada às 14h e saída às 12h, sinalizados na prévia.</p>
      <button className="btn btn-primary" disabled={busy || user?.role !== 'admin'}>{busy ? 'Salvando…' : 'Salvar configurações'}</button>
      {user?.role !== 'admin' && <p>Somente administradores podem editar as configurações.</p>}
    </form>}
    <h3>Permissões</h3><p>Administrador: configurações e operação. Recepção: cadastros, hospedagens, pagamentos e importação. Consulta: leitura. Usuários e papéis são administrados no Supabase.</p>
  </section>;
};
