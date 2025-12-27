/* src/components/Sidebar.tsx - FIX PARA SMART SCROLL */
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Settings, 
  LogOut, 
  Activity,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { ViewState, UserRole } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  userRole: UserRole;
  onLogout: () => void;
  userName?: string | null;
  userAvatar?: string | null;
  userSpecialty?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, onNavigate, userRole, onLogout, userName, userAvatar, userSpecialty 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // --- SMART HEADER LOGIC ---
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const controlNavbar = () => {
      // Se o menu estiver aberto, mantém o header visível
      if (isMobileOpen) {
        setShowHeader(true);
        return;
      }

      const currentScrollY = window.scrollY;
      
      // Lógica de Desaparecer:
      // Se rolar para baixo (> lastScrollY) E já tiver descido um pouco (> 50px)
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setShowHeader(false);
      } else {
        // Se rolar para cima, mostra imediatamente
        setShowHeader(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', controlNavbar);
    return () => window.removeEventListener('scroll', controlNavbar);
  }, [lastScrollY, isMobileOpen]);

  // --- ASSETS (SUPABASE CLOUD) ---
  const ASSETS = {
    LOGO_HORIZONTAL: "https://kbjtwbtwvkulhhtsvjec.supabase.co/storage/v1/object/public/clinic-assets/logo-full-horizontal.png",
    LOGO_ICON: "https://kbjtwbtwvkulhhtsvjec.supabase.co/storage/v1/object/public/clinic-assets/logo-icon.png"
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => {
            onNavigate(view);
            setIsMobileOpen(false);
        }}
        className={`
          group relative flex items-center w-full px-3 py-3 mb-1 transition-all duration-200 rounded-xl
          ${isActive 
            ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
            : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
          }
          ${isCollapsed ? 'justify-center' : 'justify-start'}
        `}
      >
        <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'} ${!isCollapsed && 'mr-3'}`} />
        
        {!isCollapsed && (
          <span className="text-sm font-bold truncate transition-opacity duration-200">
            {label}
          </span>
        )}
        
        {isCollapsed && !isMobileOpen && (
            <div className="absolute left-[120%] top-1/2 -translate-y-1/2 bg-blue-50 text-blue-800 text-xs font-bold px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-[9999] shadow-xl shadow-blue-100 border border-blue-100 flex items-center">
                <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-50 border-l border-b border-blue-100 transform rotate-45"></div>
                {label}
            </div>
        )}
      </button>
    );
  };

  const getRoleLabel = (role: UserRole) => {
      switch(role) {
          case UserRole.RECEPTION: return 'Recepção';
          case UserRole.PROFESSIONAL: return 'Profissional';
          case UserRole.MANAGER: return 'Gestor';
          default: return 'Usuário';
      }
  };

  const displayRole = userSpecialty || getRoleLabel(userRole);

  return (
    <>
        {/* --- SMART MOBILE HEADER --- */}
        <div 
            className={`
                md:hidden fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 z-50 shadow-sm transition-transform duration-300 ease-in-out
                ${showHeader ? 'translate-y-0' : '-translate-y-full'}
            `}
        >
            <div className="flex items-center gap-3">
                <img src={ASSETS.LOGO_ICON} alt="AURA" className="h-8 w-8 object-contain" />
                <span className="font-bold text-slate-800 text-lg tracking-tight">AURA ONE</span>
            </div>
            <button 
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors active:scale-95"
            >
                {isMobileOpen ? <X size={24} className="text-red-500" /> : <Menu size={24} />}
            </button>
        </div>

        {/* --- BACKDROP MOBILE --- */}
        {isMobileOpen && (
            <div 
                className="fixed inset-0 bg-slate-900/60 z-[55] md:hidden backdrop-blur-sm transition-opacity"
                onClick={() => setIsMobileOpen(false)}
            />
        )}

        {/* --- SIDEBAR PRINCIPAL --- */}
        <aside 
            className={`
                fixed md:sticky top-0 left-0 h-screen bg-white border-r border-slate-200 transition-all duration-300 ease-in-out z-[60] flex flex-col shadow-2xl md:shadow-none
                ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'} 
                ${isCollapsed ? 'md:w-20' : 'md:w-64'}
                pt-16 md:pt-0 
            `}
        >
            {/* Header Desktop */}
            <div className={`hidden md:flex items-center h-24 border-b border-slate-100 ${isCollapsed ? 'justify-center' : 'px-6'}`}>
                <div 
                    className="cursor-pointer transition-transform hover:scale-105 active:scale-95 duration-200"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "Expandir" : "Recolher"}
                >
                    {isCollapsed ? (
                        <img src={ASSETS.LOGO_ICON} alt="AURA" className="w-10 h-10 object-contain" />
                    ) : (
                        <img src={ASSETS.LOGO_HORIZONTAL} alt="AURA ONE" className="h-14 w-auto object-contain" />
                    )}
                </div>
            </div>

            {/* Botão Collapse Desktop */}
            <div className="hidden md:block relative">
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 -top-3 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 rounded-full p-1.5 shadow-sm transition-colors z-[70] hover:scale-110 active:scale-95"
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </div>

            {/* Navegação */}
            <nav className={`flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar ${isCollapsed ? 'md:overflow-visible' : ''}`}>
                <NavItem view={ViewState.DASHBOARD} icon={LayoutDashboard} label="Painel" />
                <NavItem view={ViewState.AGENDA} icon={Calendar} label="Agenda" />
                
                {(userRole === UserRole.PROFESSIONAL || userRole === UserRole.MANAGER || userRole === UserRole.RECEPTION) && (
                <NavItem view={ViewState.PATIENT_LIST} icon={Users} label="Pacientes" />
                )}
                
                {userRole === UserRole.MANAGER && (
                <>
                    <NavItem view={ViewState.FINANCE} icon={DollarSign} label="Financeiro" />
                    <NavItem view={ViewState.REPORTS} icon={Activity} label="Relatórios" />
                    <NavItem view={ViewState.ADMIN} icon={Settings} label="Administração" />
                </>
                )}
            </nav>

            {/* Rodapé Usuário */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/50 mt-auto">
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-2'} mb-3 transition-all`}>
                    <div className="w-10 h-10 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0 group relative cursor-help">
                        {userAvatar ? (
                            <img src={userAvatar} alt="User" className="w-full h-full object-cover" />
                        ) : (
                            <span className="font-bold text-slate-400 text-xs">{userName?.substring(0,2).toUpperCase() || 'U'}</span>
                        )}
                    </div>
                    
                    {(!isCollapsed || isMobileOpen) && (
                        <div className="min-w-0 overflow-hidden flex-1 animate-fade-in">
                            <p className="text-xs font-bold text-slate-800 truncate" title={userName || ''}>{userName || 'Usuário'}</p>
                            <p className="text-[10px] text-slate-500 font-medium truncate uppercase tracking-wide">{displayRole}</p>
                        </div>
                    )}
                </div>
                
                <button 
                    onClick={onLogout} 
                    className={`
                        group relative flex items-center w-full p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all
                        ${isCollapsed ? 'justify-center' : 'justify-start gap-3 px-3'}
                    `}
                >
                    <LogOut size={18} />
                    {(!isCollapsed || isMobileOpen) && <span className="font-bold text-xs">Sair</span>}
                </button>
            </div>
        </aside>
    </>
  );
};