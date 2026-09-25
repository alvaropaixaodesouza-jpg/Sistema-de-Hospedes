import { useDataRefresh } from '../../lib/useDataRefresh';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ActiveSection, Guest, Room, Stay } from '../../types';
import { dataService } from '../../lib/storageStore';
import { maskPhone, formatDatePTBR, getOperationalDateString } from '../../lib/formatters';
import { 
  Search, 
  Bell, 
  User, 
  LogOut, 
  Menu, 
  Building2, 
  UserCheck, 
  Calendar, 
  BedDouble, 
  X,
  ChevronDown,
  Sparkles,
  CheckCircle,
  Clock,
  ShieldCheck
} from 'lucide-react';

interface TopbarProps {
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
  onOpenMobileSidebar: () => void;
  onSelectGuest: (guest: Guest) => void;
  onOpenNewGuest: () => void;
  onOpenNewStay: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  activeSection,
  setActiveSection,
  onOpenMobileSidebar,
  onSelectGuest,
  onOpenNewGuest,
  onOpenNewStay
}) => {
  const { user, isConfigured, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    guests: Guest[];
    rooms: Room[];
    stays: Stay[];
  }>({ guests: [], rooms: [], stays: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Notifications Popover State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationStats, setNotificationStats] = useState({
    arrivalsToday: 0,
    departuresToday: 0,
    cleaningRooms: 0
  });

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useDataRefresh(() => loadNotifications());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load Notification Badges
  useEffect(() => {
    loadNotifications();
  }, [activeSection]);

  const loadNotifications = async () => {
    try {
      const today = getOperationalDateString();
      const stays = await dataService.fetchStays({});
      const rooms = await dataService.fetchRooms();

      const arr = stays.filter(s => s.check_in_expected.startsWith(today));
      const dep = stays.filter(s => s.check_out_expected.startsWith(today));
      const clean = rooms.filter(r => r.status === 'limpeza');

      setNotificationStats({
        arrivalsToday: arr.length,
        departuresToday: dep.length,
        cleaningRooms: clean.length
      });
    } catch (err) {
      console.error('Error loading topbar notifications:', err);
    }
  };

  // Perform Global Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ guests: [], rooms: [], stays: [] });
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const guestsRes = await dataService.fetchGuests({ searchQuery, pageSize: 5 });
        const allRooms = await dataService.fetchRooms();
        const allStays = await dataService.fetchStays({});

        const queryLower = searchQuery.toLowerCase();
        const filteredRooms = allRooms.filter(r => 
          r.number_name.toLowerCase().includes(queryLower) || 
          (r.room_type_name && r.room_type_name.toLowerCase().includes(queryLower))
        );

        const filteredStays = allStays.filter(s =>
          (s.guest?.full_name && s.guest.full_name.toLowerCase().includes(queryLower)) ||
          (s.room?.number_name && s.room.number_name.toLowerCase().includes(queryLower))
        ).slice(0, 4);

        setSearchResults({
          guests: guestsRes.data,
          rooms: filteredRooms.slice(0, 4),
          stays: filteredStays
        });
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Error conducting global search:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const totalNotifCount = notificationStats.arrivalsToday + notificationStats.departuresToday + notificationStats.cleaningRooms;

  return (
    <header className="pms-topbar">
      <div className="topbar-left">
        {/* Mobile Menu Hamburger */}
        <button 
          className="mobile-menu-toggle" 
          onClick={onOpenMobileSidebar}
          aria-label="Abrir menu lateral"
        >
          <Menu size={22} />
        </button>

        {/* Pousada Name & Subtitle */}
        <div className="topbar-pousada-info">
          <div className="pousada-badge-icon">
            <Building2 size={18} />
          </div>
          <div>
            <h1 className="pousada-title">Pousada Consciência & Abundância</h1>
            <span className="pousada-sub">Recepção Central · Fuso Salvador (-03:00)</span>
          </div>
        </div>
      </div>

      {/* Center Global Search */}
      <div className="topbar-search-container" ref={searchRef}>
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="topbar-search-input"
            placeholder="Busca global (Hóspedes, CPF, Celular, Quarto...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchQuery.trim()) setShowSearchDropdown(true); }}
          />
          {searchQuery && (
            <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearchDropdown && (
          <div className="global-search-dropdown">
            {isSearching ? (
              <div className="search-status-item">Buscando registros...</div>
            ) : searchResults.guests.length === 0 && searchResults.rooms.length === 0 && searchResults.stays.length === 0 ? (
              <div className="search-status-item">Nenhum resultado para "{searchQuery}"</div>
            ) : (
              <>
                {/* Hóspedes */}
                {searchResults.guests.length > 0 && (
                  <div className="search-group">
                    <div className="search-group-header">Hóspedes ({searchResults.guests.length})</div>
                    {searchResults.guests.map(g => (
                      <div 
                        key={g.id} 
                        className="search-result-item"
                        onClick={() => {
                          onSelectGuest(g);
                          setShowSearchDropdown(false);
                          setSearchQuery('');
                        }}
                      >
                        <User size={15} color="var(--primary)" />
                        <div className="result-text">
                          <strong>{g.full_name}</strong>
                          <small>{g.internal_code} · {maskPhone(g.phone)} {g.city ? `· ${g.city}` : ''}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quartos */}
                {searchResults.rooms.length > 0 && (
                  <div className="search-group">
                    <div className="search-group-header">Quartos / Acomodações ({searchResults.rooms.length})</div>
                    {searchResults.rooms.map(r => (
                      <div 
                        key={r.id} 
                        className="search-result-item"
                        onClick={() => {
                          setActiveSection('quartos');
                          setShowSearchDropdown(false);
                          setSearchQuery('');
                        }}
                      >
                        <BedDouble size={15} color="#2563eb" />
                        <div className="result-text">
                          <strong>{r.number_name} ({r.room_type_name || 'Standard'})</strong>
                          <small>Status: {r.status} · Cap: {r.capacity} p.</small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right User & System Controls */}
      <div className="topbar-right">
        {/* Connection Status Badge */}
        {isConfigured ? (
          <span className="pms-status-badge supabase" title="Configuração presente; a disponibilidade depende da conexão e das permissões">
            <span className="dot"></span> Supabase configurado
          </span>
        ) : (
          <span className="pms-status-badge local" title="Modo de demonstração local ativado">
            <span className="dot"></span> Modo Local
          </span>
        )}

        {/* Notifications Button & Dropdown */}
        <div className="topbar-notif-container" ref={notifRef}>
          <button 
            className="topbar-icon-btn" 
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notificações e Avisos da Recepção"
          >
            <Bell size={18} />
            {totalNotifCount > 0 && <span className="notif-badge">{totalNotifCount}</span>}
          </button>

          {showNotifications && (
            <div className="notif-dropdown-popover">
              <div className="notif-header">
                <strong>Avisos da Recepção Hoje</strong>
                <span className="notif-date">{formatDatePTBR(new Date().toISOString())}</span>
              </div>
              <div className="notif-body">
                <div 
                  className="notif-item clickable"
                  onClick={() => { setActiveSection('hospedagens_chegadas'); setShowNotifications(false); }}
                >
                  <Clock size={16} color="#2563eb" />
                  <div>
                    <strong>{notificationStats.arrivalsToday} Chegada(s) Prevista(s) Hoje</strong>
                    <small>Clique para abrir chegadas do dia</small>
                  </div>
                </div>

                <div 
                  className="notif-item clickable"
                  onClick={() => { setActiveSection('hospedagens_saidas'); setShowNotifications(false); }}
                >
                  <UserCheck size={16} color="#7c3aed" />
                  <div>
                    <strong>{notificationStats.departuresToday} Saída(s) Prevista(s) Hoje</strong>
                    <small>Clique para abrir saídas do dia</small>
                  </div>
                </div>

                <div 
                  className="notif-item clickable"
                  onClick={() => { setActiveSection('quartos'); setShowNotifications(false); }}
                >
                  <Sparkles size={16} color="#d97706" />
                  <div>
                    <strong>{notificationStats.cleaningRooms} Quarto(s) em Limpeza</strong>
                    <small>Acomodações aguardando liberação</small>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        {user && (
          <div className="user-profile-pill">
            <div className="user-avatar">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <span className="user-name">{user.full_name}</span>
              <span className="user-role">{user.role}</span>
            </div>
            <button className="user-logout-btn" onClick={logout} title="Sair do Sistema">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
