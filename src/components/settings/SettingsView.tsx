import React from 'react';
import { DEFAULT_POUSADA_CONFIG } from '../../lib/storageStore';
import { Settings, Shield, Clock, Globe, Building } from 'lucide-react';

export const SettingsView: React.FC = () => {
  return (
    <div className="settings-view-container">
      {/* Toolbar */}
      <div className="section-toolbar">
        <div className="toolbar-title-group">
          <h2>Configurações Gerais do Sistema</h2>
          <p>Gerencie dados da pousada, regras de check-in/out, fuso horário e permissões de usuários</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Pousada Data */}
        <div style={{ background: 'var(--paper)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building size={18} color="var(--accent)" /> Dados da Pousada
          </h3>

          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label>Nome Fantasia</label>
            <input className="form-control" defaultValue={DEFAULT_POUSADA_CONFIG.name} readOnly />
          </div>

          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label>CNPJ / Documento</label>
            <input className="form-control" defaultValue={DEFAULT_POUSADA_CONFIG.document_cnpj} readOnly />
          </div>

          <div className="form-group">
            <label>Endereço</label>
            <input className="form-control" defaultValue={DEFAULT_POUSADA_CONFIG.address} readOnly />
          </div>
        </div>

        {/* Operational Schedule & Timezone */}
        <div style={{ background: 'var(--paper)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="var(--accent)" /> Horários Padrão & Fuso Horário
          </h3>

          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label>Horário Padrão Check-in (Entrada)</label>
            <input className="form-control" defaultValue={DEFAULT_POUSADA_CONFIG.default_checkin_time} readOnly />
          </div>

          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label>Horário Padrão Check-out (Saída)</label>
            <input className="form-control" defaultValue={DEFAULT_POUSADA_CONFIG.default_checkout_time} readOnly />
          </div>

          <div className="form-group">
            <label>Fuso Horário Operacional</label>
            <input className="form-control" defaultValue={`${DEFAULT_POUSADA_CONFIG.timezone} (UTC-3)`} readOnly />
            <small style={{ color: '#75847f', fontSize: '11px', marginTop: '4px' }}>
              Define a virada do dia operacional independente do fuso horário do dispositivo.
            </small>
          </div>
        </div>

        {/* Roles & Security */}
        <div style={{ background: 'var(--paper)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)', gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="var(--accent)" /> Níveis de Acesso & Permissões (RBAC)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '13px' }}>
            <div style={{ background: '#faf8f3', padding: '14px', borderRadius: '10px', border: '1px solid var(--line)' }}>
              <strong style={{ color: 'var(--ink)' }}>Administrador</strong>
              <p style={{ fontSize: '11px', color: '#6b7773', marginTop: '4px' }}>
                Acesso total: configurações da pousada, gestão de usuários, importações/exportações e operações de recepção.
              </p>
            </div>

            <div style={{ background: '#faf8f3', padding: '14px', borderRadius: '10px', border: '1px solid var(--line)' }}>
              <strong style={{ color: 'var(--ink)' }}>Recepção</strong>
              <p style={{ fontSize: '11px', color: '#6b7773', marginTop: '4px' }}>
                Operação diária: cadastro de hóspedes, check-in, check-out, acompanhamento de quartos. Sem acesso à administração de usuários.
              </p>
            </div>

            <div style={{ background: '#faf8f3', padding: '14px', borderRadius: '10px', border: '1px solid var(--line)' }}>
              <strong style={{ color: 'var(--ink)' }}>Consulta</strong>
              <p style={{ fontSize: '11px', color: '#6b7773', marginTop: '4px' }}>
                Apenas leitura de relatórios e disponibilidades autorizadas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
