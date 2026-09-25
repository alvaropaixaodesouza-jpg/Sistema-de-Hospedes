import React from 'react';
import { ActiveSection } from '../../types';
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  BedDouble, 
  CalendarRange, 
  CreditCard, 
  FileText, 
  Database, 
  Settings, 
  X, 
  ChevronRight,
  UserCheck,
  Clock,
  LogOut as LogOutIcon,
  History
} from 'lucide-react';

interface SidebarProps {
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenNewGuest: () => void;
  onOpenNewStay: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  setActiveSection,
  isMobileOpen,
  onCloseMobile,
  onOpenNewGuest,
  onOpenNewStay
}) => {
  const [hospedagensExpanded, setHospedagensExpanded] = React.useState(
    activeSection.startsWith('hospedagens')
  );

  const handleSelect = (section: ActiveSection) => {
    setActiveSection(section);
    onCloseMobile();
  };

  const navItems = [
    {
      id: 'inicio' as ActiveSection,
      label: 'Início',
      subtitle: 'Painel da Recepção',
      icon: LayoutDashboard
    },
    {
      id: 'hospedes' as ActiveSection,
      label: 'Hóspedes',
      subtitle: 'Cadastros & Fichas',
      icon: Users
    },
    {
      id: 'hospedagens_chegadas' as ActiveSection,
      label: 'Hospedagens',
      subtitle: 'Entradas & Ocupação',
      icon: CalendarDays,
      hasSubitems: true,
      subitems: [
        { id: 'hospedagens_chegadas' as ActiveSection, label: 'Chegadas do Dia', icon: Clock },
        { id: 'hospedagens_hospedados' as ActiveSection, label: 'Hospedados Agora', icon: UserCheck },
        { id: 'hospedagens_saidas' as ActiveSection, label: 'Saídas Previstas', icon: LogOutIcon },
        { id: 'hospedagens_historico' as ActiveSection, label: 'Histórico', icon: History },
        { id: 'hospedagens_timeline' as ActiveSection, label: 'Visão Timeline', icon: CalendarRange }
      ]
    },
    {
      id: 'quartos' as ActiveSection,
      label: 'Quartos',
      subtitle: 'Mapa de Acomodações',
      icon: BedDouble
    },
    {
      id: 'reservas' as ActiveSection,
      label: 'Reservas',
      subtitle: 'Calendário de Ocupação',
      icon: CalendarRange
    },
    {
      id: 'pagamentos' as ActiveSection,
      label: 'Pagamentos',
      subtitle: 'Lançamentos & Caixa',
      icon: CreditCard
    },
    {
      id: 'relatorios' as ActiveSection,
      label: 'Relatórios',
      subtitle: 'Indicadores & Estatísticas',
      icon: FileText
    },
    {
      id: 'dados' as ActiveSection,
      label: 'Dados',
      subtitle: 'Importação & Backup',
      icon: Database
    },
    {
      id: 'configuracoes' as ActiveSection,
      label: 'Configurações',
      subtitle: 'Parâmetros & Permissões',
      icon: Settings
    }
  ];

  return (
    <>
      {/* Backdrop for mobile drawer */}
      {isMobileOpen && (
        <div 
          className="sidebar-mobile-backdrop" 
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`pms-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-logo-icon">
            <span>P</span>
          </div>
          <div className="brand-info">
            <span className="brand-name">Consciência & Abundância</span>
            <span className="brand-badge">PMS Recepção</span>
          </div>
          {isMobileOpen && (
            <button className="sidebar-close-btn" onClick={onCloseMobile}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* Quick Action Buttons in Sidebar Header */}
        <div className="sidebar-quick-actions">
          <button className="btn-sidebar-primary" onClick={() => { onOpenNewStay(); onCloseMobile(); }}>
            + Nova Hospedagem
          </button>
          <button className="btn-sidebar-secondary" onClick={() => { onOpenNewGuest(); onCloseMobile(); }}>
            + Novo Hóspede
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav">
          <div className="nav-section-title">Navegação Principal</div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isItemActive = 
              activeSection === item.id || 
              (item.hasSubitems && activeSection.startsWith('hospedagens'));

            if (item.hasSubitems) {
              return (
                <div key={item.id} className="nav-group">
                  <button
                    className={`nav-link group-header ${isItemActive ? 'active' : ''}`}
                    onClick={() => setHospedagensExpanded(!hospedagensExpanded)}
                  >
                    <div className="nav-link-content">
                      <Icon size={18} className="nav-icon" />
                      <div className="nav-label-group">
                        <span className="nav-title">{item.label}</span>
                        <span className="nav-subtitle">{item.subtitle}</span>
                      </div>
                    </div>
                    <ChevronRight 
                      size={16} 
                      className={`nav-chevron ${hospedagensExpanded ? 'expanded' : ''}`} 
                    />
                  </button>

                  {hospedagensExpanded && item.subitems && (
                    <div className="nav-subitems">
                      {item.subitems.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = activeSection === sub.id;
                        return (
                          <button
                            key={sub.id}
                            className={`nav-sublink ${isSubActive ? 'active' : ''}`}
                            onClick={() => handleSelect(sub.id)}
                          >
                            <SubIcon size={15} />
                            <span>{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                className={`nav-link ${isItemActive ? 'active' : ''}`}
                onClick={() => handleSelect(item.id)}
              >
                <div className="nav-link-content">
                  <Icon size={18} className="nav-icon" />
                  <div className="nav-label-group">
                    <span className="nav-title">{item.label}</span>
                    <span className="nav-subtitle">{item.subtitle}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* System Version Footer */}
        <div className="sidebar-footer">
          <div className="system-status-indicator">
            <span className="status-dot green"></span>
            <span>Sistema Operacional</span>
          </div>
          <span className="version-tag">Pousada PMS v2.4</span>
        </div>
      </aside>
    </>
  );
};
