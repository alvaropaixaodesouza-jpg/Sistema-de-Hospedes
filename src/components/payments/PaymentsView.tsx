import { useDataRefresh } from '../../lib/useDataRefresh';
import React, { useState, useEffect } from 'react';
import { Payment, Stay } from '../../types';
import { dataService } from '../../lib/storageStore';
import { formatCurrency, formatDateTimePTBR } from '../../lib/formatters';
import { 
  CreditCard, 
  Plus, 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  RefreshCw,
  Search
} from 'lucide-react';

interface PaymentsViewProps {
  onOpenPaymentModal: (stayId?: string) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ onOpenPaymentModal }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stays, setStays] = useState<Stay[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useDataRefresh(() => loadPaymentsData());

  useEffect(() => {
    loadPaymentsData();
  }, []);

  const loadPaymentsData = async () => {
    setIsLoading(true);
    try {
      const [fetchedPayments, fetchedStays] = await Promise.all([
        dataService.fetchPayments(),
        dataService.fetchStays({})
      ]);
      setPayments(fetchedPayments);
      setStays(fetchedStays);
    } catch (err) {
      console.error('Error loading payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Map stay and guest details to payments
  const enrichedPayments = payments.map(p => {
    const stay = stays.find(s => s.id === p.stay_id);
    return {
      ...p,
      guestName: stay?.guest?.full_name || 'Hóspede',
      guestCode: stay?.guest?.internal_code || '',
      roomName: stay?.room?.number_name || 'Quarto'
    };
  });

  const filteredPayments = enrichedPayments.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.guestName.toLowerCase().includes(q) ||
      p.roomName.toLowerCase().includes(q) ||
      p.payment_method.toLowerCase().includes(q) ||
      (p.notes && p.notes.toLowerCase().includes(q))
    );
  });

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const pixTotal = payments.filter(p => p.payment_method.toLowerCase().includes('pix')).reduce((sum, p) => sum + p.amount, 0);
  const cardTotal = payments.filter(p => p.payment_method.toLowerCase().includes('cartão')).reduce((sum, p) => sum + p.amount, 0);
  const cashTotal = payments.filter(p => p.payment_method.toLowerCase().includes('dinheiro')).reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="payments-view-container">
      {/* Section Toolbar */}
      <div className="section-toolbar">
        <div className="toolbar-title-group">
          <h2>Gestão de Pagamentos & Lançamentos</h2>
          <p>Acompanhamento de pagamentos recebidos, recibos e formas de pagamento</p>
        </div>

        <button className="btn btn-primary" onClick={() => onOpenPaymentModal()}>
          <Plus size={16} /> Registrar Pagamento
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-metrics-grid" style={{ marginBottom: '20px' }}>
        <div className="kpi-card green">
          <div className="kpi-icon-wrapper">
            <DollarSign size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Recebido</span>
            <strong className="kpi-value">{formatCurrency(totalPaid)}</strong>
          </div>
        </div>

        <div className="kpi-card blue">
          <div className="kpi-icon-wrapper">
            <CreditCard size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Pix (Instantâneo)</span>
            <strong className="kpi-value">{formatCurrency(pixTotal)}</strong>
          </div>
        </div>

        <div className="kpi-card purple">
          <div className="kpi-icon-wrapper">
            <CreditCard size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Cartões (Crédito/Débito)</span>
            <strong className="kpi-value">{formatCurrency(cardTotal)}</strong>
          </div>
        </div>

        <div className="kpi-card emerald">
          <div className="kpi-icon-wrapper">
            <DollarSign size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Dinheiro em Espécie</span>
            <strong className="kpi-value">{formatCurrency(cashTotal)}</strong>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="pms-card" style={{ padding: '14px 20px', marginBottom: '16px' }}>
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="topbar-search-input"
            placeholder="Filtrar lançamentos por hóspede, quarto, forma de pagamento ou observação..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="data-table-card">
        {isLoading ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="spin" style={{ marginBottom: '8px' }} />
            <p>Carregando pagamentos...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>
            <CreditCard size={32} style={{ marginBottom: '8px', color: '#94a3b8' }} />
            <h4>Nenhum pagamento encontrado</h4>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>Nenhum lançamento registrado com os filtros selecionados.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Data do Recebimento</th>
                  <th>Hóspede Responsável</th>
                  <th>Acomodação</th>
                  <th>Forma de Pagamento</th>
                  <th>Valor Pago</th>
                  <th>Observação / Comprovante</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map(pay => (
                  <tr key={pay.id}>
                    <td>{formatDateTimePTBR(pay.paid_at)}</td>
                    <td>
                      <strong style={{ fontSize: '14px', color: 'var(--slate-900)' }}>{pay.guestName}</strong>
                      {pay.guestCode && <span className="code-badge" style={{ marginLeft: '6px' }}>{pay.guestCode}</span>}
                    </td>
                    <td>
                      <span className="room-pill">{pay.roomName}</span>
                    </td>
                    <td>
                      <span className="payment-method-badge">{pay.payment_method}</span>
                    </td>
                    <td>
                      <strong style={{ fontSize: '14px', color: 'var(--emerald-600)' }}>{formatCurrency(pay.amount)}</strong>
                    </td>
                    <td style={{ fontSize: '12px', color: '#64748b', maxWidth: '240px' }}>
                      {pay.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
