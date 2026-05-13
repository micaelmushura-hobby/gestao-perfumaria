import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Phone, Briefcase, History, TrendingUp, DollarSign, Wallet, ShoppingBag, Clock, CheckCircle2 } from 'lucide-react';
import { useBaserow } from '../../hooks/useBaserow';
import { TABLES } from '../../services/api';
import { Cliente, Venda, Parcela } from '../../types';
import { formatCurrency, formatPhone, formatDate, isOverdue } from '../../utils/formatters';
import { cn } from '../../lib/utils';

export const ClienteDetail: React.FC = () => {
  const { id } = useParams();
  const { getRows, loading } = useBaserow();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [stats, setStats] = useState({
    totalGasto: 0,
    totalPago: 0,
    totalPendente: 0,
    lucroGerado: 0,
  });

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      const [clienteData, vendasData, parcelasData] = await Promise.all([
        getRows<Cliente>(TABLES.CLIENTES, {
          filters: JSON.stringify({
            filter_type: 'AND',
            filters: [{ field: 'id', type: 'equal', value: id }],
          }),
        }),
        getRows<Venda>(TABLES.VENDAS, {
           filters: JSON.stringify({
            filter_type: 'AND',
            filters: [{ field: 'cliente_id', type: 'equal', value: id }],
          }),
        }),
        getRows<Parcela>(TABLES.PARCELAS, {
           filters: JSON.stringify({
            filter_type: 'AND',
            filters: [{ field: 'cliente_nome', type: 'equal', value: '' }], // We will filter locally or try to fix logic
          }),
        })
      ]);

      if (clienteData.results.length > 0) {
        const c = clienteData.results[0];
        setCliente(c);

        const vList = vendasData.results;
        setVendas(vList);
        
        // Relational fix for parcelas: filter by venda_id if needed, or by name match
        // For simplicity, let's assume we fetch all and filter by venda_id list
        const vIds = vList.map(v => v.id.toString());
        
        // Fetch parcelas for these sales specifically
        const allParcelasResponse = await getRows<Parcela>(TABLES.PARCELAS);
        const pList = allParcelasResponse.results.filter(p => vIds.includes(p.venda_id.toString()));
        setParcelas(pList);

        setStats({
          totalGasto: vList.reduce((acc, v) => acc + Number(v.valor_venda), 0),
          totalPago: pList.filter(p => p.status === 'Pago').reduce((acc, p) => acc + Number(p.valor_parcela), 0),
          totalPendente: pList.filter(p => p.status !== 'Pago').reduce((acc, p) => acc + Number(p.valor_parcela), 0),
          lucroGerado: vList.reduce((acc, v) => acc + Number(v.lucro), 0),
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const StatusBadge = ({ status, date, type }: { status: string; date: string; type: 'venda' | 'parcela' }) => {
    const overdue = isOverdue(date, status);
    
    if (status === 'Pago') return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Pago</span>;
    if (overdue) return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">⚠️ Vencido</span>;
    return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{status}</span>;
  };

  if (!cliente && loading) return <div className="h-full flex items-center justify-center py-20 animate-pulse">Carregando...</div>;
  if (!cliente) return <div>Cliente não encontrado.</div>;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-center justify-between">
        <Link to="/clientes" className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm text-gray-500">
          <ArrowLeft size={20} />
        </Link>
        <Link to={`/clientes/editar/${id}`} className="flex items-center gap-2 text-brand-accent font-bold">
          <Edit2 size={16} />
          Editar
        </Link>
      </div>

      <header className="flex flex-col items-center gap-3 py-4">
        <div className="w-20 h-20 bg-brand-primary text-white rounded-full flex items-center justify-center text-3xl font-display font-bold">
          {cliente.nome.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-3xl font-display font-bold text-center">{cliente.nome}</h2>
        <a 
          href={`https://wa.me/55${cliente.telefone}`} 
          target="_blank"
          className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-full text-sm font-bold border border-green-100"
        >
          <Phone size={16} />
          {formatPhone(cliente.telefone)}
        </a>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <div className="card flex flex-col gap-1 p-4">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <ShoppingBag size={10} /> Consumo Total
          </span>
          <span className="text-lg font-bold">{formatCurrency(stats.totalGasto)}</span>
        </div>
        <div className="card flex flex-col gap-1 p-4">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <TrendingUp size={10} /> Lucro Total
          </span>
          <span className="text-lg font-bold text-green-600">{formatCurrency(stats.lucroGerado)}</span>
        </div>
        <div className="card flex flex-col gap-1 p-4 border-l-4 border-l-green-500">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <CheckCircle2 size={10} /> Já Pago
          </span>
          <span className="text-lg font-bold">{formatCurrency(stats.totalPago)}</span>
        </div>
        <div className="card flex flex-col gap-1 p-4 border-l-4 border-l-amber-500">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <Clock size={10} /> Pendente
          </span>
          <span className="text-lg font-bold">{formatCurrency(stats.totalPendente)}</span>
        </div>
      </section>

      {cliente.observacao && (
        <section className="card bg-gray-50 border-none p-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Observações</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{cliente.observacao}</p>
        </section>
      )}

      <div className="flex flex-col gap-6 mt-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-lg font-display font-bold px-1">
            <History size={20} className="text-brand-accent" />
            Histórico de Vendas
          </div>
          
          <div className="flex flex-col gap-3">
            {vendas.length > 0 ? vendas.map(venda => (
              <div key={venda.id} className="card p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                    <span className="font-bold text-md">{venda.produto}</span>
                    <span className="text-xs text-gray-500">{venda.marca} • {formatDate(venda.criado_em)}</span>
                  </div>
                  <span className="font-bold">{formatCurrency(venda.valor_venda)}</span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-top border-gray-50">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">{venda.qtd_parcelas}x parcelas</span>
                  <StatusBadge status={venda.status} date={venda.criado_em} type="venda" />
                </div>
              </div>
            )) : (
              <p className="text-center py-4 text-gray-400 text-sm">Nenhuma venda registrada.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-lg font-display font-bold px-1">
            <DollarSign size={20} className="text-brand-accent" />
            Parcelas em Aberto
          </div>
          
          <div className="flex flex-col gap-3">
            {parcelas.filter(p => p.status !== 'Pago').length > 0 ? 
              parcelas.filter(p => p.status !== 'Pago').map(parcela => (
                <div key={parcela.id} className="card p-3 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-400 uppercase">Parc {parcela.numero_parcela} • Venc {formatDate(parcela.vencimento)}</span>
                    <span className="font-bold">{formatCurrency(parcela.valor_parcela)}</span>
                  </div>
                  <StatusBadge status={parcela.status} date={parcela.vencimento} type="parcela" />
                </div>
              )) : (
              <p className="text-center py-4 text-gray-400 text-sm">Nenhuma parcela pendente.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
