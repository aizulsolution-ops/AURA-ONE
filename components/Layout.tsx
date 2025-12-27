/* src/components/Layout.tsx - VERSÃO WINDOW SCROLL (Correção Smart Header) */
import React from 'react';
import { ViewState, UserRole } from '../types';
import { Sidebar } from './Sidebar';
import { useAuth } from '../contexts/AuthContext'; 

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  userRole: UserRole;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate, userRole, onLogout }) => {
  const { userName, userAvatar, userSpecialty } = useAuth(); 

  // Views Fullscreen
  if ([ViewState.LOGIN, ViewState.PATIENT_PORTAL, ViewState.RECOVER_PASSWORD].includes(currentView)) {
    return <>{children}</>;
  }

  return (
    // Alteração Crítica: min-h-screen em vez de h-screen. 
    // Removemos overflow-hidden para permitir que o window detecte o scroll.
    <div className="flex min-h-screen bg-slate-50">
      
      <Sidebar 
        currentView={currentView}
        onNavigate={onNavigate}
        userRole={userRole}
        onLogout={onLogout}
        userName={userName}
        userAvatar={userAvatar}
        userSpecialty={userSpecialty}
      />

      {/* Alteração Crítica: 
         1. Removemos 'overflow-y-auto' (quem rola agora é a página inteira).
         2. Removemos 'h-full'.
         3. Mantivemos os paddings para proteger o conteúdo do Header Fixo.
      */}
      <main className="flex-1 w-full pt-20 md:pt-8 px-4 md:px-8 pb-24 md:pb-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;