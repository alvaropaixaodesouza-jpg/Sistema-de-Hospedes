import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ActiveSection } from '../../types';
import { Users, BedDouble, CalendarDays, FolderCog, FileSpreadsheet, Settings, LogOut, ChevronDown, Database, ShieldAlert, Sparkles } from 'lucide-react';

interface HeaderProps {
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
  onOpenNewGuest: () => void;
  onOpenNewStay: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  setActiveSection,
  onOpenNewGuest,
  onOpenNewStay
}) => {
  const { user, isConfigured, logout } = useAuth();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const toggleDropdown = (menuKey: string) => {
    setOpenDropdown(openDropdown === menuKey ? null : menuKey);
  };

  const handleSelectSubItem = (section: ActiveSection) => {
    setActiveSection(section);
    setOpenDropdown(null);
  };

  return (
    <header className="app-header">
      {/* Top Main Bar */}
      <div className="top-bar">
        <div className="brand-title">
          <span className="brand-logo" aria-hidden="true">H</span>
          <div className="brand-text">
            <h1>Pousada Consciência & Abundância</h1>
            <small>Sistema de Gestão de Hóspedes & Recepção</small>
          </div>
        </div>

        <div className="header-right">
          {/* Connection Status Pill */}
          {isConfigured ? (
            <span className="status-pill supabase" title="Conectado ao banco central Supabase PostgreSQL">
              <i /> Supabase Ativo
            </span>
          ) : (
            <span className="status-pill local" title="Modo de demonstração com banco local. Dados armazenados com segurança localmente.">
              <i /> Modo Demonstração Local
            </span>
          )}

          {/* Connected User Badge */}
          {user && (
            <div className="user-badge">
              <span className="role-pill">{user.role}</span>
              <strong>{user.full_name}</strong>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={logout} 
                title="Sair do sistema"
                style={{ padding: '4px 8px', marginLeft: '6px' }}
              >
                <LogOut size={14} /> Sair
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Horizontal PC Administrative Menu Bar */}
      <nav className="nav-menu-bar">
        {/* Menu: Hóspedes */}
        <div className="nav-item">
          <button 
            className={`nav-button ${activeSection.startsWith('hospedes') ? 'active' : ''}`}
            onClick={() => toggleDropdown('hospedes')}
          >
            <Users size={16} /> Hóspedes <ChevronDown size={14} />
          </button>
          {openDropdown === 'hospedes' && (
            <div className="nav-dropdown">
              <button 
                className={`nav-dropdown-item ${activeSection === 'hospedes' ? 'active' : ''}`}
                onClick={() => handleSelectSubItem('hospedes')}
              >
                Lista de Hóspedes
              </button>
              <button 
                className="nav-dropdown-item"
                onClick={() => { onOpenNewGuest(); setOpenDropdown(null); }}
              >
                + Novo Cadastro
              </button>
              <button 
                className={`nav-dropdown-item ${activeSection === 'hospedes_duplicidades' ? 'active' : ''}`}
                onClick={() => handleSelectSubItem('hospedes_duplicidades')}
              >
                Revisão de Duplicidades
              </button>
            </div>
          )}
        </div>

        {/* Menu: Hospedagens */}
        <div className="nav-item">
          <button 
            className={`nav-button ${activeSection.startsWith('hospedagens') ? 'active' : ''}`}
            onClick={() => toggleDropdown('hospedagens')}
          >
            <CalendarDays size={16} /> Hospedagens <ChevronDown size={14} />
          </button>
          {openDropdown === 'hospedagens' && (
            <div className="nav-dropdown">
              <button 
                className={`nav-dropdown-item ${activeSection === 'hospedagens_chegadas' ? 'active' : ''}`}
                onClick={() => handleSelectSubItem('hospedagens_chegadas')}
              >
                Chegadas do Dia
              </button>
              <button 
                className={`nav-dropdown-item ${activeSection === 'hospedagens_hospedados' ? 'active' : ''}`}
                onClick={() => handleSelectSubItem('hospedagens_hospedados')}
              >
                Hospedados Agora
              </button>
              <button 
                className={`nav-dropdown-item ${activeSection === 'hospedagens_saidas' ? 'active' : ''}`}
                onClick={() => handleSelectSubItem('hospedagens_saidas')}
              >
                Saídas Previstas
              </button>
              <button 
                className={`nav-dropdown-item ${activeSection === 'hospedagens_historico' ? 'active' : ''}`}
                onClick={() => handleSelectSubItem('hospedagens_historico')}
              >
                Histórico por Período
              </button>
            </div>
          )}
        </div>

        {/* Menu: Quartos */}
        <div className="nav-item">
          <button 
            className={`nav-button ${activeSection === 'quartos' ? 'active' : ''}`}
            onClick={() => handleSelectSubItem('quartos')}
          >
            <BedDouble size={16} /> Quartos & Ocupação
          </button>
        </div>

        {/* Menu: Cadastros */}
        <div className="nav-item">
          <button 
            className={`nav-button ${activeSection === 'cadastros' ? 'active' : ''}`}
            onClick={() => handleSelectSubItem('cadastros')}
          >
            <FolderCog size={16} /> Cadastros Auxiliares
          </button>
        </div>

        {/* Menu: Relatórios */}
        <div className="nav-item">
          <button 
            className={`nav-button ${activeSection === 'relatorios' ? 'active' : ''}`}
            onClick={() => handleSelectSubItem('relatorios')}
          >
            <FileSpreadsheet size={16} /> Relatórios
          </button>
        </div>

        {/* Menu: Dados */}
        <div className="nav-item">
          <button 
            className={`nav-button ${activeSection === 'dados' ? 'active' : ''}`}
            onClick={() => handleSelectSubItem('dados')}
          >
            <Database size={16} /> Importação & Exportação
          </button>
        </div>

        {/* Menu: Configurações */}
        <div className="nav-item">
          <button 
            className={`nav-button ${activeSection === 'configuracoes' ? 'active' : ''}`}
            onClick={() => handleSelectSubItem('configuracoes')}
          >
            <Settings size={16} /> Configurações
          </button>
        </div>
      </nav>
    </header>
  );
};
