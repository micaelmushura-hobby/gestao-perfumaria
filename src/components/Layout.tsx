import React from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingBag, Receipt, Settings, UserCircle } from 'lucide-react';
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md border-b border-gray-100 dark:border-dark-border flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-display font-bold text-brand-primary dark:text-white">
          Gestão <span className="text-brand-accent">Perfumaria</span>
        </h1>
        {user && (
           <Link to="/perfil" className="flex items-center gap-2">
             <span className="text-sm font-medium hidden sm:inline dark:text-gray-300">{user.nome}</span>
             <UserCircle size={24} className="text-gray-400 dark:text-gray-500" />
           </Link>
        )}
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6">
        <Outlet />
      </main>

      {user && !isAuthPage && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-dark-bg border-t border-gray-100 dark:border-dark-border h-16 flex items-center justify-around px-2 max-w-lg mx-auto shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
          <BottomNavItem to="/" icon={LayoutDashboard} label="Início" />
          <BottomNavItem to="/clientes" icon={Users} label="Clientes" />
          <BottomNavItem to="/vendas" icon={ShoppingBag} label="Vendas" />
          <BottomNavItem to="/parcelas" icon={Receipt} label="Finanças" />
          <BottomNavItem to="/configuracoes" icon={Settings} label="Ajustes" />
        </nav>
      )}
    </div>
  );
};
