import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/hooks/useAuth';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSidebar } from '@/lib/hooks/useSidebar';
import { cn } from '@/lib/utils';

export default function Layout() {
  const { token } = useAuth();
  const { isCollapsed, setCollapsed } = useSidebar();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Close sidebar on small screens when navigating
  // This is a simple approach, a more robust solution might involve listening to route changes
  // and setting collapsed state based on screen size.
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) { // Tailwind's 'lg' breakpoint
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Set initial state
    return () => window.removeEventListener('resize', handleResize);
  }, [setCollapsed]);


  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar for larger screens */}
      <div className={cn(
        "hidden lg:flex transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <Sidebar />
      </div>

      {/* Overlay for mobile sidebar */}
      {isCollapsed && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setCollapsed(false)}
        ></div>
      )}
      {isCollapsed && (
        <div className="fixed inset-y-0 left-0 z-50 w-64 flex-col bg-gray-900 lg:hidden">
          <Sidebar />
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
