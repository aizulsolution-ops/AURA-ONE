/* src/App.tsx - ATUALIZADO COM INTEGRAÇÃO DE AGENDA */
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import { ViewState, UserRole, Patient, Appointment } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Views
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Agenda from './views/Agenda';
import PatientList from './views/PatientList';
import PatientFile from './views/PatientFile';
import Evolution from './views/Evolution';
import Reports from './views/Reports';
import Finance from './views/Finance';
import PatientPortal from './views/PatientPortal';
import Admin from './views/Admin';
import RecoverPassword from './views/RecoverPassword';

// Mocks e Constantes
import { MOCK_PATIENTS, EMPTY_PATIENT } from './constants';

const AppContent: React.FC = () => {
  const { userRole, session, loading, isBlocked, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.LOGIN);
  
  // Estados de Contexto para Navegação entre Telas
  const [selectedPatient, setSelectedPatient] = useState<Patient>(MOCK_PATIENTS[0]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // --- PROTEÇÃO DE ROTAS ---
  useEffect(() => {
    if (!loading) {
      if (!session) {
        if (currentView !== ViewState.RECOVER_PASSWORD) {
          setCurrentView(ViewState.LOGIN);
        }
      } else if (currentView === ViewState.LOGIN) {
        if (userRole === UserRole.PATIENT) {
          setCurrentView(ViewState.PATIENT_PORTAL);
        } else {
          setCurrentView(ViewState.DASHBOARD);
        }
      }
    }
  }, [session, loading, userRole, currentView]);

  const navigateTo = (view: ViewState) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await signOut();
  };

  // --- ROTEADOR DE CONTEÚDO ---
  const renderContent = () => {
    if (!session && currentView !== ViewState.LOGIN && currentView !== ViewState.RECOVER_PASSWORD) {
        return null; 
    }

    switch (currentView) {
      case ViewState.LOGIN:
        return <Login onLoginSuccess={() => {}} />; 
      
      case ViewState.RECOVER_PASSWORD:
        return <RecoverPassword onBack={() => navigateTo(ViewState.LOGIN)} />;

      case ViewState.PATIENT_PORTAL:
        return <PatientPortal onLogout={handleLogout} />;

      case ViewState.DASHBOARD:
        return <Dashboard onNavigate={navigateTo} role={userRole || UserRole.RECEPTION} />;

      case ViewState.AGENDA:
        return (
          <Agenda 
            onNavigate={(view, patient) => {
              setSelectedPatient(patient);
              setSelectedAppointment(null); // Limpa agendamento anterior se houver
              navigateTo(view);
            }} 
          />
        );

      case ViewState.PATIENT_LIST:
        return <PatientList 
          onSelectPatient={(patient) => {
            setSelectedPatient(patient);
            setSelectedAppointment(null);
            navigateTo(ViewState.PATIENT_FILE);
          }}
          onNewPatient={() => {
            setSelectedPatient(EMPTY_PATIENT);
            setSelectedAppointment(null);
            navigateTo(ViewState.PATIENT_FILE);
          }}
        />;

      case ViewState.PATIENT_FILE:
        return <PatientFile 
          key={selectedPatient.id}
          patient={selectedPatient} 
          onBack={() => navigateTo(ViewState.PATIENT_LIST)}
          onEvolution={() => navigateTo(ViewState.EVOLUTION)}
          appointment={selectedAppointment}
          onFinishVisit={() => {
              setSelectedAppointment(null);
              navigateTo(ViewState.AGENDA); // Após finalizar, volta para a Agenda
          }}
        />;

      case ViewState.EVOLUTION:
        return <Evolution 
          patient={selectedPatient} 
          onBack={() => navigateTo(ViewState.PATIENT_FILE)} 
          onFinish={() => navigateTo(ViewState.PATIENT_FILE)}
        />;

      case ViewState.REPORTS:
        return <Reports />;

      case ViewState.FINANCE:
        return <Finance />;

      case ViewState.ADMIN:
        return <Admin />;

      default:
        return <Dashboard onNavigate={navigateTo} role={userRole || UserRole.RECEPTION} />;
    }
  };

  // Layout Condicional
  if (currentView === ViewState.LOGIN || currentView === ViewState.RECOVER_PASSWORD || currentView === ViewState.PATIENT_PORTAL) {
      return <div className="animate-fade-in">{renderContent()}</div>;
  }

  return (
    <Layout 
      currentView={currentView} 
      onNavigate={navigateTo} 
      userRole={userRole || UserRole.RECEPTION}
      onLogout={handleLogout}
    >
      <div className="animate-fade-in px-0 lg:px-4">
        {renderContent()}
      </div>
    </Layout>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;