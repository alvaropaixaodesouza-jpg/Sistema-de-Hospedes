import React, { useState, useEffect } from 'react';
import { Stay } from '../../types';
import { dataService } from '../../lib/storageStore';
import { formatCurrency, formatDateTimePTBR } from '../../lib/formatters';
import { X, UserCheck, LogOut, CheckCircle, AlertCircle } from 'lucide-react';

interface QuickCheckInOutModalProps {
  isOpen: boolean;
  mode: 'checkin' | 'checkout';
  onClose: () => void;
  onRefresh: () => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
}

export const QuickCheckInOutModal: React.FC<QuickCheckInOutModalProps> = ({
  isOpen,
  mode,
  onClose,
  onRefresh,
  onNotify
}) => {
  const [stays, setStays] = useState<Stay[]>([]);
  const [selectedStayId, setSelectedStayId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadStays();
    }
  }, [isOpen, mode]);

  const loadStays = async () => {
    try {
      const allStays = await dataService.fetchStays({});
      if (mode === 'checkin') {
        // Reservas que precisam de checkin
        const pendingCheckIn = allStays.filter(s => s.status === 'reservada');
        setStays(pendingCheckIn);
        if (pendingCheckIn.length > 0) setSelectedStayId(pendingCheckIn[0].id);
      } else {
        // Hospedados que vão fazer checkout
        const currentlyHosted = allStays.filter(s => s.status === 'hospedado');
        setStays(currentlyHosted);
        if (currentlyHosted.length > 0) setSelectedStayId(currentlyHosted[0].id);
      }
    } catch (err) {
      console.error('Error loading stays for quick modal:', err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStayId) return;

    setIsSubmitting(true);
    try {
      const targetStay = stays.find(s => s.id === selectedStayId);
      if (!targetStay) return;

      const nowIso = new Date().toISOString();
      if (mode === 'checkin') {
        await dataService.saveStay({
          ...targetStay,
          status: 'hospedado',
          check_in_actual: nowIso
        });
        onNotify(`Check-in realizado com sucesso para ${targetStay.guest?.full_name || 'Hóspede'}!`);
      } else {
        await dataService.saveStay({
          ...targetStay,
          status: 'finalizada',
          check_out_actual: nowIso
        });
        onNotify(`Check-out concluído para ${targetStay.guest?.full_name || 'Hóspede'}. Quarto enviado para limpeza!`);
      }

      onRefresh();
      onClose();
    } catch (err: any) {
      onNotify(`Erro na operação: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCheckIn = mode === 'checkin';

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ width: 'min(500px, 100%)' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isCheckIn ? <UserCheck size={20} color="var(--success)" /> : <LogOut size={20} color="#7c3aed" />}
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>
              {isCheckIn ? 'Realizar Check-in Rápido' : 'Realizar Check-out Rápido'}
            </h3>
          </div>
          <button onClick={onClose} style={{ padding: '4px' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {stays.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                <p>Nenhuma hospedagem disponível para {isCheckIn ? 'check-in (reservas pendentes)' : 'check-out (hóspedes atualmente hospedados)'}.</p>
              </div>
            ) : (
              <div className="form-group">
                <label>Selecione a Hospedagem *</label>
                <select
                  className="form-control"
                  required
                  value={selectedStayId}
                  onChange={(e) => setSelectedStayId(e.target.value)}
                >
                  {stays.map(stay => (
                    <option key={stay.id} value={stay.id}>
                      {stay.guest?.full_name || 'Hóspede'} - {stay.room?.number_name || 'Quarto'} ({formatCurrency(stay.agreed_amount)})
                    </option>
                  ))}
                </select>

                <small style={{ color: '#64748b', marginTop: '12px', display: 'block' }}>
                  {isCheckIn 
                    ? 'Confirmar entrada do hóspede na pousada e ativar a hospedagem.'
                    : 'Confirmar saída do hóspede, encerrar a estadia e alterar o status do quarto para Limpeza.'}
                </small>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            {stays.length > 0 && (
              <button type="submit" className={`btn ${isCheckIn ? 'btn-primary' : 'btn-primary'}`} disabled={isSubmitting}>
                {isSubmitting ? 'Processando...' : isCheckIn ? 'Confirmar Check-in' : 'Confirmar Check-out'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
