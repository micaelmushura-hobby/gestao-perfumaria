import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  PlusCircle,
  ShoppingBag
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBaserow } from '../hooks/useBaserow';
import { TABLES } from '../services/api';
import { Venda, Parcela } from '../types';
import { formatCurrency, isOverdue, getSelectValue } from '../utils/formatters';
import { cn } from '../lib/utils';

interface DashboardStats {
  faturamentoTotal: number;
  lucroTotal: number;
  totalRecebido: number;
  totalPendente: number;
  parcelasVencidas: number;
  parcelasAbertas: number;
  parcelasPagas: number;
  vendasMes: number;
}

export const Dashboard: React.FC = () => {
  const { getRows } = useBaserow();
  const [stats, setStats] = useState<DashboardStats>({
    faturamentoTotal: 0,
    lucroTotal: 0,
    totalRecebido: 0,
    totalPendente: 0,
    parcelasVencidas: 0,
    parcelasAbertas: 0,
    parcelasPagas: 0,
    vendasMes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Todas');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          getRows<Venda>(TABLES.VENDAS),
          getRows<Parcela>(TABLES.PARCELAS),
        ]);

        const vendasData = results[0].status === 'fulfilled' ? results[0].value : { results: [], count: 0 };
        const parcelasData = results[1].status === 'fulfilled' ? results[1].value : { results: [], count: 0 };

        const allVendas = vendasData.results || [];
        const allParcelas = parcelasData.results || [];

        // Apply filter if not "Todas"
        let filteredVendas = allVendas;
        let filteredParcelas = allParcelas;

        if (filter !== 'Todas') {
          if (filter === 'Pagas') {
            filteredParcelas = allParcelas.filter(p => getSelectValue(p.status) === 'Pago');
            // A sale is "Paga" if all its installments are "Pago"
            const vIdsWithOpenParcelas = new Set(allParcelas.filter(p => getSelectValue(p.status) !== 'Pago').map(p => p.venda_id));
            filteredVendas = allVendas.filter(v => !vIdsWithOpenParcelas.has(v.id));
          } else if (filter === 'Em Aberto') {
            filteredParcelas = allParcelas.filter(p => getSelectValue(p.status) === 'Em Aberto' || getSelectValue(p.status) === 'Pendente');
            const vIdsWithOpen = new Set(filteredParcelas.map(p => p.venda_id));
            filteredVendas = allVendas.filter(v => vIdsWithOpen.has(v.id));
          } else if (filter === 'Vencidas') {
            filteredParcelas = allParcelas.filter(p => isOverdue(p.vencimento, getSelectValue(p.status)));
            const vIdsWithVencidas = new Set(filteredParcelas.map(p => p.venda_id));
            filteredVendas = allVendas.filter(v => vIdsWithVencidas.has(v.id));
          } else if (filter === 'Pendentes') {
            filteredParcelas = allParcelas.filter(p => getSelectValue(p.status) !== 'Pago');
            const vIdsWithPendentes = new Set(filteredParcelas.map(p => p.venda_id));
            filteredVendas = allVendas.filter(v => vIdsWithPendentes.has(v.id));
          }
        }

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const newStats: DashboardStats = {
          faturamentoTotal: filteredVendas.reduce((acc, v) => acc + Number(v.valor_venda), 0),
          lucroTotal: filteredVendas.reduce((acc, v) => acc + Number(v.lucro), 0),
          totalRecebido: filteredParcelas.filter(p => getSelectValue(p.status) === 'Pago').reduce((acc, p) => acc + Number(p.valor_parcela), 0),
          totalPendente: filteredParcelas.filter(p => getSelectValue(p.status) !== 'Pago' && !isOverdue(p.vencimento, getSelectValue(p.status))).reduce((acc, p) => acc + Number(p.valor_parcela), 0),
          parcelasVencidas: filteredParcelas.filter(p => isOverdue(p.vencimento, getSelectValue(p.status))).reduce((acc, p) => acc + Number(p.valor_parcela), 0),
          parcelasAbertas: filteredParcelas.filter(p => getSelectValue(p.status) === 'Em Aberto' || getSelectValue(p.status) === 'Pendente').length,
          parcelasPagas: filteredParcelas.filter(p => getSelectValue(p.status) === 'Pago').length,
          vendasMes: filteredVendas.filter(v => {
            const date = new Date(v.criado_em);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
          }).length,
        };

        setStats(newStats);
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getRows, filter]);

  const StatCard = ({ title, value, icon: Icon, colorClass, to }: any) => (
    <Link to={to} className="card flex flex-col gap-2 relative overflow-hidden group">
      <div className={`absolute right-0 top-0 w-12 h-12 bg-current opacity-5 rounded-bl-3xl transition-transform group-hover:scale-110 ${colorClass}`} />
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</span>
        <Icon size={18} className={colorClass} />
      </div>
      <span className="text-xl font-bold">{typeof value === 'number' && !title.includes('Vendas') ? formatCurrency(value) : value}</span>
    </Link>
  );

  const filterOptions = ['Todas', 'Pagas', 'Em Aberto', 'Vencidas', 'Pendentes'];

  if (loading && stats.faturamentoTotal === 0) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-28 bg-gray-200 rounded-2xl w-full" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-display font-bold">Dashboard</h2>
          <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap gap-1">
            {filterOptions.map(opt => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  filter === opt ? "bg-white text-brand-primary shadow-sm" : "text-gray-500"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        
        <div className="bg-brand-primary text-white card border-none shadow-xl flex flex-col gap-4 p-6 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingUp size={120} />
           </div>
           <div className="z-10">
             <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Faturamento Total</span>
             <h3 className="text-4xl font-display font-bold mt-1">{formatCurrency(stats.faturamentoTotal)}</h3>
             <div className="flex items-center gap-2 mt-4 text-sm">
                <span className="text-brand-accent bg-brand-accent/20 px-2 py-0.5 rounded-md font-bold">
                  {formatCurrency(stats.lucroTotal)} de lucro
                </span>
             </div>
           </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <StatCard 
          title="Recebido" 
          value={stats.totalRecebido} 
          icon={CheckCircle2} 
          colorClass="text-green-600" 
          to="/parcelas?filter=pagas" 
        />
        <StatCard 
          title="Pendente" 
          value={stats.totalPendente} 
          icon={Clock} 
          colorClass="text-amber-600" 
          to="/parcelas?filter=em_aberto" 
        />
        <StatCard 
          title="Vencidas" 
          value={stats.parcelasVencidas} 
          icon={AlertCircle} 
          colorClass="text-red-600" 
          to="/parcelas?filter=vencidas" 
        />
        <StatCard 
          title="Vendas" 
          value={stats.vendasMes} 
          icon={ShoppingBag} 
          colorClass="text-brand-accent" 
          to="/vendas" 
        />
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-display font-bold">Ações Rápidas</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/vendas/nova" className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm active:bg-gray-50">
            <div className="bg-green-100 p-2 rounded-lg text-green-600">
              <PlusCircle size={24} />
            </div>
            <span className="font-semibold text-sm">Nova Venda</span>
          </Link>
          <Link to="/clientes/novo" className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm active:bg-gray-50">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <PlusCircle size={24} />
            </div>
            <span className="font-semibold text-sm">Novo Cliente</span>
          </Link>
        </div>
      </section>
    </div>
  );
};
