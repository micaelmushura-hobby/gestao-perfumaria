import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Plus, Phone, Calendar, Briefcase, Search, Edit2, Trash2 } from 'lucide-react';
import { useBaserow } from '../../hooks/useBaserow';
import { TABLES } from '../../services/api';
import { Venda } from '../../types';
import { formatCurrency, formatDate, getSelectValue, getErrorMessage } from '../../utils/formatters';

export const SaleList: React.FC = () => {
  const { getRows, deleteRow, loading } = useBaserow();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadVendas();
  }, [getRows]);

  const loadVendas = async () => {
    try {
      const data = await getRows<Venda>(TABLES.VENDAS, {
        order_by: '-criado_em',
      });
      setVendas(data.results);
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
      const parcelsResp = await getRows<any>(TABLES.PARCELAS, {
        filters: JSON.stringify({
          filter_type: 'AND',
          filters: [{ field: 'venda_id', type: 'equal', value: vendaId.toString() }],
        }),
      });

      // 2. Delete all related parcels
      if (parcelsResp.results && parcelsResp.results.length > 0) {
        await Promise.all(parcelsResp.results.map((p: any) => deleteRow(TABLES.PARCELAS, p.id)));
      }

      // 3. Delete the sale itself
      await deleteRow(TABLES.VENDAS, vendaId);

      alert("Venda excluída com sucesso.");
      loadVendas();
    } catch (err: any) {
      console.error('Error deleting sale:', err);
      alert(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredVendas = vendas.filter(v => 
    v.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.produto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const StatusBadge = ({ status }: { status: any }) => {
    const val = getSelectValue(status);
    const colors: any = {
      'Pago': 'bg-green-100 text-green-700',
      'Pendente': 'bg-amber-100 text-amber-700',
      'Em Aberto': 'bg-blue-100 text-blue-700',
      'Parcial': 'bg-purple-100 text-purple-700',
    };
    return (
      <span className={`${colors[val] || 'bg-gray-100'} px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider`}>
        {val}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold dark:text-white">Vendas</h2>
          <Link to="/vendas/nova" className="btn-primary flex items-center gap-2 px-4 py-2">
            <Plus size={18} />
            Nova
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar produto ou cliente..."
            className="input-field pl-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {loading && vendas.length === 0 ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
          ))
        ) : filteredVendas.length > 0 ? (
          filteredVendas.map((venda) => (
            <div key={venda.id} className="card p-5 flex flex-col gap-4 dark:bg-gray-900 border-none">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <h3 className="font-bold text-lg leading-tight dark:text-white">{venda.produto}</h3>
                  <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
                    <Briefcase size={14} />
                    <span>{getSelectValue(venda.marca)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                   <div className="flex gap-2">
                     <Link to={`/vendas/editar/${venda.id}`} className="p-1 px-2 text-brand-accent bg-brand-accent/10 rounded flex items-center gap-1 text-[10px] font-bold uppercase transition-colors hover:bg-brand-accent/20">
                       <Edit2 size={12} />
                       Editar
                     </Link>
                     <button 
                       onClick={() => handleDeleteSale(venda.id)}
                       disabled={isDeleting}
                       className="p-1 px-2 text-red-500 bg-red-50 dark:bg-red-950/30 rounded flex items-center gap-1 text-[10px] font-bold uppercase transition-colors hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50"
                     >
                       <Trash2 size={12} />
                       Excluir
                     </button>
                     <StatusBadge status={venda.status} />
                   </div>
                   <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider">{formatDate(venda.criado_em)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-y border-gray-50 dark:border-gray-800">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valor</span>
                    <span className="font-bold text-xl dark:text-white">{formatCurrency(venda.valor_venda)}</span>
                 </div>
                 <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lucro</span>
                    <span className="font-bold text-green-600 dark:text-green-400">+{formatCurrency(venda.lucro)}</span>
                 </div>
              </div>

              <div className="flex items-center justify-between">
                <Link 
                  to={`/clientes/${venda.cliente_id}`}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-brand-accent transition-colors"
                >
                  <Phone size={14} className="text-brand-accent" />
                  {venda.cliente_nome}
                </Link>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                  {venda.qtd_parcelas} parcelas
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 flex flex-col items-center gap-3">
             <div className="bg-gray-100 p-4 rounded-full text-gray-400">
                <ShoppingBag size={40} />
             </div>
             <p className="text-gray-500">Nenhuma venda registrada.</p>
          </div>
        )}
      </div>
    </div>
  );
};
