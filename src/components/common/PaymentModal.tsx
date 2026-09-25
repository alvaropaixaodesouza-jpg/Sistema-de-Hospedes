import React, { useState, useEffect } from 'react';
import { Stay, Payment } from '../../types';
import { dataService } from '../../lib/storageStore';
import { getOperationalDateString, getOperationalTimeString, formatCurrency } from '../../lib/formatters';
import { X, CreditCard, DollarSign, CheckCircle } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (paymentData: Partial<Payment>) => Promise<void>;
  preselectedStayId?: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  preselectedStayId
}) => {
  const [stays, setStays] = useState<Stay[]>([]);
  const [selectedStayId, setSelectedStayId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Pix');
  const [paidDate, setPaidDate] = useState<string>(getOperationalDateString());
  const [paidTime, setPaidTime] = useState<string>(getOperationalTimeString());
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadStays();
      setPaidDate(getOperationalDateString());
      setPaidTime(getOperationalTimeString());
      setNotes('');
      setErrorMessage('');
    }
  }, [isOpen]);

  const loadStays = async () => {
    try {
      const allStays = await dataService.fetchStays({});
      const activeOrFinished = allStays.filter(s => s.status === 'hospedado' || s.status === 'reservada' || s.status === 'finalizada');
      setStays(activeOrFinished);

      if (preselectedStayId && activeOrFinished.some(s => s.id === preselectedStayId)) {
        setSelectedStayId(preselectedStayId);
        const st = activeOrFinished.find(s => s.id === preselectedStayId);
        if (st) setAmount(String(st.agreed_amount || ''));
      } else if (activeOrFinished.length > 0) {
        setSelectedStayId(activeOrFinished[0].id);
        setAmount(String(activeOrFinished[0].agreed_amount || ''));
      }
    } catch (err) {
      console.error('Error loading stays for payment modal:', err);
    }
  };

  const handleStayChange = (stayId: string) => {
    setSelectedStayId(stayId);
    const st = stays.find(s => s.id === stayId);
    if (st) {
      setAmount(String(st.agreed_amount || ''));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedStayId) {
      setErrorMessage('Selecione a hospedagem referente ao pagamento.');
      return;
    }

    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Informe um valor de pagamento válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const paidAtIso = `${paidDate}T${paidTime}:00-03:00`;
      await onSave({
        stay_id: selectedStayId,
        amount: numAmount,
        payment_method: paymentMethod,
        paid_at: paidAtIso,
        notes: notes.trim()
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao registrar pagamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStay = stays.find(s => s.id === selectedStayId);

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ width: 'min(520px, 100%)' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Registrar Pagamento</h3>
          </div>
          <button onClick={onClose} style={{ padding: '4px' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMessage && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                {errorMessage}
              </div>
            )}

            {/* Select Stay */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label>Hospedagem / Hóspede Responsável *</label>
              <select
                className="form-control"
                required
                value={selectedStayId}
                onChange={(e) => handleStayChange(e.target.value)}
              >
                {stays.map(stay => (
                  <option key={stay.id} value={stay.id}>
                    {stay.guest?.full_name || 'Hóspede'} - {stay.room?.number_name || 'Quarto'} ({formatCurrency(stay.agreed_amount)}) - {stay.status}
                  </option>
                ))}
              </select>
            </div>

            {currentStay && (
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '13px' }}>
                <div><strong>Quarto:</strong> {currentStay.room?.number_name} ({currentStay.room?.room_type_name || 'Standard'})</div>
                <div><strong>Valor Combinado da Estadia:</strong> {formatCurrency(currentStay.agreed_amount)}</div>
              </div>
            )}

            <div className="form-grid-2">
              <div className="form-group">
                <label>Valor Pago (R$) *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="150,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Forma de Pagamento *</label>
                <select
                  className="form-control"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="Pix">Pix (Instantâneo)</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Transferência Bancária">Transferência Bancária</option>
                </select>
              </div>

              <div className="form-group">
                <label>Data do Recebimento *</label>
                <input
                  type="date"
                  className="form-control"
                  required
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Horário *</label>
                <input
                  type="time"
                  className="form-control"
                  required
                  value={paidTime}
                  onChange={(e) => setPaidTime(e.target.value)}
                />
              </div>

              <div className="form-group full">
                <label>Observações / Comprovante</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex.: Comprovante Pix id 9821389, pago em 2 parcelas"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Registrando...' : 'Confirmar Pagamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
