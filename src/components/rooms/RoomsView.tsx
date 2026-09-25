import { useDataRefresh } from '../../lib/useDataRefresh';
import React, { useState, useEffect } from 'react';
import { Room, RoomOperationalStatus, RoomType, Stay } from '../../types';
import { dataService } from '../../lib/storageStore';
import { BedDouble, Plus, ShieldAlert, Sparkles, Wrench, Lock, CheckCircle, RefreshCw } from 'lucide-react';

export const RoomsView: React.FC = () => {
  const [types, setTypes] = useState<RoomType[]>([]);
  const [stays, setStays] = useState<Stay[]>([]);
  const [error, setError] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form State
  const [numberName, setNumberName] = useState('');
  const [capacity, setCapacity] = useState(2);
  const [status, setStatus] = useState<RoomOperationalStatus>('disponivel');
  const [roomTypeName, setRoomTypeName] = useState('Suíte Standard');
  const [notes, setNotes] = useState('');

  useDataRefresh(() => loadRooms());

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    setIsLoading(true);
    try {
      const [list, stays] = await Promise.all([dataService.fetchRooms(), dataService.fetchStays({})]);
      setStays(stays);
      setError('');
      setRooms(list);
      setTypes(await dataService.fetchRoomTypes());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os quartos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (room?: Room) => {
    if (room) {
      setSelectedRoom(room);
      setNumberName(room.number_name);
      setCapacity(room.capacity);
      setStatus(room.status);
      setRoomTypeName(room.room_type_name || 'Standard');
      setNotes(room.notes || '');
    } else {
      setSelectedRoom(null);
      setNumberName('');
      setCapacity(2);
      setStatus('disponivel');
      setRoomTypeName('Suíte Standard');
      setNotes('');
    }
    setIsModalOpen(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dataService.saveRoom({
        id: selectedRoom?.id,
        number_name: numberName.trim(),
        capacity: Number(capacity) || 2,
        status: status,
        room_type_name: roomTypeName,
        room_type_id: types.find(t=>t.name === roomTypeName)?.id || null as any,
        notes: notes.trim()
      });
      setIsModalOpen(false);
      loadRooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o quarto.');
    }
  };

  const handleQuickStatusChange = async (room: Room, newStatus: RoomOperationalStatus) => {
    try {
      await dataService.saveRoom({
        ...room,
        status: newStatus
      });
      loadRooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível alterar o quarto.');
    }
  };

  return (
    <div className="rooms-view-container">
      {/* Section Toolbar */}
      <div className="section-toolbar">
        <div className="toolbar-title-group">
          <h2>Gestão de Quartos & Condição Operacional</h2>
          <p>Cadastre acomodações, capacidade e gerencie status de limpeza e manutenção</p>
        </div>

        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={16} /> Nova Acomodação
        </button>
      </div>

      {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
      {/* Grid of Rooms */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {rooms.map((room) => {
          const getStatusBadge = (st: RoomOperationalStatus) => {
            switch (st) {
              case 'disponivel':
                return { label: 'Disponível', bg: '#def7ec', color: '#03543f', icon: <CheckCircle size={14} /> };
              case 'limpeza':
                return { label: 'Em Limpeza', bg: '#fef3c7', color: '#b45309', icon: <Sparkles size={14} /> };
              case 'manutencao':
                return { label: 'Em Manutenção', bg: '#fee2e2', color: '#dc2626', icon: <Wrench size={14} /> };
              case 'bloqueado':
                return { label: 'Bloqueado', bg: '#e5e7eb', color: '#374151', icon: <Lock size={14} /> };
              default:
                return { label: st, bg: '#f0f3f1', color: '#102c26', icon: null };
            }
          };

          const occupied = stays.find(s => s.room_id === room.id && s.status === 'hospedado');
          const badge = occupied ? { label: 'Ocupado', bg: '#dbeafe', color: '#1d4ed8', icon: <BedDouble size={14} /> } : getStatusBadge(room.status);

          return (
            <div key={room.id} style={{ background: 'var(--paper)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)', padding: '20px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="code-badge" style={{ fontSize: '13px', padding: '4px 8px' }}>{room.number_name}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', background: badge.bg, color: badge.color, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {badge.icon} {badge.label}
                  </span>
                </div>

                <div style={{ margin: '14px 0', fontSize: '13px', color: 'var(--ink)' }}>
                  <strong style={{ display: 'block', fontSize: '15px' }}>{room.room_type_name || 'Standard'}</strong>
                  <span style={{ color: '#75847f', fontSize: '12px' }}>Capacidade: até {room.capacity} pessoas</span>
                  {occupied && <p>{occupied.guest?.full_name} · Saída prevista: {occupied.check_out_expected.slice(0, 10)}</p>}
                </div>

                {room.notes && (
                  <p style={{ fontSize: '12px', color: '#6b7773', background: '#faf8f3', padding: '8px', borderRadius: '6px' }}>
                    {room.notes}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--line)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => handleOpenModal(room)} style={{ flex: 1 }}>
                  Editar
                </button>
                {room.status !== 'disponivel' && (
                  <button className="btn btn-outline btn-sm" onClick={() => handleQuickStatusChange(room, 'disponivel')}>
                    Liberar
                  </button>
                )}
                {room.status !== 'limpeza' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => handleQuickStatusChange(room, 'limpeza')}>
                    Limpeza
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Room Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ width: 'min(500px, 100%)' }}>
            <div className="modal-header">
              <h3>{selectedRoom ? 'Editar Acomodação' : 'Nova Acomodação'}</h3>
              <button onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSaveRoom}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label>Identificação / Nome do Quarto *</label>
                  <input
                    className="form-control"
                    required
                    placeholder="Ex.: Suíte 04, Chalé Vista Mar"
                    value={numberName}
                    onChange={(e) => setNumberName(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label>Tipo de Acomodação</label><datalist id="room-types">{types.map(t=><option key={t.id} value={t.name} />)}</datalist>
                  <input
                    className="form-control"
                    list="room-types"
                    placeholder="Ex.: Suíte Luxo, Chalé, Standard"
                    value={roomTypeName}
                    onChange={(e) => setRoomTypeName(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label>Capacidade (Nº Máximo de Hóspedes)</label>
                  <input
                    className="form-control"
                    type="number"
                    min={1}
                    max={20}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label>Condição Operacional Atual</label>
                  <select
                    className="form-control"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as RoomOperationalStatus)}
                  >
                    <option value="disponivel">Disponível</option>
                    <option value="limpeza">Em Limpeza</option>
                    <option value="manutencao">Em Manutenção</option>
                    <option value="bloqueado">Bloqueado</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Observações Internas</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Detalhes sobre camas, vista ou manutenção"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Acomodação</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
