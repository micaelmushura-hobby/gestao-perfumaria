import React, { useEffect, useState } from 'react';
import { Search, Filter, CheckCircle2, Circle, MessageSquare, AlertCircle, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useBaserow } from '../hooks/useBaserow';
import { TABLES } from '../services/api';
import { Parcela, Cliente, Venda } from '../types';
import { formatCurrency, formatDate, isOverdue, getSelectValue, getErrorMessage } from '../utils/formatters';
import { cn } from '../lib/utils';

const EMOJIS = {
  compra: '🛍️',
  total: '💰',
  resumo: '📌',
  pago: '✅',
  vencido: '⚠️',
  calendario: '📅',
};

export const Parcelas: React.FC = () => {
  const [searchParams] = useSearchParams();
  const filterType = searchParams.get('filter');
  
  const { getRows, updateRow, deleteRow, loading } = useBaserow();
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [filter, setFilter] = useState<'Todas' | 'Pagas' | 'Em Aberto' | 'Vencidas' | 'Pendentes'>('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
     if (filterType === 'vencidas') setFilter('Vencidas');
     if (filterType === 'pagas') setFilter('Pagas');
     if (filterType === 'em_aberto') setFilter('Em Aberto');
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
    const isPaying = newStatus === 'Pago';
    const pago_em = isPaying ? new Date().toISOString().split('T')[0] : null;

    try {
      await updateRow(TABLES.PARCELAS, parcela.id, {
        status: newStatus,
        pago_em: pago_em,
      });
      
      // Update local state
      setParcelas(prev => prev.map(p => 
        p.id === parcela.id 
          ? { ...p, status: newStatus, pago_em: pago_em } 
          : p
      ));
    } catch (err: any) {
      console.error(err);
      alert(getErrorMessage(err));
    }
  };

  const handleDeleteSale = async (vendaId: number) => {
    if (!window.confirm("Tem certeza que deseja excluir esta venda? Essa ação também excluirá as parcelas relacionadas.")) {
      return;
    }

    setIsDeleting(true);
    try {
      // 1. Get all parcels for this sale
      const relatedInstallments = parcelas.filter(p => Number(p.venda_id) === vendaId);

      // 2. Delete all related parcels
      if (relatedInstallments.length > 0) {
        await Promise.all(relatedInstallments.map(p => deleteRow(TABLES.PARCELAS, p.id)));
      }

      // 3. Delete the sale itself
      await deleteRow(TABLES.VENDAS, vendaId);

      alert("Venda excluída com sucesso.");
      loadParcelas();
    } catch (err: any) {
      console.error('Error deleting sale:', err);
      alert(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredParcelas = parcelas.filter(p => {
    const matchesSearch = p.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase());
    const statusVal = getSelectValue(p.status);
    const overdue = isOverdue(p.vencimento, statusVal);
    
    if (filter === 'Pagas') return matchesSearch && statusVal === 'Pago';
    if (filter === 'Em Aberto') return matchesSearch && statusVal !== 'Pago' && !overdue;
    if (filter === 'Vencidas') return matchesSearch && overdue;
    if (filter === 'Pendentes') return matchesSearch && statusVal !== 'Pago';
    return matchesSearch;
  });

  const sendWhatsAppCollection = async (parcela: Parcela) => {
    try {
      // Find the sale to get products and client info
      const results = await Promise.allSettled([
        getRows<Venda>(TABLES.VENDAS, {
          filters: JSON.stringify({
            filter_type: 'AND',
            filters: [{ field: 'id', type: 'equal', value: parcela.venda_id.toString() }]
          })
        }),
        getRows<Parcela>(TABLES.PARCELAS, {
          filters: JSON.stringify({
            filter_type: 'AND',
            filters: [{ field: 'venda_id', type: 'equal', value: parcela.venda_id.toString() }]
          })
        })
      ]);
      
      const vendaResp = results[0].status === 'fulfilled' ? results[0].value : { results: [], count: 0 };
      const resp = results[1].status === 'fulfilled' ? results[1].value : { results: [], count: 0 };

      if (vendaResp.results.length === 0) return;
      const venda = vendaResp.results[0];
      
      const allP = resp.results.sort((a, b) => Number(a.numero_parcela) - Number(b.numero_parcela));
      
      // Fetch cliente to get phone
      const clienteResp = await getRows<Cliente>(TABLES.CLIENTES, {
        filters: JSON.stringify({
          filter_type: 'AND',
          filters: [{ field: 'id', type: 'equal', value: venda.cliente_id.toString() }]
        })
      });
      
      if (clienteResp.results.length === 0) return;
      const cliente = clienteResp.results[0];

      const fmt = (val: number) => formatCurrency(val).replace(/\u00A0/g, ' ');

      let message = `Olá, *${cliente.nome}*! Tudo bem?\n\nSegue o resumo da sua compra:\n\n`;
      
      const productLines = (venda.produto || '').split('\n');
      if (productLines.length > 1) {
        message += `${EMOJIS.compra} *Itens da compra*\n`;
        productLines.forEach(line => {
          const parts = line.split(' = ');
          if (parts.length === 2) {
            message += `• ${parts[0]} = R$ ${parts[1]}\n`;
          } else {
            message += `• ${line}\n`;
          }
        });
      } else {
        const parts = venda.produto.split(' = ');
        if (parts.length === 2) {
          message += `${EMOJIS.compra} *${parts[0]}*\n`;
        } else {
          message += `${EMOJIS.compra} *${venda.produto}*\n`;
        }
      }
      
      message += `${EMOJIS.total} Total: ${fmt(venda.valor_venda)}\n\n`;
      
      allP.forEach(p => {
        let icon = '';
        const sVal = getSelectValue(p.status);
        if (sVal === 'Pago') icon = ` ${EMOJIS.pago}`;
        else if (isOverdue(p.vencimento, sVal)) icon = ` ${EMOJIS.vencido}`;

        message += `${p.numero_parcela}. ${formatDate(p.vencimento)} = ${fmt(p.valor_parcela)}${icon}\n`;
      });

      message += `\nQualquer dúvida, fico à disposição.`;

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
          {(['Todas', 'Pagas', 'Em Aberto', 'Vencidas', 'Pendentes'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                filter === f 
                  ? "bg-brand-primary dark:bg-brand-accent text-white dark:text-black border-brand-primary dark:border-brand-accent" 
                  : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-800 shadow-sm"
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
             <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))
        ) : filteredParcelas.length > 0 ? (
          filteredParcelas.map((parcela) => {
            const statusVal = getSelectValue(parcela.status);
            const isPaid = statusVal === 'Pago';
            const overdue = isOverdue(parcela.vencimento, statusVal);
            
            return (
              <div key={parcela.id} className={cn(
                "card flex flex-col gap-3 transition-all",
                isPaid ? "opacity-70 grayscale-[0.5]" : "",
                overdue && !isPaid ? "border-red-100 dark:border-red-900/30 bg-red-50/10 dark:bg-red-900/10" : ""
              )}>
                <div className="flex justify-between items-start">
                   <div className="flex flex-col">
                      <span className="font-bold text-md dark:text-gray-100">{parcela.cliente_nome}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">#{parcela.venda_id} • Parcela {parcela.numero_parcela}</span>
                   </div>
                   <div className="flex flex-col items-end">
                      <span className={cn(
                         "text-sm font-bold uppercase tracking-wider",
                         overdue && !isPaid ? "text-red-600 dark:text-red-400" : "text-gray-400 dark:text-gray-500"
                      )}>
                        {overdue && !isPaid ? "⚠️ Vencido" : formatDate(parcela.vencimento)}
                      </span>
                      <span className="text-xl font-display font-bold dark:text-white">{formatCurrency(parcela.valor_parcela)}</span>
                   </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  {isPaid ? (
                    <button 
                      onClick={() => handleStatusChange(parcela, 'Em Aberto')}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700"
                    >
                      <Circle size={14} />
                      Voltar para Aberto
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleStatusChange(parcela, 'Pago')}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600 dark:bg-green-700 text-white rounded-xl text-xs font-bold border border-green-700 dark:border-green-800"
                    >
                      <CheckCircle2 size={14} />
                      Marcar Pago
                    </button>
                  )}

                  {!isPaid && (
                   <button 
                      onClick={() => sendWhatsAppCollection(parcela)}
                      className="w-12 h-10 flex items-center justify-center bg-brand-primary dark:bg-brand-accent text-brand-accent dark:text-black rounded-xl border border-brand-primary dark:border-brand-accent"
                    >
                      <MessageSquare size={18} />
                    </button>
                  )}

                  <button 
                    onClick={() => handleDeleteSale(Number(parcela.venda_id))}
                    disabled={isDeleting}
                    className="w-12 h-10 flex items-center justify-center bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50"
                    title="Excluir Venda"
                  >
                    <Trash2 size={18} />
                  </button>
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
