import React from 'react';
import { LogOut, User, Phone, Mail, Calendar, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatPhone } from '../utils/formatters';

export const Perfil: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const InfoItem = ({ icon: Icon, label, value }: any) => (
    <div className="flex items-center gap-4 p-4 border-b border-gray-50 last:border-0">
      <div className="bg-gray-100 p-2.5 rounded-xl text-gray-500">
        <Icon size={20} />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
        <span className="font-semibold text-gray-700">{value}</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-8 pb-12">
      <header className="flex flex-col items-center gap-4 py-6">
        <div className="w-24 h-24 bg-brand-primary text-white rounded-3xl flex items-center justify-center text-4xl font-display font-bold shadow-xl rotate-3">
          {user.nome.charAt(0).toUpperCase()}
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-display font-bold">{user.nome}</h2>
          <span className="text-brand-accent bg-brand-accent/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mt-2 inline-block">
            Revendedor Platinum
          </span>
        </div>
      </header>

      <section className="card p-0 overflow-hidden">
        <InfoItem icon={User} label="Nome" value={user.nome} />
        <InfoItem icon={Mail} label="E-mail" value={user.email} />
        <InfoItem icon={Phone} label="WhatsApp" value={formatPhone(user.telefone)} />
        <InfoItem icon={Calendar} label="Membro desde" value={formatDate(user.criado_em)} />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1">Links Úteis</h3>
        <div className="grid grid-cols-1 gap-2">
          <a 
            href={user.whatsapp_link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="card flex items-center justify-between p-4 active:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg text-green-600">
                <ExternalLink size={20} />
              </div>
              <span className="font-semibold">Meu WhatsApp Link</span>
            </div>
            <span className="text-xs text-gray-400">Ver</span>
          </a>
        </div>
      </section>

      <button
        onClick={logout}
        className="btn-secondary flex items-center justify-center gap-2 border-red-100 text-red-500 hover:bg-red-50 h-14 mt-4"
      >
        <LogOut size={20} />
        Sair da Conta
      </button>

      <div className="text-center text-[10px] text-gray-400 uppercase tracking-[0.2em] mt-8">
        Gestão Perfumaria v1.0.0
      </div>
    </div>
  );
};
