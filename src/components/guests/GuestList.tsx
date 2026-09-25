import { useDataRefresh } from '../../lib/useDataRefresh';
import React, { useState, useEffect, useCallback } from 'react';
import { Guest } from '../../types';
import { dataService } from '../../lib/storageStore';
import { maskPhone, formatDatePTBR } from '../../lib/formatters';
import { Search, Plus, Eye, Calendar, Filter, ArrowUpDown, RefreshCw, XCircle, MapPin, CheckCircle } from 'lucide-react';

interface GuestListProps {
  onSelectGuest: (guest: Guest) => void;
  onOpenNewGuest: () => void;
  onOpenNewStayForGuest: (guest: Guest) => void;
}

export const GuestList: React.FC<GuestListProps> = ({
  onSelectGuest,
  onOpenNewGuest,
  onOpenNewStayForGuest
}) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'todos' | 'hospedados' | 'sem_hospedagem'>('todos');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>('');
  const [neighborhoodFilter, setNeighborhoodFilter] = useState<string>('');
  const [showLocationFilters, setShowLocationFilters] = useState<boolean>(false);

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'last_stay' | 'stays_count'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Debounced search
  const loadGuests = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const result = await dataService.fetchGuests({
        page: currentPage,
        pageSize,
        searchQuery,
        filterMode,
        cityFilter,
        stateFilter,
        neighborhoodFilter,
        sortBy,
        sortOrder
      });
      setGuests(result.data);
      setTotalCount(result.totalCount);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || 'Erro ao carregar lista de hóspedes.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, filterMode, cityFilter, stateFilter, neighborhoodFilter, sortBy, sortOrder]);

  useDataRefresh(() => loadGuests());

  useEffect(() => {
    const timer = setTimeout(() => {
      loadGuests();
    }, 250); // 250ms debounce
    return () => clearTimeout(timer);
  }, [loadGuests]);

  const handleSort = (field: 'name' | 'code' | 'last_stay' | 'stays_count') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="guest-list-container">
      {/* Administrative Toolbar Header */}
      <div className="section-toolbar">
        <div className="toolbar-title-group">
          <h2>Cadastro & Lista de Hóspedes</h2>
          <p>Exibindo {totalCount} registro(s) cadastrado(s) na pousada</p>
        </div>

        <div className="toolbar-actions">
          <button className="btn btn-secondary" onClick={() => setShowLocationFilters(!showLocationFilters)}>
            <Filter size={15} /> Filtros de Localização
          </button>
          <button className="btn btn-primary" onClick={onOpenNewGuest}>
            <Plus size={16} /> Novo Hóspede
          </button>
        </div>
      </div>

      {/* Search Bar & Filter Controls */}
      <div style={{ background: 'var(--paper)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(16,44,38,0.1)', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Main Search Input */}
          <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#75847f' }} />
            <input
              className="form-control"
              style={{ paddingLeft: '38px' }}
              placeholder="Pesquisar por Nome, CPF, Telefone, Cidade ou Código..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#75847f' }}
              >
                ×
              </button>
            )}
          </div>

          {/* Quick Filter Status Pills */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className={`btn btn-sm ${filterMode === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setFilterMode('todos'); setCurrentPage(1); }}
            >
              Todos ({totalCount})
            </button>
            <button
              className={`btn btn-sm ${filterMode === 'hospedados' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setFilterMode('hospedados'); setCurrentPage(1); }}
            >
              Hospedados Agora
            </button>
            <button
              className={`btn btn-sm ${filterMode === 'sem_hospedagem' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setFilterMode('sem_hospedagem'); setCurrentPage(1); }}
            >
              Sem Hospedagem
            </button>
          </div>
        </div>

        {/* Collapsible Location Filters */}
        {showLocationFilters && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed var(--line)' }}>
            <div className="form-group">
              <label>Filtrar por Cidade</label>
              <input
                className="form-control"
                placeholder="Ex.: Salvador"
                value={cityFilter}
                onChange={(e) => { setCityFilter(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="form-group">
              <label>Filtrar por Estado (UF)</label>
              <input
                className="form-control"
                placeholder="Ex.: BA"
                value={stateFilter}
                onChange={(e) => { setStateFilter(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="form-group">
              <label>Filtrar por Bairro</label>
              <input
                className="form-control"
                placeholder="Ex.: Pituba"
                value={neighborhoodFilter}
                onChange={(e) => { setNeighborhoodFilter(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="data-table-card">
        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#75847f' }}>
            <RefreshCw size={28} className="spin" style={{ marginBottom: '12px', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: '14px' }}>Carregando hóspedes no banco de dados...</p>
          </div>
        ) : isError ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--danger)' }}>
            <XCircle size={32} style={{ marginBottom: '8px' }} />
            <h4>Ocorreu um erro ao carregar os dados</h4>
            <p style={{ fontSize: '13px', margin: '8px 0 16px' }}>{errorMessage}</p>
            <button className="btn btn-secondary" onClick={loadGuests}>Tentar Novamente</button>
          </div>
        ) : guests.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#75847f' }}>
            <Search size={36} style={{ marginBottom: '12px', color: '#aebdb7' }} />
            <h3 style={{ fontSize: '16px', color: 'var(--ink)' }}>Nenhum hóspede encontrado</h3>
            <p style={{ fontSize: '13px', marginTop: '6px' }}>
              {searchQuery ? 'Nenhum resultado corresponde à sua pesquisa.' : 'Ainda não há cadastros com os filtros selecionados.'}
            </p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: '16px' }} onClick={onOpenNewGuest}>
              + Cadastrar Novo Hóspede
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Administrative Table View */}
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => handleSort('name')}>
                      Nome do Hóspede <ArrowUpDown size={12} />
                    </th>
                    <th className="sortable" onClick={() => handleSort('code')}>
                      Código <ArrowUpDown size={12} />
                    </th>
                    <th>Celular / Telefone</th>
                    <th>Cidade / UF</th>
                    <th className="sortable" onClick={() => handleSort('last_stay')}>
                      Última Hospedagem <ArrowUpDown size={12} />
                    </th>
                    <th className="sortable" onClick={() => handleSort('stays_count')}>
                      Visitas <ArrowUpDown size={12} />
                    </th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {guests.map((guest) => (
                    <tr key={guest.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{guest.full_name}</strong>
                          {guest.is_currently_hosted && (
                            <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: 700, marginTop: '2px' }}>
                              ● Hospedado Agora
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="code-badge">{guest.internal_code}</span>
                      </td>
                      <td>{maskPhone(guest.phone)}</td>
                      <td>
                        {guest.city ? `${guest.city}${guest.state ? ` / ${guest.state}` : ''}` : '-'}
                      </td>
                      <td>
                        {guest.last_stay_date ? formatDatePTBR(guest.last_stay_date) : 'Sem registros'}
                      </td>
                      <td>
                        <span className="badge-tag" style={{ background: guest.total_stays_count ? '#e7f3eb' : '#f0eee8', color: guest.total_stays_count ? 'var(--success)' : '#75847f' }}>
                          {guest.total_stays_count || 0} {guest.total_stays_count === 1 ? 'visita' : 'visitas'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            onClick={() => onSelectGuest(guest)}
                            title="Ver ficha completa do hóspede"
                          >
                            <Eye size={14} /> Ficha
                          </button>
                          <button 
                            className="btn btn-primary btn-sm" 
                            onClick={() => onOpenNewStayForGuest(guest)}
                            title="Nova hospedagem para este hóspede"
                          >
                            <Calendar size={14} /> + Hospedagem
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout View (< 768px) */}
            <div className="mobile-cards-list" style={{ padding: '12px' }}>
              {guests.map((guest) => (
                <div key={guest.id} className="guest-card-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ fontSize: '15px', color: 'var(--ink)' }}>{guest.full_name}</strong>
                      <div style={{ marginTop: '2px' }}>
                        <span className="code-badge">{guest.internal_code}</span>
                      </div>
                    </div>
                    <span className="badge-tag" style={{ background: '#e7f3eb', color: 'var(--success)' }}>
                      {guest.total_stays_count || 0} visitas
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#6b7773', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span>📱 {maskPhone(guest.phone)}</span>
                    <span>📍 {guest.city || 'Cidade não informada'} {guest.state ? `/ ${guest.state}` : ''}</span>
                    <span>🗓️ Última estadia: {guest.last_stay_date ? formatDatePTBR(guest.last_stay_date) : 'Nenhuma'}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => onSelectGuest(guest)}>
                      <Eye size={14} /> Ver Ficha
                    </button>
                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => onOpenNewStayForGuest(guest)}>
                      <Calendar size={14} /> + Hospedagem
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="table-pagination">
              <span>
                Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, totalCount)} de {totalCount} hóspedes
              </span>

              <div className="pagination-controls">
                <button
                  className="page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  ← Anterior
                </button>
                <span style={{ padding: '0 8px', fontWeight: 600 }}>
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  className="page-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  Próxima →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
