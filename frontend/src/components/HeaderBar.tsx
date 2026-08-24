import { useState, useEffect } from 'react'
import type { RolUsuario } from '../App'
import { useEmpresa } from '../hooks/useEmpresa'

interface HeaderBarProps {
  title: string
  role: RolUsuario
  onOpenSearch?: () => void
}

function shortcutLabel() {
  if (typeof navigator === 'undefined') return 'Ctrl+K'
  return /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl+K'
}

export default function HeaderBar({ title, role, onOpenSearch }: HeaderBarProps) {
  const [time, setTime] = useState(new Date())
  const empresa = useEmpresa()

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="header-bar" id="erp-header">
      <div className="header-left">
        <div className="header-title-group">
          <h2>{title}</h2>
          <span className="header-breadcrumb">
            <span className="breadcrumb-home">🏠</span>
            <span className="breadcrumb-sep">›</span>
            <span>Lanxa</span>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-current">{title}</span>
          </span>
        </div>
      </div>
      <div className="header-right">
        {onOpenSearch && (
          <button
            type="button"
            className="header-search-btn"
            onClick={onOpenSearch}
            title={`Buscar (${shortcutLabel()})`}
          >
            🔍 Buscar
            <kbd>{shortcutLabel()}</kbd>
          </button>
        )}
        <div className="header-time">
          {time.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </div>
        <div className="header-nit">{empresa?.razon_social || 'Lanxa ERP'}</div>

        <div className="header-status">
          <span className="status-dot" />
          {role}
        </div>
      </div>
    </header>
  )
}
