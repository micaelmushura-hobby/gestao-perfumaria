import React from 'react';
import { Settings, Bell, Shield, Moon, LogOut, HelpCircle, ChevronRight, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export const Configuracoes: React.FC = () => {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const ConfigItem = ({ icon: Icon, label, description, onClick, value }: any) => (
    <button 
      onClick={onClick}
      className="card flex items-center justify-between p-4 active:bg-gray-50 dark:active:bg-gray-800 text-left w-full"
    >
      <div className="flex items-center gap-4">
        <div className="bg-gray-100 dark:bg-gray-800 p-2.5 rounded-xl text-gray-500 dark:text-gray-400">
          <Icon size={20} />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-gray-700 dark:text-gray-200">{label}</span>
          {description && <span className="text-xs text-gray-400 dark:text-gray-500">{description}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-xs font-bold text-brand-accent">{value}</span>}
        <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
      </div>
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-display font-bold dark:text-white">Configurações</h2>

      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Geral</h3>
        <div className="flex flex-col gap-2">
          <ConfigItem icon={Bell} label="Notificações" description="Alertas de vencimento e vendas" />
          <ConfigItem 
            icon={theme === 'dark' ? Sun : Moon} 
            label="Tema Escuro" 
            description={theme === 'dark' ? 'Ativado' : 'Desativado'}
            onClick={toggleTheme}
            value={theme === 'dark' ? 'ON' : 'OFF'}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Segurança</h3>
        <div className="flex flex-col gap-2">
          <ConfigItem icon={Shield} label="Privacidade" description="Gerenciar seus dados e acessos" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Ajuda</h3>
        <div className="flex flex-col gap-2">
          <ConfigItem icon={HelpCircle} label="Suporte" description="Falar com nossa equipe técnica" />
        </div>
      </section>

      <div className="mt-4">
        <button
          onClick={logout}
          className="btn-secondary flex items-center justify-center gap-2 border-red-100 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 h-14 w-full"
        >
          <LogOut size={20} />
          Sair da Conta
        </button>
      </div>

      <div className="text-center text-[10px] text-gray-400 uppercase tracking-[0.2em] mt-8">
        Gestão Perfumaria v1.0.0
      </div>
    </div>
  );
};
