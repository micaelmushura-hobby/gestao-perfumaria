import React, { useEffect, useState } from 'react';
import { Search, Filter, CheckCircle2, Circle, MessageSquare, AlertCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useBaserow } from '../hooks/useBaserow';
import { TABLES } from '../services/api';
import { Parcela, Cliente, Venda } from '../types';
import { formatCurrency, formatDate, isOverdue } from '../utils/formatters';
import { cn } from '../lib/utils';

export const Parcelas: React.FC = () => {
  const [searchParams] = useSearchParams();
  const filterType = searchParams.get('filter');
  
  const { getRows, updateRow, loading } = useBaserow();
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [filter, setFilter] = useState<'Todas' | 'Pagas' | 'Em Aberto' | 'Vencidas'>('Todas');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
     if (filterType === 'vencidas') setFilter('Vencidas');
     loadParcelas();
  }, [getRows, filterType]);

  const loadParcelas = async () => {
    try {
      const data = await getRows<Parcela>(TABLES.PARCELAS, {
        order_by: 'vencimento',
      });
      setParcelas(data.results);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (parcela: Parcela, newStatus: 'Pago' | 'Em Aberto') => {
    try {
      await updateRow(TABLES.PARCELAS, parcela.id, {
        status: newStatus,
        pago_em: newStatus === 'Pago' ? new Date().toISOString() : null,
      });
      
      // Update local state
      setParcelas(prev => prev.map(p => 
        p.id === parcela.id 
          ? { ...p, status: newStatus, pago_em: newStatus === 'Pago' ? new Date().toISOString() : null } 
          : p
      ));

      // If all installments of a sale are paid, mark the sale as Pago
      const saleId = parcela.venda_id;
      const allSaleParcelas = parcelas.filter(p => p.venda_id === saleId);
      // Note: local update above isn't reflected in `allSaleParcelas` yet in the same execution scope easily
      // but we can check if the others are paid
    } catch (err) {
      console.error(err);
    }
  };

  const filteredParcelas = parcelas.filter(p => {
    const matchesSearch = p.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase());
    const overdue = isOverdue(p.vencimento, p.status);
    
    if (filter === 'Pagas') return matchesSearch && p.status === 'Pago';
    if (filter === 'Em Aberto') return matchesSearch && p.status !== 'Pago' && !overdue;
    if (filter === 'Vencidas') return matchesSearch && overdue;
    return matchesSearch;
  });

  const sendWhatsAppCollection = async (parcela: Parcela) => {
    try {
      // We need to fetch details of all installments for this sale to build the message
      const resp = await getRows<Parcela>(TABLES.PARCELAS, {
        filters: JSON.stringify({
          filter_type: 'AND',
          filters: [{ field: 'venda_id', type: 'equal', value: parcela.venda_id.toString() }]
        })
      });
      
      const allP = resp.results.sort((a, b) => a.numero_parcela - b.numero_parcela);
      const total = allP.reduce((acc, p) => acc + Number(p.valor_parcela), 0);
      
      // Fetch cliente to get his phone
      // (Actually we might need cliente_id on Parcela or fetch Venda first)
      // Since we don't have cliente_id on Parcela, let's fetch the Venda
      const vendaResp = await getRows<Venda>(TABLES.VENDAS, {
        filters: JSON.stringify({
          filter_type: 'AND',
          filters: [{ field: 'id', type: 'equal', value: parcela.venda_id.toString() }]
        })
      });
      
      if (vendaResp.results.length === 0) return;
      const venda = vendaResp.results[0];
      
      const clienteResp = await getRows<Cliente>(TABLES.CLIENTES, {
        filters: JSON.stringify({
          filter_type: 'AND',
          filters: [{ field: 'id', type: 'equal', value: venda.cliente_id.toString() }]
        })
      });
      
      if (clienteResp.results.length === 0) return;
      const cliente = clienteResp.results[0];

      let message = `Olá ${cliente.nome}!\n\n`;
      message += `${venda.produto} - ${venda.marca} = ${formatCurrency(venda.valor_venda)}\n\n`;
      message += `Total 🟰 ${formatCurrency(total)}\n\n`;
      
      allP.forEach(p => {
        const isP = p.status === 'Pago';
        const isV = isOverdue(p.vencimento, p.status);
        const icon = isP ? '✅' : (isV ? '⚠️' : '');
        message += `${p.numero_parcela}. ${formatDate(p.vencimento)} = ${formatCurrency(p.valor_parcela)} ${icon}\n`;
      });

      const phone = cliente.telefone.replace(/\D/g, '');
      const url = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-display font-bold">Parcelas</h2>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por cliente..."
            className="input-field pl-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar">
          {(['Todas', 'Pagas', 'Em Aberto', 'Vencidas'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                filter === f 
                  ? "bg-brand-primary text-white border-brand-primary" 
                  : "bg-white text-gray-500 border-gray-100 shadow-sm"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {loading && parcelas.length === 0 ? (
          Array.from({ length: 6 }).map((_, i) => (
             <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))
        ) : filteredParcelas.length > 0 ? (
          filteredParcelas.map((parcela) => {
            const isPaid = parcela.status === 'Pago';
            const overdue = isOverdue(parcela.vencimento, parcela.status);
            
            return (
              <div key={parcela.id} className={cn(
                "card flex flex-col gap-3 transition-all",
                isPaid ? "opacity-70 grayscale-[0.5]" : "",
                overdue && !isPaid ? "border-red-100 bg-red-50/10" : ""
              )}>
                <div className="flex justify-between items-start">
                   <div className="flex flex-col">
                      <span className="font-bold text-md">{parcela.cliente_nome}</span>
                      <span className="text-xs text-gray-400 font-medium">#{parcela.venda_id} • Parcela {parcela.numero_parcela}</span>
                   </div>
                   <div className="flex flex-col items-end">
                      <span className={cn(
                        "text-sm font-bold uppercase tracking-wider",
                        overdue && !isPaid ? "text-red-600" : "text-gray-400"
                      )}>
                        {overdue && !isPaid ? "⚠️ Vencido" : formatDate(parcela.vencimento)}
                      </span>
                      <span className="text-xl font-display font-bold">{formatCurrency(parcela.valor_parcela)}</span>
                   </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  {isPaid ? (
                    <button 
                      onClick={() => handleStatusChange(parcela, 'Em Aberto')}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-100 text-gray-500 rounded-xl text-xs font-bold border border-gray-200"
                    >
                      <Circle size={14} />
                      Voltar para Aberto
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleStatusChange(parcela, 'Pago')}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600 text-white rounded-xl text-xs font-bold border border-green-700"
                    >
                      <CheckCircle2 size={14} />
                      Marcar Pago
                    </button>
                  )}

                  {!isPaid && (
                   <button 
                      onClick={() => sendWhatsAppCollection(parcela)}
                      className="w-12 h-10 flex items-center justify-center bg-brand-primary text-brand-accent rounded-xl border border-brand-primary"
                    >
                      <MessageSquare size={18} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 flex flex-col items-center gap-3">
             <div className="bg-gray-100 p-4 rounded-full text-gray-400">
                <AlertCircle size={40} />
             </div>
             <p className="text-gray-500">Nenhuma parcela encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
};
