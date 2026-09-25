import { useDataRefresh } from '../../lib/useDataRefresh';
import React, { useState, useEffect } from 'react';
import { dataService } from '../../lib/storageStore';
import { formatCurrency } from '../../lib/formatters';
import { FileSpreadsheet, TrendingUp, Users, BedDouble, DollarSign } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [stats, setStats] = useState({
    totalGuests: 0,
    totalStays: 0,
    activeStays: 0,
    totalAgreedAmount: 0,
    occupancyRate: 0
  });

  useDataRefresh(() => calculateStats());

  useEffect(() => {
    calculateStats();
  }, []);

  const calculateStats = async () => {
    try {
      const { totalCount: totalG } = await dataService.fetchGuests({ pageSize: 1 });
      const stays = await dataService.fetchStays({});
      const rooms = await dataService.fetchRooms();

      const active = stays.filter(s => s.status === 'hospedado');
      const totalAmount = stays
        .filter(s => s.status === 'hospedado' || s.status === 'finalizada')
        .reduce((sum, s) => sum + (s.agreed_amount || 0), 0);

      const occRate = rooms.length > 0 ? Math.round((active.length / rooms.length) * 100) : 0;

      setStats({
        totalGuests: totalG,
        totalStays: stays.length,
        activeStays: active.length,
        totalAgreedAmount: totalAmount,
        occupancyRate: occRate
      });
    } catch (err) {
      console.error('Error calculating report stats:', err);
    }
  };

  return (
    <div className="reports-view-container">
      <div className="section-toolbar">
        <div className="toolbar-title-group">
          <h2>Relatórios & Resumo de Ocupação</h2>
          <p>Visão geral de desempenho de hospedagens, ocupação e valores contratados</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--paper)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#75847f', textTransform: 'uppercase' }}>Hóspedes Cadastrados</span>
          <strong style={{ display: 'block', fontSize: '28px', color: 'var(--ink)', fontFamily: '"Newsreader", serif', marginTop: '4px' }}>{stats.totalGuests}</strong>
        </div>

        <div style={{ background: 'var(--paper)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#75847f', textTransform: 'uppercase' }}>Total de Hospedagens</span>
          <strong style={{ display: 'block', fontSize: '28px', color: 'var(--accent)', fontFamily: '"Newsreader", serif', marginTop: '4px' }}>{stats.totalStays}</strong>
        </div>

        <div style={{ background: 'var(--paper)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#75847f', textTransform: 'uppercase' }}>Taxa de Ocupação Atual</span>
          <strong style={{ display: 'block', fontSize: '28px', color: 'var(--success)', fontFamily: '"Newsreader", serif', marginTop: '4px' }}>{stats.occupancyRate}%</strong>
        </div>

        <div style={{ background: 'var(--paper)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#75847f', textTransform: 'uppercase' }}>Valores Combinados (Fase 1)</span>
          <strong style={{ display: 'block', fontSize: '24px', color: 'var(--ink)', fontFamily: '"Newsreader", serif', marginTop: '4px' }}>
            {formatCurrency(stats.totalAgreedAmount)}
          </strong>
        </div>
      </div>
    </div>
  );
};
