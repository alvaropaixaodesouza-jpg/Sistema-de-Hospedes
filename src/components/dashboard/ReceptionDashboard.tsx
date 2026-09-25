import { useDataRefresh } from '../../lib/useDataRefresh';
import React, { useState, useEffect } from 'react';
import { ActiveSection, Guest, Room, Stay } from '../../types';
import { dataService } from '../../lib/storageStore';
import { 
  getOperationalDateString, 
  formatDatePTBR, 
  formatDateTimePTBR, 
  formatCurrency, 
  maskPhone 
} from '../../lib/formatters';
import { 
  UserCheck, 
  Clock, 
  LogOut as LogOutIcon, 
  BedDouble, 
  Sparkles, 
  Wrench, 
  Plus, 
  UserPlus, 
  CalendarPlus, 
  CreditCard, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Lock,
  ChevronRight
} from 'lucide-react';

interface ReceptionDashboardProps {
  setActiveSection: (section: ActiveSection) => void;
  onOpenNewGuest: () => void;
  onOpenNewStay: () => void;
  onOpenNewReservation: () => void;
  onOpenQuickCheckIn: () => void;
  onOpenQuickCheckOut: () => void;
  onOpenPaymentModal: () => void;
  onSelectGuest: (guest: Guest) => void;
}

