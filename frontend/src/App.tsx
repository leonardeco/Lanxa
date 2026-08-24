import { useState, useEffect, lazy, Suspense } from 'react'
import Sidebar from './components/Sidebar'
import HeaderBar from './components/HeaderBar'
import StatusBar from './components/StatusBar'
import ErrorBoundary from './components/ErrorBoundary'
import CommandPalette from './components/CommandPalette'
import DashboardView from './views/DashboardView'
import LoginView from './views/LoginView'
import { useAuth } from './contexts/auth'
import { confirmarDescartar } from './utils/unsavedGuard'

// Vistas con code splitting: cada una baja en su propio chunk al abrirla,
// en vez de inflar el bundle inicial (Dashboard y Login quedan eager
// porque son la primera pantalla).
const PucView = lazy(() => import('./views/PucView'))
const CentrosCostoView = lazy(() => import('./views/CentrosCostoView'))
const PeriodosView = lazy(() => import('./views/PeriodosView'))
const TributariosView = lazy(() => import('./views/TributariosView'))
const NominaView = lazy(() => import('./views/NominaView'))
const VentasView = lazy(() => import('./views/VentasView'))
const UsuariosView = lazy(() => import('./views/UsuariosView'))
const CarteraView = lazy(() => import('./views/CarteraView'))
const ComprasView = lazy(() => import('./views/ComprasView'))
const InventarioView = lazy(() => import('./views/InventarioView'))
const ReportesView = lazy(() => import('./views/ReportesView'))
const EmpresaAjustesView = lazy(() => import('./views/EmpresaAjustesView'))
const ContactosView = lazy(() => import('./views/ContactosView'))
const PipelineView = lazy(() => import('./views/PipelineView'))

export type ViewId =
  | 'dashboard'
  | 'puc'
  | 'centros-costo'
  | 'periodos'
  | 'tributarios'
  | 'usuarios'
  | 'cartera'
  | 'nomina'
  | 'ventas'
  | 'contactos'
  | 'productos'
  | 'cotizaciones'
  | 'compras'
  | 'inventario'
  | 'rrhh'
  | 'plataformas'
  | 'reportes'
  | 'empresa'
  | 'pipeline'

export type RolUsuario =
  | 'Superusuario'
  | 'Directora'
  | 'CEO'
  | 'Contador'
  | 'Auxiliar Contable'

const VIEW_TITLES: Record<ViewId, string> = {
  dashboard: 'Dashboard General',
  puc: 'Plan Único de Cuentas (PUC)',
  'centros-costo': 'Centros de Costo — Marcas',
  periodos: 'Períodos Contables',
  tributarios: 'Parámetros Tributarios',
  nomina: 'Parámetros de Nómina',
  ventas: 'Ventas',
  contactos: 'Contactos',
  productos: 'Productos',
  cotizaciones: 'Cotizaciones',
  compras: 'Compras',
  cartera: 'Cartera — CxC & CxP',
  inventario: 'Inventario & Logística',
  rrhh: 'Talento Humano',
  plataformas: 'Plataformas & Marketing',
  reportes: 'Reportes & BI',
  usuarios: 'Gestión de Usuarios',
  empresa: 'Ajustes de empresa',
  pipeline: 'Pipeline comercial',
}

// Qué módulos puede ver cada rol
const ROLE_VIEWS: Record<RolUsuario, ViewId[]> = {
  Superusuario: [
    'dashboard', 'puc', 'centros-costo', 'periodos', 'tributarios', 'nomina',
    'contactos', 'pipeline', 'productos', 'cotizaciones', 'ventas',
    'compras', 'cartera', 'inventario', 'rrhh', 'plataformas', 'reportes', 'usuarios', 'empresa',
  ],
  Directora: [
    'dashboard', 'puc', 'centros-costo', 'periodos', 'tributarios', 'nomina',
    'contactos', 'pipeline', 'productos', 'cotizaciones', 'ventas',
    'compras', 'cartera', 'inventario', 'reportes', 'empresa',
  ],
  CEO: ['dashboard', 'reportes', 'contactos', 'pipeline', 'productos', 'cotizaciones', 'ventas', 'compras', 'cartera', 'inventario'],
  Contador: [
    'dashboard', 'puc', 'centros-costo', 'periodos', 'tributarios',
    'cartera', 'reportes', 'contactos', 'pipeline', 'productos', 'cotizaciones', 'ventas', 'compras',
  ],
  'Auxiliar Contable': [
    'dashboard', 'puc', 'centros-costo', 'periodos', 'tributarios',
    'contactos', 'pipeline', 'productos', 'cotizaciones', 'ventas', 'compras', 'cartera', 'reportes',
  ],
}

