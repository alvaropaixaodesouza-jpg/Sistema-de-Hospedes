import { AuxiliaryView } from './components/settings/AuxiliaryView';
import { DuplicatesView } from './components/guests/DuplicatesView';
import { AccessGate } from './components/common/AccessGate';
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { ReceptionDashboard } from './components/dashboard/ReceptionDashboard';
import { GuestList } from './components/guests/GuestList';
import { GuestDrawer } from './components/guests/GuestDrawer';
import { GuestFormModal } from './components/guests/GuestFormModal';
import { NewStayModal } from './components/stays/NewStayModal';
import { DailyStaysView } from './components/stays/DailyStaysView';
import { RoomsView } from './components/rooms/RoomsView';
import { TimelineView } from './components/timeline/TimelineView';
import { PaymentsView } from './components/payments/PaymentsView';
import { PaymentModal } from './components/common/PaymentModal';
import { QuickCheckInOutModal } from './components/common/QuickCheckInOutModal';
import { DataImportExportView } from './components/data/DataImportExportView';
import { SettingsView } from './components/settings/SettingsView';
import { ReportsView } from './components/reports/ReportsView';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { Guest, ActiveSection, Payment } from './types';
import { dataService } from './lib/storageStore';

const MainApp: React.FC = () => {
  // Navigation State - Default to 'inicio' (Painel da Recepção)
  const [activeSection, setActiveSection] = useState<ActiveSection>('inicio');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Drawer / Modals State
  const [selectedGuestForDrawer, setSelectedGuestForDrawer] = useState<Guest | null>(null);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState<boolean>(false);
  const [guestToEdit, setGuestToEdit] = useState<Guest | null>(null);

  const [isStayModalOpen, setIsStayModalOpen] = useState<boolean>(false);
  const [stayDefaults, setStayDefaults] = useState<{ status: 'hospedado' | 'reservada'; roomId?: string; checkInDate?: string; checkOutDate?: string }>({ status: 'hospedado' });
  const [guestForNewStay, setGuestForNewStay] = useState<Guest | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [preselectedStayIdForPayment, setPreselectedStayIdForPayment] = useState<string | undefined>(undefined);

  const [isQuickCheckModalOpen, setIsQuickCheckModalOpen] = useState<boolean>(false);
  const [quickCheckMode, setQuickCheckMode] = useState<'checkin' | 'checkout'>('checkin');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const handleOpenNewGuest = () => {
    setGuestToEdit(null);
    setIsGuestModalOpen(true);
  };

  const handleEditGuest = (guest: Guest) => {
    setGuestToEdit(guest);
    setIsGuestModalOpen(true);
  };

  const handleSaveGuest = async (guestData: Partial<Guest>) => {
    const saved = await dataService.saveGuest(guestData);
    addToast(guestData.id ? 'Ficha do hóspede atualizada com sucesso!' : 'Novo hóspede cadastrado com sucesso!');
    if (selectedGuestForDrawer?.id === saved.id) {
      setSelectedGuestForDrawer(saved);
    }
  };

  const handleOpenNewStayForGuest = (guest: Guest) => {
    setStayDefaults({ status: 'hospedado' });
    setGuestForNewStay(guest);
    setIsStayModalOpen(true);
  };

  const handleOpenNewStayGeneral = () => {
    setGuestForNewStay(null);
    setStayDefaults({ status: 'hospedado' });
    setIsStayModalOpen(true);
  };
  const handleOpenNewReservation = () => {
    setGuestForNewStay(null);
    setStayDefaults({ status: 'reservada' });
    setIsStayModalOpen(true);
  };
  const handleCalendarReservation = (roomId: string, checkInDate: string, checkOutDate: string) => {
    setGuestForNewStay(null);
    setStayDefaults({ status: 'reservada', roomId, checkInDate, checkOutDate });
    setIsStayModalOpen(true);
  };

  const handleSaveStay = async (stayData: any) => {
    await dataService.saveStay(stayData);
    addToast('Hospedagem / Reserva registrada com sucesso!');
  };

  const handleSavePayment = async (paymentData: Partial<Payment>) => {
    await dataService.savePayment(paymentData);
    addToast('Pagamento registrado com sucesso!');
  };

  const handleSelectGuestFromId = async (guestId: string) => {
    const g = await dataService.getGuestById(guestId);
    if (g) {
      setSelectedGuestForDrawer(g);
    }
  };

  return (
    <div className="pms-app-layout">
      {/* Fixed Desktop Sidebar & Mobile Drawer */}
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenNewGuest={handleOpenNewGuest}
        onOpenNewStay={handleOpenNewStayGeneral}
      />

      {/* Main Content Area */}
      <div className="pms-main-wrapper">
        {/* Top Header Bar */}
        <Topbar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onSelectGuest={(guest) => setSelectedGuestForDrawer(guest)}
          onOpenNewGuest={handleOpenNewGuest}
          onOpenNewStay={handleOpenNewStayGeneral}
        />

        <main className="pms-main-content">
          {/* 1. TELA INICIAL: Painel da Recepção */}
          {activeSection === 'inicio' && (
            <ReceptionDashboard
              setActiveSection={setActiveSection}
              onOpenNewGuest={handleOpenNewGuest}
              onOpenNewStay={handleOpenNewStayGeneral}
              onOpenNewReservation={handleOpenNewReservation}
              onOpenQuickCheckIn={() => { setQuickCheckMode('checkin'); setIsQuickCheckModalOpen(true); }}
              onOpenQuickCheckOut={() => { setQuickCheckMode('checkout'); setIsQuickCheckModalOpen(true); }}
              onOpenPaymentModal={() => { setPreselectedStayIdForPayment(undefined); setIsPaymentModalOpen(true); }}
              onSelectGuest={(g) => setSelectedGuestForDrawer(g)}
            />
          )}

          {/* 2. HÓSPEDES */}
          {activeSection === 'hospedes' && (
            <GuestList
              onSelectGuest={(guest) => setSelectedGuestForDrawer(guest)}
              onOpenNewGuest={handleOpenNewGuest}
              onOpenNewStayForGuest={handleOpenNewStayForGuest}
            />
          )}

          {activeSection === 'hospedes_duplicidades' && <DuplicatesView onSelect={setSelectedGuestForDrawer} />}

          {/* 3. HOSPEDAGENS */}
          {activeSection === 'hospedagens_chegadas' && (
            <DailyStaysView 
              initialSubTab="chegadas" 
              onSelectGuestId={handleSelectGuestFromId}
              onOpenNewStayWithRoomAndDates={handleCalendarReservation}
            />
          )}
          {activeSection === 'hospedagens_hospedados' && (
            <DailyStaysView 
              initialSubTab="hospedados" 
              onSelectGuestId={handleSelectGuestFromId}
              onOpenNewStayWithRoomAndDates={handleCalendarReservation}
            />
          )}
          {activeSection === 'hospedagens_saidas' && (
            <DailyStaysView 
              initialSubTab="saidas" 
              onSelectGuestId={handleSelectGuestFromId}
              onOpenNewStayWithRoomAndDates={handleCalendarReservation}
            />
          )}
          {activeSection === 'hospedagens_historico' && (
            <DailyStaysView 
              initialSubTab="historico" 
              onSelectGuestId={handleSelectGuestFromId}
              onOpenNewStayWithRoomAndDates={handleCalendarReservation}
            />
          )}
          {activeSection === 'hospedagens_timeline' && (
            <DailyStaysView 
              initialSubTab="timeline" 
              onSelectGuestId={handleSelectGuestFromId}
              onOpenNewStayWithRoomAndDates={handleCalendarReservation}
            />
          )}

          {/* 4. QUARTOS */}
          {activeSection === 'quartos' && <RoomsView />}

          {/* 5. RESERVAS (Timeline & Calendar) */}
          {activeSection === 'reservas' && (
            <TimelineView
              onSelectGuestId={handleSelectGuestFromId}
              onOpenNewStayWithRoomAndDates={handleCalendarReservation}
            />
          )}

          {/* 6. PAGAMENTOS */}
          {activeSection === 'pagamentos' && (
            <PaymentsView
              onOpenPaymentModal={(stayId) => {
                setPreselectedStayIdForPayment(stayId);
                setIsPaymentModalOpen(true);
              }}
            />
          )}

          {/* 7. CADASTROS AUXILIARES */}
          {activeSection === 'cadastros' && <AuxiliaryView />}

          {/* 8. RELATÓRIOS */}
          {activeSection === 'relatorios' && <ReportsView />}

          {/* 9. DADOS */}
          {activeSection === 'dados' && <DataImportExportView onNotify={addToast} />}

          {/* 10. CONFIGURAÇÕES */}
          {activeSection === 'configuracoes' && <SettingsView />}
        </main>
      </div>

      {/* Side Panel / Fullscreen Drawer for Guest File */}
      <GuestDrawer
        guest={selectedGuestForDrawer}
        onClose={() => setSelectedGuestForDrawer(null)}
        onEdit={handleEditGuest}
        onNewStay={handleOpenNewStayForGuest}
      />

      {/* Modal: Novo/Editar Hóspede */}
      <GuestFormModal
        isOpen={isGuestModalOpen}
        onClose={() => setIsGuestModalOpen(false)}
        onSave={handleSaveGuest}
        initialData={guestToEdit}
      />

      {/* Modal: Nova Hospedagem */}
      <NewStayModal
        isOpen={isStayModalOpen}
        onClose={() => setIsStayModalOpen(false)}
        guest={guestForNewStay}
        defaults={stayDefaults}
        onSave={handleSaveStay}
      />

      {/* Modal: Registrar Pagamento */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSave={handleSavePayment}
        preselectedStayId={preselectedStayIdForPayment}
      />

      {/* Modal: Quick Check-in / Check-out */}
      <QuickCheckInOutModal
        isOpen={isQuickCheckModalOpen}
        mode={quickCheckMode}
        onClose={() => setIsQuickCheckModalOpen(false)}
        onRefresh={() => setToasts(t => [...t, { id: String(Date.now()), type: 'success', message: 'Operação concluída com sucesso!' }])}
        onNotify={addToast}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={(id) => setToasts(t => t.filter(x => x.id !== id))} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AccessGate><MainApp /></AccessGate>
    </AuthProvider>
  );
}
