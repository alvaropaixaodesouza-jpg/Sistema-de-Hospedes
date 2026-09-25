import { useDataRefresh } from '../../lib/useDataRefresh';
import React, { useState, useEffect } from 'react';
import { Guest, Stay, AuditLog } from '../../types';
import { dataService } from '../../lib/storageStore';
import { maskCPF, maskPhone, formatDatePTBR, formatDateTimePTBR, formatCurrency } from '../../lib/formatters';
import { X, Edit, Plus, UserCheck, Calendar, Sliders, History, Shield, CheckCircle, AlertTriangle } from 'lucide-react';

interface GuestDrawerProps {
  guest: Guest | null;
  onClose: () => void;
  onEdit: (guest: Guest) => void;
  onNewStay: (guest: Guest) => void;
}

export const GuestDrawer: React.FC<GuestDrawerProps> = ({
  guest,
  onClose,
  onEdit,
  onNewStay
}) => {
  const [activeTab, setActiveTab] = useState<'cadastro' | 'hospedagens' | 'preferencias' | 'alteracoes'>('cadastro');
  const [stays, setStays] = useState<Stay[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFullCpf, setShowFullCpf] = useState(false);

  useDataRefresh(() => guest && loadGuestDetails(guest.id));
  useEffect(() => {
    if (guest) {
      loadGuestDetails(guest.id);
    }
  }, [guest]);

  const loadGuestDetails = async (guestId: string) => {
    setIsLoading(true);
    try {
      const [fetchedStays, fetchedLogs] = await Promise.all([
        dataService.fetchStays({ guestId }),
        dataService.fetchAuditLogs(guestId)
      ]);
      setStays(fetchedStays);
      setAuditLogs(fetchedLogs);
    } catch (err) {
      console.error('Error loading guest drawer details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!guest) return null;

  return (
    <div className="drawer-backdrop">
      <div className="drawer-panel">
        {/* Top Header */}
        <div className="drawer-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="code-badge">{guest.internal_code}</span>
              {guest.is_incomplete && (
                <span style={{ fontSize: '10px', background: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={12} /> Cadastro Incompleto
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', fontFamily: '"Newsreader", serif' }}>
              {guest.full_name}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-primary btn-sm" onClick={() => onNewStay(guest)}>
              <Plus size={14} /> Nova Hospedagem
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onEdit(guest)}>
              <Edit size={14} /> Editar
            </button>
            <button onClick={onClose} style={{ padding: '6px', color: '#6b7773' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="drawer-tabs">
          <button 
            className={`tab-btn ${activeTab === 'cadastro' ? 'active' : ''}`}
            onClick={() => setActiveTab('cadastro')}
          >
            <UserCheck size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
            1. Cadastro
          </button>
          <button 
            className={`tab-btn ${activeTab === 'hospedagens' ? 'active' : ''}`}
            onClick={() => setActiveTab('hospedagens')}
          >
            <Calendar size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
            2. Hospedagens ({stays.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'preferencias' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferencias')}
          >
            <Sliders size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
            3. Preferências
          </button>
          <button 
            className={`tab-btn ${activeTab === 'alteracoes' ? 'active' : ''}`}
            onClick={() => setActiveTab('alteracoes')}
          >
            <History size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
            4. Alterações
          </button>
        </div>

        {/* Body Content */}
        <div className="drawer-body">
          {activeTab === 'cadastro' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Informações Pessoais */}
              <div style={{ background: '#faf8f3', padding: '16px', borderRadius: '12px', border: '1px solid var(--line)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>
                  Identificação do Hóspede
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#75847f', display: 'block', fontSize: '11px' }}>ID Interno Único</span>
                    <strong style={{ fontFamily: 'monospace', fontSize: '11px' }}>{guest.id}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#75847f', display: 'block', fontSize: '11px' }}>Código Visível</span>
                    <strong className="code-badge">{guest.internal_code}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#75847f', display: 'block', fontSize: '11px' }}>CPF</span>
                    <strong>{maskCPF(guest.cpf, showFullCpf)}</strong>
                    {guest.cpf && (
                      <button 
                        onClick={() => setShowFullCpf(!showFullCpf)} 
                        style={{ fontSize: '10px', color: 'var(--accent)', marginLeft: '8px', textDecoration: 'underline' }}
                      >
                        {showFullCpf ? 'Ocultar' : 'Revelar CPF'}
                      </button>
                    )}
                  </div>
                  <div>
                    <span style={{ color: '#75847f', display: 'block', fontSize: '11px' }}>Celular / Telefone</span>
                    <strong>{maskPhone(guest.phone)}</strong>
                  </div>
                  {guest.alt_doc_number && (
                    <div>
                      <span style={{ color: '#75847f', display: 'block', fontSize: '11px' }}>Doc. Alternativo</span>
                      <strong>{guest.alt_doc_type || 'Documento'}: {guest.alt_doc_number} ({guest.alt_doc_country || 'Estrangeiro'})</strong>
                    </div>
                  )}
                  {guest.email && (
                    <div>
                      <span style={{ color: '#75847f', display: 'block', fontSize: '11px' }}>E-mail</span>
                      <strong>{guest.email}</strong>
                    </div>
                  )}
                  {guest.birth_date && (
                    <div>
                      <span style={{ color: '#75847f', display: 'block', fontSize: '11px' }}>Data de Nascimento</span>
                      <strong>{formatDatePTBR(guest.birth_date)}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Endereço */}
              <div style={{ background: '#faf8f3', padding: '16px', borderRadius: '12px', border: '1px solid var(--line)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>
                  Endereço & Origem
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#75847f', display: 'block', fontSize: '11px' }}>Cidade / UF</span>
                    <strong>{guest.city || 'Não informada'} {guest.state ? `/ ${guest.state}` : ''}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#75847f', display: 'block', fontSize: '11px' }}>Bairro</span>
                    <strong>{guest.neighborhood || 'Não informado'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#75847f', display: 'block', fontSize: '11px' }}>Logradouro</span>
                    <strong>{guest.street || '-'} {guest.number ? `, ${guest.number}` : ''}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#75847f', display: 'block', fontSize: '11px' }}>País</span>
                    <strong>{guest.country || 'Brasil'}</strong>
                  </div>
                </div>
              </div>

              {/* Datas de Controle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '11px', color: '#75847f' }}>
                <span>Cadastrado em: {formatDateTimePTBR(guest.created_at)}</span>
                <span>Última atualização: {formatDateTimePTBR(guest.updated_at)}</span>
              </div>
            </div>
          )}

          {activeTab === 'hospedagens' && (
            <div>
              {stays.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', background: '#faf8f3', borderRadius: '12px', color: '#75847f' }}>
                  Nenhuma hospedagem registrada para este hóspede até o momento.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {stays.map((stay) => (
                    <div key={stay.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', textTransform: 'uppercase',
                          background: stay.status === 'hospedado' ? '#def7ec' : stay.status === 'finalizada' ? '#e1effe' : '#fde8e8',
                          color: stay.status === 'hospedado' ? '#03543f' : stay.status === 'finalizada' ? '#1e429f' : '#9b1c1c'
                        }}>
                          {stay.status}
                        </span>
                        <strong style={{ fontSize: '14px', color: 'var(--accent)' }}>
                          {formatCurrency(stay.agreed_amount)}
                        </strong>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                        <div>
                          <span style={{ color: '#75847f', display: 'block', fontSize: '10px' }}>Entrada</span>
                          <strong>{formatDateTimePTBR(stay.check_in_expected)}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#75847f', display: 'block', fontSize: '10px' }}>Saída Prevista</span>
                          <strong>{formatDateTimePTBR(stay.check_out_expected)}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#75847f', display: 'block', fontSize: '10px' }}>Acomodação</span>
                          <strong>{stay.room?.number_name || 'Quarto'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#75847f', display: 'block', fontSize: '10px' }}>Nº Hóspedes</span>
                          <strong>{stay.party_size} pessoa(s)</strong>
                        </div>
                      </div>

                      {stay.notes && (
                        <p style={{ fontSize: '12px', color: '#6b7773', background: '#faf8f3', padding: '8px', borderRadius: '6px', margin: 0 }}>
                          Obs: {stay.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'preferencias' && (
            <div style={{ background: '#faf8f3', padding: '20px', borderRadius: '12px', border: '1px solid var(--line)' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Preferências Permanentes
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                {guest.preferences || 'Nenhuma preferência ou observação permanente cadastrada.'}
              </p>
            </div>
          )}

          {activeTab === 'alteracoes' && (
            <div>
              {auditLogs.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', background: '#faf8f3', borderRadius: '12px', color: '#75847f' }}>
                  Nenhuma alteração registrada no histórico de auditoria.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {auditLogs.map((log) => (
                    <div key={log.id} style={{ padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#75847f', fontSize: '11px', marginBottom: '4px' }}>
                        <span><strong>{log.user_name || 'Usuário'}</strong> - {log.action}</span>
                        <span>{formatDateTimePTBR(log.created_at)}</span>
                      </div>
                      <div style={{ color: 'var(--ink)', fontFamily: 'monospace', fontSize: '11px' }}>
                        {JSON.stringify(log.payload)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
