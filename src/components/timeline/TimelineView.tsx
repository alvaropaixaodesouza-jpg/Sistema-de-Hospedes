import { useDataRefresh } from '../../lib/useDataRefresh';
import React, { useState, useEffect } from 'react';
import { Room, Stay, Guest } from '../../types';
import { dataService } from '../../lib/storageStore';
import { getOperationalDateString, formatDatePTBR } from '../../lib/formatters';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  BedDouble, 
  User, 
  Plus, 
  RefreshCw 
} from 'lucide-react';

interface TimelineViewProps {
  onSelectGuestId?: (guestId: string) => void;
  onOpenNewStayWithRoomAndDates?: (roomId: string, checkInDate: string, checkOutDate: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  onSelectGuestId,
  onOpenNewStayWithRoomAndDates
}) => {
  const [startDateStr, setStartDateStr] = useState<string>(getOperationalDateString());
  const [numDays, setNumDays] = useState<number>(10);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stays, setStays] = useState<Stay[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useDataRefresh(() => loadTimelineData());

  useEffect(() => {
    loadTimelineData();
  }, [startDateStr, numDays]);

  const loadTimelineData = async () => {
    setIsLoading(true);
    try {
      const [fetchedRooms, fetchedStays] = await Promise.all([
        dataService.fetchRooms(),
        dataService.fetchStays({})
      ]);
      setRooms(fetchedRooms);
      setStays(fetchedStays);
    } catch (err) {
      console.error('Error loading timeline data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate date columns array
  const dateColumns: { dateStr: string; displayDay: string; displayMonth: string; isToday: boolean; isWeekend: boolean }[] = [];
  const start = new Date(`${startDateStr}T12:00:00-03:00`);
  const todayStr = getOperationalDateString();

  for (let i = 0; i < numDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dStr = getOperationalDateString(d);
    const dayNum = d.getDate();
    const dayOfWeek = d.toLocaleDateString('pt-BR', { weekday: 'short' });
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

    dateColumns.push({
      dateStr: dStr,
      displayDay: `${dayOfWeek} ${dayNum}`,
      displayMonth: d.toLocaleDateString('pt-BR', { month: 'short' }),
      isToday: dStr === todayStr,
      isWeekend
    });
  }

  const handlePrevDays = () => {
    const d = new Date(`${startDateStr}T12:00:00-03:00`);
    d.setDate(d.getDate() - numDays);
    setStartDateStr(getOperationalDateString(d));
  };

  const handleNextDays = () => {
    const d = new Date(`${startDateStr}T12:00:00-03:00`);
    d.setDate(d.getDate() + numDays);
    setStartDateStr(getOperationalDateString(d));
  };

  const handleToday = () => {
    setStartDateStr(getOperationalDateString());
  };

  return (
    <div className="timeline-view-container">
      {/* Section Toolbar */}
      <div className="section-toolbar">
        <div className="toolbar-title-group">
          <h2>Linha do Tempo & Mapa Visual de Ocupação</h2>
          <p>Visualização de matriz com quartos nas linhas e datas nas colunas</p>
        </div>

        {/* Date Navigation & Controls */}
        <div className="toolbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={handlePrevDays}>
            <ChevronLeft size={16} /> Período Anterior
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleToday}>
            Hoje
          </button>
          <input
            type="date"
            className="form-control"
            style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}
            value={startDateStr}
            onChange={(e) => setStartDateStr(e.target.value)}
          />
          <button className="btn btn-secondary btn-sm" onClick={handleNextDays}>
            Próximo Período <ChevronRight size={16} />
          </button>
          <select
            className="form-control"
            style={{ width: 'auto', padding: '6px 10px', fontSize: '12px' }}
            value={numDays}
            onChange={(e) => setNumDays(Number(e.target.value))}
          >
            <option value={7}>7 Dias</option>
            <option value={10}>10 Dias</option>
            <option value={14}>14 Dias</option>
          </select>
        </div>
      </div>

      {/* Timeline Matrix Card */}
      <div className="pms-card timeline-matrix-card">
        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={28} className="spin" style={{ marginBottom: '12px' }} />
            <p>Carregando mapa de ocupação...</p>
          </div>
        ) : (
          <div className="timeline-scroll-wrapper">
            <table className="timeline-matrix-table">
              <thead>
                <tr>
                  <th className="room-col-header">
                    <span>Acomodação</span>
                  </th>
                  {dateColumns.map(col => (
                    <th key={col.dateStr} className={`date-col-header ${col.isToday ? 'today' : ''} ${col.isWeekend ? 'weekend' : ''}`}>
                      <div className="date-day-name">{col.displayDay}</div>
                      <div className="date-month-name">{col.displayMonth}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rooms.map(room => {
                  const roomStays = stays.filter(s => s.room_id === room.id && s.status !== 'cancelada');

                  return (
                    <tr key={room.id}>
                      {/* Room Column */}
                      <td className="room-cell">
                        <strong className="room-cell-name">{room.number_name}</strong>
                        <span className="room-cell-sub">{room.room_type_name || 'Standard'}</span>
                        <span className={`room-status-badge ${room.status}`}>{room.status}</span>
                      </td>

                      {/* Date Cells */}
                      {dateColumns.map(col => {
                        // Check if a stay overlaps this date column
                        const activeStay = roomStays.find(s => {
                          const checkIn = getOperationalDateString(s.check_in_expected);
                          const checkOut = getOperationalDateString(s.check_out_expected);
                          return col.dateStr >= checkIn && col.dateStr < checkOut;
                        });

                        const isCheckInDay = activeStay && activeStay.check_in_expected.startsWith(col.dateStr);

                        return (
                          <td 
                            key={col.dateStr} 
                            className={`timeline-slot-cell ${col.isToday ? 'today' : ''} ${col.isWeekend ? 'weekend' : ''}`}
                            onClick={() => {
                              if (!activeStay && onOpenNewStayWithRoomAndDates) {
                                // Default 2 nights stay from clicked date
                                const nextDay = new Date(`${col.dateStr}T12:00:00-03:00`);
                                nextDay.setDate(nextDay.getDate() + 2);
                                onOpenNewStayWithRoomAndDates(room.id, col.dateStr, getOperationalDateString(nextDay));
                              }
                            }}
                          >
                            {activeStay && isCheckInDay && (
                              <div 
                                className={`timeline-block-card ${activeStay.status}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (activeStay.guest_id && onSelectGuestId) {
                                    onSelectGuestId(activeStay.guest_id);
                                  }
                                }}
                                title={`Hóspede: ${activeStay.guest?.full_name} · Status: ${activeStay.status}`}
                              >
                                <strong className="stay-guest-name">{activeStay.guest?.full_name || 'Hóspede'}</strong>
                                <span className="stay-status-tag">{activeStay.status}</span>
                              </div>
                            )}
                            {activeStay && !isCheckInDay && (
                              <div 
                                className={`timeline-block-card continuation ${activeStay.status}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (activeStay.guest_id && onSelectGuestId) {
                                    onSelectGuestId(activeStay.guest_id);
                                  }
                                }}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
