import React, { useState } from 'react';
import { ViewState, UserRole } from '../types';
import { Sidebar } from './Sidebar'; // Importação do novo componente
import { useAuth } from '../contexts/AuthContext'; // Hook para dados do usuário
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Settings, 
  LogOut, 
  Activity,
  Menu,
  X,
  DollarSign
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  userRole: UserRole;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate, userRole, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { userName, userAvatar, userSpecialty } = useAuth(); 

  // Views que não usam layout padrão
  if ([ViewState.LOGIN, ViewState.PATIENT_PORTAL, ViewState.RECOVER_PASSWORD].includes(currentView)) {
    return <>{children}</>;
  }

  // NavItem Helper para Mobile
  const MobileNavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => {
        onNavigate(view);
        setIsMobileMenuOpen(false);
      }}
      className={`flex items-center w-full px-4 py-3 mb-2 text-sm font-bold transition-colors rounded-xl ${
        currentView === view
          ? 'bg-blue-600 text-white shadow-md'
          : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      <Icon className={`w-5 h-5 mr-3 ${currentView === view ? 'text-white' : 'text-slate-400'}`} />
      {label}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* NOVO SIDEBAR DESKTOP */}
      <Sidebar 
        currentView={currentView}
        onNavigate={onNavigate}
        userRole={userRole}
        onLogout={onLogout}
        userName={userName}
        userAvatar={userAvatar}
        userSpecialty={userSpecialty}
      />

      {/* --- MOBILE HEADER & MENU (MANTIDO) --- */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4 shadow-sm">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">A</div>
            <h1 className="text-lg font-bold text-slate-800">AURA ONE</h1>
         </div>
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600 rounded-lg hover:bg-slate-50">
            {isMobileMenuOpen ? <X size={24}/> : <Menu size={24} />}
         </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white pt-20 px-4 animate-fade-in">
            <nav className="space-y-1">
                <MobileNavItem view={ViewState.DASHBOARD} icon={LayoutDashboard} label="Painel" />
                <MobileNavItem view={ViewState.AGENDA} icon={Calendar} label="Agenda" />
                {(userRole === UserRole.PROFESSIONAL || userRole === UserRole.MANAGER || userRole === UserRole.RECEPTION) && (
                   <MobileNavItem view={ViewState.PATIENT_LIST} icon={Users} label="Pacientes" />
                )}
                {userRole === UserRole.MANAGER && (
                    <>
                      <MobileNavItem view={ViewState.FINANCE} icon={DollarSign} label="Financeiro" />
                      <MobileNavItem view={ViewState.ADMIN} icon={Settings} label="Administração" />
                    </>
                )}
                <MobileNavItem view={ViewState.REPORTS} icon={Activity} label="Relatórios" />
                
                <div className="pt-6 border-t border-slate-100 mt-4">
                    <button onClick={onLogout} className="flex items-center w-full px-4 py-3 text-sm font-bold text-red-600 bg-red-50 rounded-xl hover:bg-red-100">
                        <LogOut className="w-5 h-5 mr-3" />
                        Sair do Sistema
                    </button>
                </div>
            </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto md:p-8 p-4 pt-20 md:pt-8 pb-24 md:pb-8 scroll-smooth w-full">
        {children}
      </main>
    </div>
  );
};

export default Layout;