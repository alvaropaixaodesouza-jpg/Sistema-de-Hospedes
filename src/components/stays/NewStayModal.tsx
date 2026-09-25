import { usePousadaConfig } from '../../lib/usePousadaConfig';
import React, { useState, useEffect } from 'react';
import { Guest, Room, StayStatus } from '../../types';
import { dataService } from '../../lib/storageStore';
import { getOperationalDateString, getOperationalTimeString, formatCurrency, maskCPF, maskPhone } from '../../lib/formatters';
import { X, Calendar, BedDouble, Users, DollarSign, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

interface NewStayModalProps {
  isOpen: boolean;
  onClose: () => void;
  guest: Guest | null;
  defaults?: { status: 'hospedado' | 'reservada'; roomId?: string; checkInDate?: string; checkOutDate?: string };
  onSave: (stayData: any) => Promise<void>;
}

export const NewStayModal: React.FC<NewStayModalProps> = ({
  isOpen,
  onClose,
  guest: initialGuest,
  defaults,
  onSave
}) => {
  const config = usePousadaConfig();
  const [guest, setGuest] = useState<Guest | null>(initialGuest);
  const [guestQuery, setGuestQuery] = useState('');
  const [guestOptions, setGuestOptions] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [checkInDate, setCheckInDate] = useState(getOperationalDateString());
  const [checkInTime, setCheckInTime] = useState(getOperationalTimeString());
  const [checkOutDate, setCheckOutDate] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('12:00');
  const [partySize, setPartySize] = useState<number>(1);
  const [agreedAmount, setAgreedAmount] = useState<string>('150');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<StayStatus>('hospedado');

  const [companionsText, setCompanionsText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setGuest(initialGuest);
      setGuestQuery('');
      setStatus(defaults?.status || 'hospedado');
      setPartySize(1);
      setAgreedAmount('150');
      setCompanionsText('');
      loadRooms();
      // Set default check out date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setCheckOutDate(defaults?.checkOutDate || getOperationalDateString(tomorrow));
      setCheckInDate(defaults?.checkInDate || getOperationalDateString());
      setCheckInTime(defaults?.status === 'reservada' ? (config?.default_checkin_time?.slice(0,5) || '14:00') : getOperationalTimeString());
      setCheckOutTime(config?.default_checkout_time?.slice(0,5) || '12:00');
      setNotes('');
      setSubmitError('');
    }
  }, [isOpen, initialGuest, defaults]);

  useEffect(() => {
    if (!isOpen || initialGuest) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      dataService.fetchGuests({ searchQuery: guestQuery, pageSize: 20 }).then(result => {
        if (!cancelled) setGuestOptions(result.data);
      }).catch(error => { if (!cancelled) setSubmitError(error.message); });
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [isOpen, initialGuest, guestQuery]);

  const loadRooms = async () => {
    try {
      const roomList = await dataService.fetchRooms();
      setRooms(roomList);
      if (roomList.length > 0) {
        setSelectedRoomId(defaults?.roomId || '');
      }
    } catch (err) {
      setSubmitError(`Falha ao carregar quartos: ${(err as Error).message}`);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!guest) { setSubmitError('Selecione o hóspede responsável.'); return; }

    if (!selectedRoomId) {
      setSubmitError('Selecione um quarto / acomodação para a estadia.');
      return;
    }

    if (!checkInDate || !checkOutDate) {
      setSubmitError('Preencha as datas de entrada e saída.');
      return;
    }

    const checkInIso = `${checkInDate}T${checkInTime}:00-03:00`;
    const checkOutIso = `${checkOutDate}T${checkOutTime}:00-03:00`;

    if (new Date(checkOutIso) <= new Date(checkInIso)) {
      setSubmitError('A data/horário de saída deve ser posterior ao check-in.');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSave({
        guest_id: guest.id,
        room_id: selectedRoomId,
        check_in_expected: checkInIso,
        check_out_expected: checkOutIso,
        party_size: Number(partySize) || 1,
        agreed_amount: parseFloat(agreedAmount.replace(',', '.')) || 0,
        notes: notes.trim() || undefined,
        companions: companionsText.split(/[,;\n]/).map(name => name.trim()).filter(Boolean).map(full_name => ({ full_name })),
        status: status
      });
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || 'Erro ao registrar nova hospedagem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ width: 'min(680px, 100%)' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} color="var(--accent)" />
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{defaults?.status === 'reservada' ? 'Nova Reserva' : 'Nova Hospedagem / Check-in'}</h3>
          </div>
          <button onClick={onClose} style={{ padding: '4px' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="modal-body">
            {submitError && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                {submitError}
              </div>
            )}

            {!initialGuest && <div className="form-group" style={{ marginBottom: 16 }}>
              <label htmlFor="stay-guest-search">Buscar hóspede por nome, CPF ou telefone</label>
              <input id="stay-guest-search" className="form-control" value={guestQuery} onChange={e => setGuestQuery(e.target.value)} placeholder="Digite para localizar o cadastro" />
              <label htmlFor="stay-guest">Hóspede responsável *</label>
              <select id="stay-guest" className="form-control" required value={guest?.id || ''} onChange={e => setGuest(guestOptions.find(g => g.id === e.target.value) || null)}>
                <option value="">Selecione o hóspede</option>
                {guest && !guestOptions.some(g => g.id === guest.id) && <option value={guest.id}>{guest.full_name}</option>}
                {guestOptions.map(g => <option key={g.id} value={g.id}>{g.full_name} · {g.internal_code}</option>)}
              </select>
              <small>Se não encontrar a pessoa, cadastre-a em Hóspedes antes de continuar.</small>
            </div>}
            {/* Guest Verification Box */}
            {guest && <div style={{ background: '#f5f3ec', padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--line)', marginBottom: '18px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Hóspede Responsável (Dados Reutilizados)
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <div>
                  <strong style={{ fontSize: '15px', display: 'block', color: 'var(--ink)' }}>{guest.full_name}</strong>
                  <span style={{ fontSize: '12px', color: '#6b7773' }}>
                    {guest.internal_code} · {maskCPF(guest.cpf)} · {maskPhone(guest.phone)}
                  </span>
                </div>
                <span className="badge-tag" style={{ background: '#e1effe', color: '#1e429f' }}>
                  {guest.total_stays_count || 0} visitas anteriores
                </span>
              </div>
            </div>

            }
            {/* Stay Form Grid */}
            <div className="form-grid-2">
              <div className="form-group">
                <label>Situação da Hospedagem *</label>
                <select 
                  className="form-control"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StayStatus)}
                >
                  <option value="hospedado">Hospedado (Check-in Realizado)</option>
                  <option value="reservada">Reservada (Chegada Futura)</option>
                  <option value="finalizada">Finalizada (Check-out Realizado)</option>
                  <option value="cancelada">Cancelada</option>
                  <option value="nao_compareceu">Não Compareceu</option>
                </select>
              </div>

              <div className="form-group">
                <label>Quarto / Acomodação *</label>
                <select
                  className="form-control"
                  required
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                >
                  <option value="">Selecione o quarto</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id} disabled={!room.active || room.status === 'manutencao' || room.status === 'bloqueado' || (status === 'hospedado' && room.status === 'limpeza')}>
                      {room.number_name} ({room.room_type_name || 'Standard'} - Cap: {room.capacity} p.) - {room.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Data Entrada / Check-in *</label>
                <input
                  className="form-control"
                  type="date"
                  required
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Horário Entrada *</label>
                <input
                  className="form-control"
                  type="time"
                  required
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Data Saída Prevista *</label>
                <input
                  className="form-control"
                  type="date"
                  required
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Horário Saída Previsto *</label>
                <input
                  className="form-control"
                  type="time"
                  required
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Nº de Pessoas no Quarto</label>
                <input
                  className="form-control"
                  type="number"
                  min={1}
                  max={30}
                  value={partySize}
                  onChange={(e) => setPartySize(Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>Valor Combinado da Diária / Estadia (R$)</label>
                <input
                  className="form-control"
                  type="text"
                  placeholder="150,00"
                  value={agreedAmount}
                  onChange={(e) => setAgreedAmount(e.target.value)}
                />
              </div>

              <div className="form-group full">
                <label>Acompanhantes (nomes separados por vírgulas)</label>
                <input
                  className="form-control"
                  type="text"
                  placeholder="Ex.: Maria Souza (Esposa), Lucas Oliveira (Filho)"
                  value={companionsText}
                  onChange={(e) => setCompanionsText(e.target.value)}
                />
              </div>

              <div className="form-group full">
                <label>Observações Específicas desta Estadia</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Informações sobre pagamento, café da manhã especial, horário estendido, etc."
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
              {isSubmitting ? 'Confirmando...' : status === 'reservada' ? 'Confirmar Reserva' : 'Confirmar Hospedagem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
