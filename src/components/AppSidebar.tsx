import { useAuth } from '@/contexts/AuthContext';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  MessageSquare,
  BarChart3,
  Clock,
  FileBarChart,
  AlertTriangle,
  DollarSign,
  Settings,
  LogOut,
  Ruler,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pauta', icon: ClipboardList, label: 'Pauta Geral' },
  { to: '/comentarios', icon: MessageSquare, label: 'Comentários' },
  { to: '/historico', icon: BarChart3, label: 'Histórico' },
  { to: '/horas', icon: Clock, label: 'Registro de Horas' },
  { to: '/relatorio-horas', icon: FileBarChart, label: 'Relatório de Horas' },
  { to: '/pendencias-horas', icon: AlertTriangle, label: 'Pendências de Horas' },
];

const adminItems = [
  { to: '/custos', icon: DollarSign, label: 'Custos Incorridos' },
  { to: '/configuracoes', icon: Settings, label: 'Configurações' },
];

const AppSidebar = () => {
  const { signOut, isAdmin, profile } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const linkClass = (path: string) =>
    cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
      location.pathname === path
        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
        : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
    );

  return (
    <aside
      className={cn(
        'h-screen bg-sidebar flex flex-col border-r border-sidebar-border transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded bg-accent flex items-center justify-center flex-shrink-0">
          <Ruler className="w-4 h-4 text-accent-foreground" />
        </div>
        {!collapsed && (
          <span className="text-sidebar-foreground font-bold text-lg">Esquadro</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass(item.to)}>
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className={cn('my-4 border-t border-sidebar-border', collapsed && 'mx-2')} />
            {adminItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass(item.to)}>
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User info + Footer */}
      <div className="px-2 pb-4 space-y-1">
        {!collapsed && profile && (
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-sidebar-foreground/70 truncate">{profile.nome || profile.email}</p>
            <p className="text-[10px] text-sidebar-muted capitalize">{profile.role}</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
        >
          {collapsed ? <ChevronRight className="w-5 h-5 flex-shrink-0" /> : <ChevronLeft className="w-5 h-5 flex-shrink-0" />}
          {!collapsed && <span>Recolher</span>}
        </button>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
