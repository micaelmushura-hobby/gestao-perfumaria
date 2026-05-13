import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingBag, Receipt, UserCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const BottomNavItem: React.FC<{
  to: string;
  icon: React.ElementType;
  label: string;
}> = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      cn(
        'flex flex-col items-center justify-center gap-1 w-full h-full text-xs font-medium transition-all py-1',
        isActive ? 'text-brand-accent' : 'text-gray-400'
      )
    }
  >
    <Icon size={20} />
    <span>{label}</span>
  </NavLink>
);

export const Layout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  if (!user && !isAuthPage) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-bottom border-gray-100 flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-display font-bold text-brand-primary">
          Gestão <span className="text-brand-accent">Perfumaria</span>
        </h1>
        {user && (
           <div className="flex items-center gap-2">
             <span className="text-sm font-medium hidden sm:inline">{user.nome}</span>
             <UserCircle size={24} className="text-gray-400" />
           </div>
        )}
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6">
        <Outlet />
      </main>

      {!isAuthPage && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 h-16 flex items-center justify-around px-2 max-w-lg mx-auto shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
          <BottomNavItem to="/" icon={LayoutDashboard} label="Início" />
          <BottomNavItem to="/clientes" icon={Users} label="Clientes" />
          <BottomNavItem to="/vendas" icon={ShoppingBag} label="Vendas" />
          <BottomNavItem to="/parcelas" icon={Receipt} label="Parcelas" />
          <BottomNavItem to="/perfil" icon={UserCircle} label="Perfil" />
        </nav>
      )}
    </div>
  );
};
