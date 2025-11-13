import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Bed,
  Wrench,
  UserCog,
  DoorOpen,
  DollarSign,
  BarChart3,
  Wifi,
  Monitor,
  Calendar,
  Shield,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/lib/hooks/useSidebar';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Huéspedes', href: '/guests', icon: Users },
  { name: 'Habitaciones', href: '/rooms', icon: Bed },
  { name: 'Reservas', href: '/reservations', icon: Calendar },
  { name: 'Ocupación', href: '/occupancy', icon: DoorOpen },
  { name: 'Pagos', href: '/payments', icon: DollarSign },
  { name: 'Reportes', href: '/payments/reports', icon: BarChart3 },
  { name: 'Tasas de Cambio', href: '/exchange-rates', icon: TrendingUp },
  { name: 'Red', href: '/network', icon: Wifi },
  { name: 'Dispositivos', href: '/devices', icon: Monitor },
  { name: 'Personal', href: '/staff', icon: UserCog },
  { name: 'Mantenimiento', href: '/maintenance', icon: Wrench },
  { name: 'Usuarios', href: '/users', icon: Shield },
];

const adminNavigation = [
  { name: 'Aprobaciones', href: '/admin/user-approvals', icon: CheckCircle2 },
  { name: 'Auditoría', href: '/admin/audit-logs', icon: BarChart3 },
  { name: 'Análisis de Logs', href: '/admin/log-analytics', icon: TrendingUp },
];

const NavLink = ({ item, isCollapsed }: { item: typeof navigation[0], isCollapsed: boolean }) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(item.href);
  const Icon = item.icon;

  const linkContent = (
    <Link
      to={item.href}
      className={cn(
        'flex items-center justify-start h-10 px-3 py-2 text-sm font-medium rounded-md transition-colors',
        isActive
          ? 'bg-gray-800 text-white'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white',
        isCollapsed && 'justify-center'
      )}
    >
      <Icon className={cn('h-5 w-5', !isCollapsed && 'mr-3')} />
      <span className={cn('truncate', isCollapsed && 'hidden')}>{item.name}</span>
    </Link>
  );

  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right">
            <p>{item.name}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return linkContent;
};


export default function Sidebar() {
  const { isCollapsed, toggle } = useSidebar();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className={cn(
      "relative hidden h-screen bg-gray-900 text-white transition-all duration-300 ease-in-out lg:flex lg:flex-col",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <div className="flex h-16 items-center justify-between border-b border-gray-700 px-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Star className="h-6 w-6 text-yellow-400" />
          <h1 className={cn("text-xl font-bold whitespace-nowrap", isCollapsed && 'hidden')}>JADs Hostal Manager</h1>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink key={item.name} item={item} isCollapsed={isCollapsed} />
        ))}

        {isAdmin && (
          <>
            <div className="border-t border-gray-700 my-4" />
            <div className={cn("text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2", isCollapsed && 'text-center')}>
              {!isCollapsed && 'Administración'}
            </div>
            {adminNavigation.map((item) => (
              <NavLink key={item.name} item={item} isCollapsed={isCollapsed} />
            ))}
          </>
        )}
      </nav>
      <div className="border-t border-gray-700 p-3">
        <Button variant="ghost" className="w-full justify-center hover:bg-gray-700" onClick={toggle}>
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
}