export const ReceptionDashboard: React.FC<ReceptionDashboardProps> = ({
  setActiveSection,
  onOpenNewGuest,
  onOpenNewStay,
  onOpenNewReservation,
  onOpenQuickCheckIn,
  onOpenQuickCheckOut,
  onOpenPaymentModal,
  onSelectGuest
}) => {
  const [error, setError] = useState('');
  const [todayStr, setTodayStr] = useState<string>(getOperationalDateString());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Dashboard Metrics
  const [hostedNowCount, setHostedNowCount] = useState<number>(0);
  const [arrivalsTodayCount, setArrivalsTodayCount] = useState<number>(0);
  const [departuresTodayCount, setDeparturesTodayCount] = useState<number>(0);
  const [availableRoomsCount, setAvailableRoomsCount] = useState<number>(0);
  const [cleaningMaintRoomsCount, setCleaningMaintRoomsCount] = useState<number>(0);

  // Lists for feed & rooms visual
  const [todayArrivals, setTodayArrivals] = useState<Stay[]>([]);
  const [todayDepartures, setTodayDepartures] = useState<Stay[]>([]);
  const [activeStays, setActiveStays] = useState<Stay[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  useDataRefresh(() => loadDashboardData());

  useEffect(() => {
    loadDashboardData();
  }, [todayStr]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const allStays = await dataService.fetchStays({});
      const allRooms = await dataService.fetchRooms();

      // 1. Hospedados Agora: Stays with status 'hospedado' covering today
      const hosted = allStays.filter(s => {
        if (s.status !== 'hospedado') return false;
        return true;
      });

      // 2. Chegadas Hoje
      const arrivals = allStays.filter(s => s.check_in_expected.startsWith(todayStr) && ['reservada', 'hospedado'].includes(s.status));

      // 3. Saídas Hoje
      const departures = allStays.filter(s => s.check_out_expected.startsWith(todayStr) && s.status !== 'cancelada');

      // 4. Quartos Disponíveis & Limpeza/Manutenção
      const avail = allRooms.filter(r => r.active && r.status === 'disponivel' && !allStays.some(s => s.room_id === r.id && (s.status === 'hospedado' || (s.status === 'reservada' && s.check_in_expected.startsWith(todayStr)))));
      const cleanMaint = allRooms.filter(r => r.status === 'limpeza' || r.status === 'manutencao');

      setHostedNowCount(hosted.length);
      setArrivalsTodayCount(arrivals.length);
      setDeparturesTodayCount(departures.length);
      setAvailableRoomsCount(avail.length);
      setCleaningMaintRoomsCount(cleanMaint.length);

      setTodayArrivals(arrivals);
      setTodayDepartures(departures);
      setActiveStays(hosted);
      setRooms(allRooms);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os dados.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoomOccupantName = (roomId: string): string | null => {
    const foundStay = activeStays.find(s => s.room_id === roomId);
    return foundStay?.guest?.full_name || null;
  };

  return (
    <div className="reception-dashboard">
      {/* Top Welcome Header */}
      <div className="dashboard-welcome-header">
        <div>
          <h2>Painel da Recepção</h2>
          <p>Visão geral em tempo real das operações e movimento do dia · {formatDatePTBR(todayStr)}</p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={loadDashboardData} disabled={isLoading}>
          <RefreshCw size={14} className={isLoading ? 'spin' : ''} /> Atualizar Painel
        </button>
      </div>

      {error && <p role="alert" style={{ color: 'var(--danger)', padding: 16 }}>Dados indisponíveis: {error}. Os números abaixo podem estar desatualizados.</p>}
      {/* 5 Clickable KPI Metric Indicators */}
      <div className="kpi-metrics-grid">
        {/* KPI 1: Hospedados Agora */}
        <div 
          className="kpi-card blue clickable"
          onClick={() => setActiveSection('hospedagens_hospedados')}
          title="Clique para ver lista de hóspedes hospedados agora"
        >
          <div className="kpi-icon-wrapper">
            <UserCheck size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Hospedados Agora</span>
            <strong className="kpi-value">{hostedNowCount}</strong>
            <span className="kpi-sublink">Ver lista <ChevronRight size={12} /></span>
          </div>
        </div>

        {/* KPI 2: Chegadas Hoje */}
        <div 
          className="kpi-card green clickable"
          onClick={() => setActiveSection('hospedagens_chegadas')}
          title="Clique para ver chegadas do dia"
        >
          <div className="kpi-icon-wrapper">
            <Clock size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Chegadas Hoje</span>
            <strong className="kpi-value">{arrivalsTodayCount}</strong>
            <span className="kpi-sublink">Ver chegadas <ChevronRight size={12} /></span>
          </div>
        </div>

        {/* KPI 3: Saídas Hoje */}
        <div 
          className="kpi-card purple clickable"
          onClick={() => setActiveSection('hospedagens_saidas')}
          title="Clique para ver saídas do dia"
        >
          <div className="kpi-icon-wrapper">
            <LogOutIcon size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Saídas Hoje</span>
            <strong className="kpi-value">{departuresTodayCount}</strong>
            <span className="kpi-sublink">Ver saídas <ChevronRight size={12} /></span>
          </div>
        </div>

        {/* KPI 4: Quartos Disponíveis */}
        <div 
          className="kpi-card emerald clickable"
          onClick={() => setActiveSection('quartos')}
          title="Clique para ver quartos disponíveis"
        >
          <div className="kpi-icon-wrapper">
            <BedDouble size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Quartos Disponíveis</span>
            <strong className="kpi-value">{availableRoomsCount}</strong>
            <span className="kpi-sublink">Ver acomodações <ChevronRight size={12} /></span>
          </div>
        </div>

        {/* KPI 5: Quartos em Limpeza / Manutenção */}
        <div 
          className="kpi-card amber clickable"
          onClick={() => setActiveSection('quartos')}
          title="Clique para ver quartos em limpeza ou manutenção"
        >
          <div className="kpi-icon-wrapper">
            <Sparkles size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Limpeza / Manutenção</span>
            <strong className="kpi-value">{cleaningMaintRoomsCount}</strong>
            <span className="kpi-sublink">Ver detalhes <ChevronRight size={12} /></span>
          </div>
        </div>
      </div>

      {/* Quick Actions Toolbar */}
      <div className="quick-actions-card">
        <h3 className="quick-actions-title">Ações Rápidas da Recepção</h3>
        <div className="quick-actions-grid">
          <button className="btn-action-tile primary" onClick={onOpenNewGuest}>
            <UserPlus size={18} />
            <span>Novo Hóspede</span>
          </button>

          <button className="btn-action-tile secondary" onClick={onOpenNewStay}>
            <CalendarPlus size={18} />
            <span>Nova Hospedagem</span>
          </button>

          <button className="btn-action-tile outline-purple" onClick={onOpenNewReservation}>
            <Clock size={18} />
            <span>Nova Reserva</span>
          </button>

          <button className="btn-action-tile outline-green" onClick={onOpenQuickCheckIn}>
            <UserCheck size={18} />
            <span>Check-in</span>
          </button>

          <button className="btn-action-tile outline-amber" onClick={onOpenQuickCheckOut}>
            <LogOutIcon size={18} />
            <span>Check-out</span>
          </button>

          <button className="btn-action-tile outline-blue" onClick={onOpenPaymentModal}>
            <CreditCard size={18} />
            <span>Registrar Pagamento</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Movimentação do Dia & Situação dos Quartos */}
      <div className="dashboard-grid-2col">
        {/* Movimentação do Dia Column */}
        <div className="pms-card">
          <div className="card-header-flex">
            <h3>Movimentação do Dia</h3>
            <button className="btn-link" onClick={() => setActiveSection('hospedagens_chegadas')}>
              Ver Tudo →
            </button>
          </div>

          {isLoading ? (
            <div className="dashboard-loading">Carregando movimentação...</div>
          ) : (
            <div className="movement-feed-list">
              {/* Chegadas Previstas */}
              <div className="movement-section">
                <h4 className="feed-sub-title green">
                  <Clock size={14} /> Chegadas Previstas ({todayArrivals.length})
                </h4>
                {todayArrivals.length === 0 ? (
                  <p className="feed-empty-text">Nenhuma chegada prevista para hoje.</p>
                ) : (
                  todayArrivals.map(stay => (
                    <div key={stay.id} className="feed-item-card">
                      <div className="feed-item-main">
                        <strong 
                          className="feed-guest-name clickable"
                          onClick={() => stay.guest && onSelectGuest(stay.guest)}
                        >
                          {stay.guest?.full_name || 'Hóspede'}
                        </strong>
                        <span className="room-pill">{stay.room?.number_name || 'Quarto'}</span>
                      </div>
                      <div className="feed-item-meta">
                        <span>Horário: {stay.check_in_expected.split('T')[1]?.substring(0, 5) || '14:00'}</span>
                        <span>{stay.party_size} pessoa(s)</span>
                        <strong>{formatCurrency(stay.agreed_amount)}</strong>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Saídas Previstas */}
              <div className="movement-section" style={{ marginTop: '16px' }}>
                <h4 className="feed-sub-title purple">
                  <LogOutIcon size={14} /> Saídas Previstas ({todayDepartures.length})
                </h4>
                {todayDepartures.length === 0 ? (
                  <p className="feed-empty-text">Nenhuma saída prevista para hoje.</p>
                ) : (
                  todayDepartures.map(stay => (
                    <div key={stay.id} className="feed-item-card">
                      <div className="feed-item-main">
                        <strong 
                          className="feed-guest-name clickable"
                          onClick={() => stay.guest && onSelectGuest(stay.guest)}
                        >
                          {stay.guest?.full_name || 'Hóspede'}
                        </strong>
                        <span className="room-pill">{stay.room?.number_name || 'Quarto'}</span>
                      </div>
                      <div className="feed-item-meta">
                        <span>Saída até: {stay.check_out_expected.split('T')[1]?.substring(0, 5) || '12:00'}</span>
                        <span className={`status-badge-sm ${stay.status}`}>{stay.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Situação Rápida dos Quartos Column */}
        <div className="pms-card">
          <div className="card-header-flex">
            <h3>Situação dos Quartos</h3>
            <button className="btn-link" onClick={() => setActiveSection('quartos')}>
              Gerenciar Quartos →
            </button>
          </div>

          <div className="quick-room-overview-grid">
            {rooms.map(room => {
              const occupant = getRoomOccupantName(room.id);
              let statusLabel = 'Disponível';
              let statusClass = 'disponivel';

              if (occupant) {
                statusLabel = 'Ocupado';
                statusClass = 'ocupado';
              } else if (room.status === 'limpeza') {
                statusLabel = 'Limpeza';
                statusClass = 'limpeza';
              } else if (room.status === 'manutencao') {
                statusLabel = 'Manutenção';
                statusClass = 'manutencao';
              } else if (room.status === 'bloqueado') {
                statusLabel = 'Bloqueado';
                statusClass = 'bloqueado';
              }

              return (
                <div key={room.id} className={`quick-room-card ${statusClass}`}>
                  <div className="room-card-header">
                    <span className="room-number">{room.number_name}</span>
                    <span className={`status-dot-pill ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>

                  <div className="room-card-body">
                    {occupant ? (
                      <div className="room-occupant-info">
                        <span className="occupant-label">Hóspede:</span>
                        <span className="occupant-name" title={occupant}>{occupant}</span>
                      </div>
                    ) : (
                      <div className="room-type-info">
                        <span>{room.room_type_name || 'Standard'}</span>
                        <small>Cap: {room.capacity} p.</small>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
