/* src/components/Sidebar.tsx - VERSÃO FINAL (Tooltip Azul Claro + Fix de Sobreposição) */
import React, { useState } from 'react';
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

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => onNavigate(view)}
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
        
        {/* Texto do Botão (Modo Expandido) */}
        {!isCollapsed && (
          <span className="text-sm font-bold truncate transition-opacity duration-200">
            {label}
          </span>
        )}
        
        {/* TOOLTIP FLUTUANTE (Correção: Z-Index Máximo + Cor Suave) */}
        {isCollapsed && (
            <div className="absolute left-[120%] top-1/2 -translate-y-1/2 bg-blue-50 text-blue-800 text-xs font-bold px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-[9999] shadow-xl shadow-blue-100 border border-blue-100 flex items-center">
                {/* Seta do Balão */}
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
    <aside 
      className={`
        hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ease-in-out h-screen sticky top-0
        ${isCollapsed ? 'w-20' : 'w-64'}
        z-[60] /* Z-Index alto para garantir que a barra fique acima */
      `}
    >
      {/* HEADER / LOGO */}
      <div className={`flex items-center h-20 border-b border-slate-100 ${isCollapsed ? 'justify-center' : 'px-6'}`}>
        <div className="flex items-center gap-3 overflow-hidden">
            <div 
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-blue-200 cursor-pointer hover:scale-105 transition-transform" 
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
                A
            </div>
            {!isCollapsed && (
                <h1 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 whitespace-nowrap tracking-tight animate-fade-in">
                    AURA ONE
                </h1>
            )}
        </div>
      </div>

      {/* BOTÃO DE COLAPSAR */}
      <div className="relative">
        <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 -top-3 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 rounded-full p-1.5 shadow-sm transition-colors z-[70] hover:scale-110 active:scale-95"
            title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
        >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* NAV ITEMS */}
      {/* IMPORTANTE: Removemos 'overflow-hidden' e 'overflow-y-auto' para permitir que o tooltip saia da caixa */}
      <nav className={`flex-1 px-3 py-6 space-y-1 ${isCollapsed ? 'overflow-visible' : 'overflow-y-auto custom-scrollbar'}`}>
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

      {/* FOOTER USER PROFILE */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-2'} mb-3 transition-all`}>
              <div className="w-10 h-10 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0 group relative cursor-help">
                  {userAvatar ? (
                      <img src={userAvatar} alt="User" className="w-full h-full object-cover" />
                  ) : (
                      <span className="font-bold text-slate-400 text-xs">{userName?.substring(0,2).toUpperCase() || 'U'}</span>
                  )}
                  
                  {/* Tooltip do Perfil (Azul Claro) */}
                  {isCollapsed && (
                    <div className="absolute left-[120%] top-1/2 -translate-y-1/2 bg-blue-50 text-blue-800 text-xs font-bold px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none z-[9999] shadow-xl shadow-blue-100 border border-blue-100 flex items-center">
                        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-50 border-l border-b border-blue-100 transform rotate-45"></div>
                        {userName}
                    </div>
                  )}
              </div>
              
              {!isCollapsed && (
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
                ${isCollapsed ? 'justify-center' : 'gap-3 px-3'}
            `}
          >
            <LogOut size={18} />
            {!isCollapsed && <span className="font-bold text-xs">Sair</span>}
            
            {/* Tooltip Sair (Vermelho Suave) */}
            {isCollapsed && (
                <div className="absolute left-[120%] top-1/2 -translate-y-1/2 bg-red-50 text-red-800 text-xs font-bold px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-[9999] shadow-xl shadow-red-100 border border-red-100 flex items-center">
                    <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-50 border-l border-b border-red-100 transform rotate-45"></div>
                    Sair
                </div>
            )}
          </button>
      </div>
    </aside>
  );
};