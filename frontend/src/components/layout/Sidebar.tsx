import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Bed, Calendar, Wrench, UserCog, DoorOpen, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Huéspedes', href: '/guests', icon: Users },
  { name: 'Habitaciones', href: '/rooms', icon: Bed },
  { name: 'Reservas', href: '/reservations', icon: Calendar },
  { name: 'Ocupación', href: '/occupancy', icon: DoorOpen },
  { name: 'Personal', href: '/staff', icon: UserCog },
  { name: 'Mantenimiento', href: '/maintenance', icon: Wrench },
  { name: 'Pagos', href: '/payments', icon: CreditCard },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center justify-center border-b border-gray-700">
        <h1 className="text-xl font-bold text-white">Hostal Manager</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-md',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
