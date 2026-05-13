import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Phone, Briefcase, History, TrendingUp, DollarSign, Wallet, ShoppingBag, Clock, CheckCircle2, MessageSquare } from 'lucide-react';
import { useBaserow } from '../../hooks/useBaserow';
import { TABLES } from '../../services/api';
import { Cliente, Venda, Parcela } from '../../types';
import { formatCurrency, formatPhone, formatDate, isOverdue, getSelectValue } from '../../utils/formatters';
import { cn } from '../../lib/utils';

export const ClienteDetail: React.FC = () => {
  const { id } = useParams();
  const { getRows, updateRow, loading: baserowLoading } = useBaserow();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalGasto: 0,
    totalPago: 0,
    totalPendente: 0,
    lucroGerado: 0,
    parcelasAbertas: 0,
    parcelasPagas: 0,
    parcelasVencidas: 0,
  });

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
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
          order_by: '-criado_em'
        }),
        getRows<Parcela>(TABLES.PARCELAS, {
           filters: JSON.stringify({
            filter_type: 'AND',
            filters: [{ field: 'user_id', type: 'equal', value: '' }], 
          }),
          order_by: 'vencimento'
        })
      ]);

      const clienteData = results[0].status === 'fulfilled' ? results[0].value : { results: [], count: 0 };
      const vendasData = results[1].status === 'fulfilled' ? results[1].value : { results: [], count: 0 };
      const parcelasData = results[2].status === 'fulfilled' ? results[2].value : { results: [], count: 0 };

      if (clienteData.results && clienteData.results.length > 0) {
        const c = clienteData.results[0];
        setCliente(c);

        const vList = vendasData.results || [];
        setVendas(vList);
        
        const vIds = vList.map(v => v.id);
        const pList = (parcelasData.results || []).filter(p => vIds.includes(Number(p.venda_id)));
        setParcelas(pList);

        setStats({
          totalGasto: vList.reduce((acc, v) => acc + Number(v.valor_venda), 0),
          totalPago: pList.filter(p => getSelectValue(p.status) === 'Pago').reduce((acc, p) => acc + Number(p.valor_parcela), 0),
          totalPendente: pList.filter(p => getSelectValue(p.status) !== 'Pago').reduce((acc, p) => acc + Number(p.valor_parcela), 0),
          lucroGerado: vList.reduce((acc, v) => acc + Number(v.lucro), 0),
          parcelasAbertas: pList.filter(p => getSelectValue(p.status) !== 'Pago' && !isOverdue(p.vencimento, getSelectValue(p.status))).length,
          parcelasPagas: pList.filter(p => getSelectValue(p.status) === 'Pago').length,
          parcelasVencidas: pList.filter(p => isOverdue(p.vencimento, getSelectValue(p.status))).length,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (parcela: Parcela) => {
    const currentStatus = getSelectValue(parcela.status);
    const newStatus = currentStatus === 'Pago' ? 'Em Aberto' : 'Pago';
    const pago_em = newStatus === 'Pago' ? new Date().toISOString() : null;
    
    try {
      await updateRow(TABLES.PARCELAS, parcela.id, {
        status: newStatus,
        pago_em: pago_em
      });
      await loadData();
    } catch (err: any) {
      console.error(err);
      const message = err.response?.data?.detail || err.response?.data?.message || err.message || 'Erro ao atualizar status';
      alert(message);
    }
  };

  const generateWhatsAppMessage = () => {
    if (!cliente) return '';

    let message = '';
    
    vendas.forEach((venda, idx) => {
      const vendaParcelas = parcelas.filter(p => Number(p.venda_id) === venda.id).sort((a, b) => a.numero_parcela - b.numero_parcela);
      
      message += `*${venda.produto}* = ${formatCurrency(venda.valor_venda)}\n`;
      message += `Total 🟰 ${formatCurrency(venda.valor_venda)}\n\n`;
      
      vendaParcelas.forEach(p => {
        let icon = '';
        const statusVal = getSelectValue(p.status);
        if (statusVal === 'Pago') icon = ' ✅';
        else if (isOverdue(p.vencimento, statusVal)) icon = ' ⚠️';
        else icon = ' ⏳';

        message += `${p.numero_parcela}. ${formatDate(p.vencimento)} = ${formatCurrency(p.valor_parcela)}${icon}\n`;
      });

      if (idx < vendas.length - 1) {
        message += '\n------------------\n\n';
      }
    });

    return encodeURIComponent(message);
  };

  const StatusBadge = ({ status, date }: { status: any; date: string }) => {
    const val = getSelectValue(status);
    const overdue = isOverdue(date, val);
    
    if (val === 'Pago') return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Pago</span>;
    if (overdue) return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">⚠️ Vencido</span>;
    return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{val}</span>;
  };

  if (loading && !cliente) return <div className="h-full flex items-center justify-center py-20 text-gray-500 font-bold animate-pulse">Carregando histórico...</div>;
  if (!cliente) return <div className="p-10 text-center">Cliente não encontrado.</div>;

  return (
    <div className="flex flex-col gap-6 pb-20">
      <div className="flex items-center justify-between">
        <Link to="/clientes" className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm text-gray-500 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <Link to={`/clientes/editar/${id}`} className="flex items-center gap-2 text-brand-accent font-bold bg-brand-accent/10 px-3 py-1.5 rounded-lg">
          <Edit2 size={16} />
          Editar Perfil
        </Link>
      </div>

      <header className="flex flex-col items-center gap-3 py-4">
        <div className="w-20 h-20 bg-brand-primary text-white rounded-full flex items-center justify-center text-3xl font-display font-bold shadow-lg">
          {cliente.nome.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-3xl font-display font-bold text-center text-gray-800">{cliente.nome}</h2>
        <div className="flex gap-2">
          <a 
            href={`https://wa.me/55${cliente.telefone}`} 
            target="_blank"
            className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-full text-sm font-bold border border-green-100 active:scale-95 transition-transform"
          >
            <Phone size={16} />
            {formatPhone(cliente.telefone)}
          </a>
          <a 
            href={`https://wa.me/55${cliente.telefone}?text=${generateWhatsAppMessage()}`} 
            target="_blank"
            className="flex items-center gap-2 text-white bg-green-500 px-4 py-2 rounded-full text-sm font-bold shadow-md active:scale-95 transition-transform"
          >
            <MessageSquare size={16} />
            Cobranca
          </a>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <div className="card flex flex-col gap-1 p-4">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <ShoppingBag size={10} /> Consumo Total
          </span>
          <span className="text-lg font-bold text-gray-700">{formatCurrency(stats.totalGasto)}</span>
        </div>
        <div className="card flex flex-col gap-1 p-4">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <TrendingUp size={10} /> Lucro Gerado
          </span>
          <span className="text-lg font-bold text-brand-primary">{formatCurrency(stats.lucroGerado)}</span>
        </div>
        <div className="card flex flex-col gap-1 p-4 border-l-4 border-l-green-500">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <CheckCircle2 size={10} /> Total Pago
          </span>
          <span className="text-lg font-bold text-green-600">{formatCurrency(stats.totalPago)}</span>
        </div>
        <div className="card flex flex-col gap-1 p-4 border-l-4 border-l-amber-500">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <Clock size={10} /> Valor Pendente
          </span>
          <span className="text-lg font-bold text-amber-600">{formatCurrency(stats.totalPendente)}</span>
        </div>
      </section>

      {cliente.observacao && (
        <section className="card bg-gray-50 border-none p-4">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Observações</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{cliente.observacao}</p>
        </section>
      )}

      <div className="flex flex-col gap-6 mt-4">
        <h3 className="flex items-center gap-2 text-xl font-display font-bold px-1 text-gray-800">
          <History size={22} className="text-brand-accent" />
          Histórico de Compras
        </h3>
        
        <div className="flex flex-col gap-8">
          {vendas.length > 0 ? vendas.map(venda => {
            const vendaParcelas = parcelas.filter(p => Number(p.venda_id) === venda.id).sort((a, b) => a.numero_parcela - b.numero_parcela);
            
            return (
              <div key={venda.id} className="flex flex-col gap-3">
                <div className="card p-4 bg-white border-brand-primary shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-5 italic font-bold">SALE</div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-lg text-gray-800 leading-tight">{venda.produto}</span>
                      <span className="text-xs font-bold text-brand-accent mt-1">{getSelectValue(venda.marca)}</span>
                      <span className="text-[10px] text-gray-400 uppercase mt-1">{formatDate(venda.criado_em)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-lg text-brand-primary">{formatCurrency(venda.valor_venda)}</span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">Total da Venda</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                    <div className="flex gap-2">
                       <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{venda.qtd_parcelas}x Parcelas</span>
                       <span className="bg-blue-50 text-blue-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase">+{formatCurrency(venda.lucro)} Lucro</span>
                    </div>
                    <StatusBadge status={venda.status} date={venda.criado_em} />
                  </div>
                </div>

                <div className="pl-4 flex flex-col gap-2">
                   <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Parcelas desta compra</h4>
                   {vendaParcelas.map(p => (
                     <div key={p.id} className="card p-3 flex items-center justify-between bg-gray-50 border-none shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                            getSelectValue(p.status) === 'Pago' ? "bg-green-100 text-green-600" : "bg-brand-accent/10 text-brand-accent"
                          )}>
                            {p.numero_parcela}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Venc. {formatDate(p.vencimento)}</span>
                            <span className="font-bold text-gray-700">{formatCurrency(p.valor_parcela)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={p.status} date={p.vencimento} />
                          <button 
                            onClick={() => handleToggleStatus(p)}
                            className={cn(
                              "p-2 rounded-lg transition-colors",
                              getSelectValue(p.status) === 'Pago' ? "text-amber-500 bg-amber-50" : "text-green-600 bg-green-50"
                            )}
                          >
                            {getSelectValue(p.status) === 'Pago' ? <Clock size={16} /> : <CheckCircle2 size={16} />}
                          </button>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            );
          }) : (
            <div className="card py-10 flex flex-col items-center justify-center text-gray-400 gap-2 opacity-50">
              <ShoppingBag size={40} />
              <p className="font-bold">Nenhuma compra registrada.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
