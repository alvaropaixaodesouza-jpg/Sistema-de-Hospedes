import { useDataRefresh } from '../../lib/useDataRefresh';
import React, { useState, useEffect } from 'react';
import { Stay } from '../../types';
import { dataService } from '../../lib/storageStore';
import { getOperationalDateString, formatDatePTBR, formatDateTimePTBR, formatCurrency, formatLongDatePTBR, maskPhone } from '../../lib/formatters';
import { TimelineView } from '../timeline/TimelineView';
import { Calendar, ChevronLeft, ChevronRight, UserCheck, LogOut as LogOutIcon, Clock, BedDouble, RefreshCw } from 'lucide-react';

interface DailyStaysViewProps {
  initialSubTab?: 'chegadas' | 'hospedados' | 'saidas' | 'historico' | 'timeline';
  onSelectGuestId?: (guestId: string) => void;
  onOpenNewStayWithRoomAndDates?: (roomId: string, checkInDate: string, checkOutDate: string) => void;
}

export const DailyStaysView: React.FC<DailyStaysViewProps> = ({
  initialSubTab = 'chegadas',
  onSelectGuestId,
  onOpenNewStayWithRoomAndDates
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getOperationalDateString());
  const [activeTab, setActiveTab] = useState<'chegadas' | 'hospedados' | 'saidas' | 'historico' | 'timeline'>(initialSubTab);
  const [stays, setStays] = useState<Stay[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useDataRefresh(() => loadStays());

  useEffect(() => {
    setActiveTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    loadStays();
  }, [selectedDate, activeTab]);

  const loadStays = async () => {
    setIsLoading(true);
    try {
      const allStays = await dataService.fetchStays({});
      setStays(allStays);
    } catch (err) {
      console.error('Error loading daily stays:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevDay = () => {
    const current = new Date(`${selectedDate}T12:00:00-03:00`);
    current.setDate(current.getDate() - 1);
    setSelectedDate(getOperationalDateString(current));
  };

  const handleNextDay = () => {
    const current = new Date(`${selectedDate}T12:00:00-03:00`);
    current.setDate(current.getDate() + 1);
    setSelectedDate(getOperationalDateString(current));
  };

  const handleToday = () => {
    setSelectedDate(getOperationalDateString());
  };

  // Filter logic according to user prompt rules:
  // 1. Chegadas do Dia: Check-in date matches selectedDate
  const arrivalsToday = stays.filter(s => s.check_in_expected.startsWith(selectedDate));

  // 2. Hospedados Agora: Currently hosted (status === 'hospedado' OR active stay covering selectedDate)
  const hostedNow = stays.filter(s => {
    if (s.status !== 'hospedado') return false;
    const checkInDay = getOperationalDateString(s.check_in_expected);
    const checkOutDay = getOperationalDateString(s.check_out_expected);
    return checkInDay <= selectedDate && checkOutDay >= selectedDate;
  });

  // 3. Saídas Previstas: Check-out date matches selectedDate
  const departuresToday = stays.filter(s => s.check_out_expected.startsWith(selectedDate) && s.status !== 'cancelada');

  // Display list based on active tab
  let displayList: Stay[] = [];
  if (activeTab === 'chegadas') displayList = arrivalsToday;
  else if (activeTab === 'hospedados') displayList = hostedNow;
  else if (activeTab === 'saidas') displayList = departuresToday;
  else displayList = stays; // Histórico

  return (
    <div className="daily-stays-container">
      {/* Section Toolbar */}
      <div className="section-toolbar">
        <div className="toolbar-title-group">
          <h2>Painel Operacional de Hospedagens</h2>
          <p>Operando no fuso de Salvador (America/Bahia) · {formatLongDatePTBR(selectedDate)}</p>
        </div>

        {/* Date Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handlePrevDay}>
            <ChevronLeft size={16} /> Dia Anterior
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleToday}>
            Hoje
          </button>
          <input
            className="form-control"
            type="date"
            style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <button className="btn btn-secondary btn-sm" onClick={handleNextDay}>
            Próximo Dia <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Operations Sub-Tabs */}
      <div className="drawer-tabs" style={{ marginBottom: '16px', background: 'var(--paper)', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}>
        <button 
          className={`tab-btn ${activeTab === 'chegadas' ? 'active' : ''}`}
          onClick={() => setActiveTab('chegadas')}
        >
          <Clock size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
          Chegadas do Dia ({arrivalsToday.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'hospedados' ? 'active' : ''}`}
          onClick={() => setActiveTab('hospedados')}
        >
          <UserCheck size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
          Hospedados Agora ({hostedNow.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'saidas' ? 'active' : ''}`}
          onClick={() => setActiveTab('saidas')}
        >
          <LogOutIcon size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
          Saídas Previstas ({departuresToday.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'historico' ? 'active' : ''}`}
          onClick={() => setActiveTab('historico')}
        >
          <Calendar size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
          Histórico Completo
        </button>
        <button 
          className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          <Calendar size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
          Linha do Tempo
        </button>
      </div>

      {activeTab === 'timeline' ? (
        <TimelineView 
          onSelectGuestId={onSelectGuestId}
          onOpenNewStayWithRoomAndDates={onOpenNewStayWithRoomAndDates}
        />
      ) : (
        /* Main List Table / Cards */
        <div className="data-table-card">
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#75847f' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: '13px', marginTop: '8px' }}>Carregando dados da recepção...</p>
          </div>
        ) : displayList.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#75847f' }}>
            <Calendar size={32} style={{ color: '#aebdb7', marginBottom: '8px' }} />
            <h4 style={{ fontSize: '15px', color: 'var(--ink)' }}>Nenhum registro para esta aba</h4>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>
              Não há {activeTab === 'chegadas' ? 'chegadas previstas' : activeTab === 'hospedados' ? 'hóspedes hospedados' : 'saídas previstas'} para {formatDatePTBR(selectedDate)}.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Hóspede Responsável</th>
                  <th>Acomodação</th>
                  <th>Horário Entrada</th>
                  <th>Saída Prevista</th>
                  <th>Hóspedes</th>
                  <th>Valor Combinado</th>
                  <th>Situação</th>
                  <th>Observações</th>
                </tr>
              </thead>
              <tbody>
                {displayList.map((stay) => (
                  <tr key={stay.id}>
                    <td>
                      <button 
                        style={{ textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                        onClick={() => onSelectGuestId && stay.guest_id && onSelectGuestId(stay.guest_id)}
                      >
                        <strong style={{ fontSize: '14px', color: 'var(--accent)', textDecoration: 'underline' }}>
                          {stay.guest?.full_name || 'Hóspede'}
                        </strong>
                        <small style={{ display: 'block', color: '#75847f', fontSize: '11px' }}>
                          {stay.guest?.internal_code} · {maskPhone(stay.guest?.phone || '')}
                        </small>
                      </button>
                    </td>
                    <td>
                      <span className="code-badge">{stay.room?.number_name || 'Suíte'}</span>
                    </td>
                    <td>{formatDateTimePTBR(stay.check_in_expected)}</td>
                    <td>{formatDateTimePTBR(stay.check_out_expected)}</td>
                    <td>{stay.party_size} pessoa(s)</td>
                    <td><strong>{formatCurrency(stay.agreed_amount)}</strong></td>
                    <td>
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px', textTransform: 'uppercase',
                        background: stay.status === 'hospedado' ? '#def7ec' : stay.status === 'finalizada' ? '#e1effe' : '#fde8e8',
                        color: stay.status === 'hospedado' ? '#03543f' : stay.status === 'finalizada' ? '#1e429f' : '#9b1c1c'
                      }}>
                        {stay.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#6b7773', maxWidth: '200px' }}>
                      {stay.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
    </div>
  );
};