function App() {
  const { user, logout, isLoading } = useAuth()
  const [activeView, setActiveView] = useState<ViewId>('dashboard')
  const [searchOpen, setSearchOpen] = useState(false)

  // Efecto para redirigir si el rol no permite la vista actual
  useEffect(() => {
    if (user) {
      const role = user.rol as RolUsuario;
      const allowed = ROLE_VIEWS[role] || ['dashboard'];
      if (!allowed.includes(activeView)) {
        setActiveView('dashboard');
      }
    }
  }, [user, activeView]);

  useEffect(() => {
    if (!user) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [user])

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <div className="loading-text">Cargando Lanxa ERP...</div>
        <div className="loading-sub">Conectando con el sistema</div>
      </div>
    )
  }

  if (!user) {
    return <LoginView />
  }

  const activeRole = (user.rol as RolUsuario) || 'Solo lectura'
  const allowedViews = ROLE_VIEWS[activeRole] || ['dashboard']
  const userName = user.nombre_completo || 'Usuario'

  const handleViewChange = (view: ViewId) => {
    if (allowedViews.includes(view)) {
      // #17: no descartar formularios con datos sin guardar al cambiar de módulo
      if (view !== activeView && !confirmarDescartar()) return
      setActiveView(view)
    }
  }

  const handleLogout = () => {
    // #26: cerrar sesión también pasa por el guard de datos sin guardar
    if (!confirmarDescartar()) return
    logout()
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />
      case 'puc':
        return <PucView />
      case 'centros-costo':
        return <CentrosCostoView />
      case 'periodos':
        return <PeriodosView />
      case 'tributarios':
        return <TributariosView />
      case 'nomina':
        return <NominaView />
      case 'contactos':
        return <ContactosView />
      case 'pipeline':
        return <PipelineView />
      case 'productos':
        return <VentasView key="productos" initialTab="productos" hideTabs />
      case 'cotizaciones':
        return <VentasView key="cotizaciones" initialTab="cotizaciones" hideTabs />
      case 'ventas':
        return <VentasView key="ventas" initialTab="facturas" hideTabs />
      case 'compras':
        return <ComprasView />
      case 'cartera':
        return <CarteraView />
      case 'usuarios':
        return <UsuariosView />
      case 'empresa':
        return <EmpresaAjustesView />
      case 'inventario':
        return <InventarioView />
      case 'reportes':
        return <ReportesView />
      case 'rrhh':
      case 'plataformas':
        return (
          <div className="empty-state fade-in">
            <div className="empty-state-icon">🚧</div>
            <div className="empty-state-text">Módulo en desarrollo — Fase 2+</div>
            <div className="empty-state-sub">Este módulo se habilitará en las siguientes fases del proyecto.</div>
          </div>
        )
      default:
        return <DashboardView />
    }
  }

  return (
    <div className="app-layout fade-in">
      <Sidebar
        activeView={activeView}
        activeRole={activeRole}
        allowedViews={allowedViews}
        onViewChange={handleViewChange}
        onLogout={handleLogout}
        userName={userName}
      />
      <div className="main-content">
        <HeaderBar
          title={VIEW_TITLES[activeView]}
          role={activeRole}
          onOpenSearch={() => setSearchOpen(true)}
        />
        <CommandPalette
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
          modules={allowedViews.map((id) => ({ id, label: VIEW_TITLES[id] }))}
          onNavigate={handleViewChange}
        />
        <div className="page-content">
          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="loading-screen">
                  <div className="loading-spinner" />
                  <div className="loading-text">Cargando módulo...</div>
                </div>
              }
            >
              {renderView()}
            </Suspense>
          </ErrorBoundary>
        </div>
        <StatusBar role={activeRole} userName={userName} />
      </div>
    </div>
  )
}

export default App
