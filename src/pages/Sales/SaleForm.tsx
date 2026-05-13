import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Plus, ChevronDown } from 'lucide-react';
import { addMonths, format, parseISO } from 'date-fns';
import { useBaserow } from '../../hooks/useBaserow';
import { TABLES } from '../../services/api';
import { Cliente, Venda } from '../../types';
import { parseDecimal } from '../../utils/formatters';

export const SaleForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addRow, updateRow, getRows, loading } = useBaserow();
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [formData, setFormData] = useState({
    cliente_id: '',
    produto: '',
    marca: '',
    custo: '',
    valor_venda: '',
    qtd_parcelas: '1',
    data_primeira_parcela: format(new Date(), 'yyyy-MM-dd'),
    status: 'Pendente',
  });

  useEffect(() => {
    loadClientes();
    if (id) loadSale();
  }, [id]);

  const loadClientes = async () => {
    try {
      const data = await getRows<Cliente>(TABLES.CLIENTES, { order_by: 'nome' });
      setClientes(data.results);
    } catch (err) {
      console.error(err);
    }
  };

  const loadSale = async () => {
    try {
      const resp = await getRows<Venda>(TABLES.VENDAS, {
        filters: JSON.stringify({
          filter_type: 'AND',
          filters: [{ field: 'id', type: 'equal', value: id }],
        }),
      });
      if (resp.results.length > 0) {
        const v = resp.results[0];
        setFormData({
          cliente_id: v.cliente_id.toString(),
          produto: v.produto,
          marca: v.marca,
          custo: v.custo.toString().replace('.', ','),
          valor_venda: v.valor_venda.toString().replace('.', ','),
          qtd_parcelas: v.qtd_parcelas.toString(),
          data_primeira_parcela: format(parseISO(v.criado_em), 'yyyy-MM-dd'), // Fallback
          status: v.status,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseDecimal(formData.custo);
    const saleValue = parseDecimal(formData.valor_venda);
    const profit = saleValue - cost;
    const installmentsCount = parseInt(formData.qtd_parcelas);
    const installmentValue = saleValue / installmentsCount;
    
    const selectedCliente = clientes.find(c => c.id.toString() === formData.cliente_id);

    try {
      if (id) {
        await updateRow(TABLES.VENDAS, parseInt(id), {
          cliente_id: parseInt(formData.cliente_id),
          cliente_nome: selectedCliente?.nome || '',
          produto: formData.produto,
          marca: formData.marca,
          custo: cost,
          valor_venda: saleValue,
          lucro: profit,
          qtd_parcelas: installmentsCount,
          status: formData.status,
        });
        navigate('/vendas');
      } else {
        // Create Venda
        const newVenda = await addRow<Venda>(TABLES.VENDAS, {
          cliente_id: parseInt(formData.cliente_id),
          cliente_nome: selectedCliente?.nome || '',
          produto: formData.produto,
          marca: formData.marca,
          custo: cost,
          valor_venda: saleValue,
          lucro: profit,
          qtd_parcelas: installmentsCount,
          status: 'Em Aberto',
        });

        if (newVenda) {
          // Generate Installments
          const baseDate = parseISO(formData.data_primeira_parcela);
          for (let i = 1; i <= installmentsCount; i++) {
            const dueDate = addMonths(baseDate, i - 1);
            await addRow(TABLES.PARCELAS, {
              venda_id: newVenda.id,
              cliente_nome: selectedCliente?.nome || '',
              numero_parcela: i,
              valor_parcela: installmentValue,
              vencimento: format(dueDate, "yyyy-MM-dd"),
              status: 'Em Aberto',
              pago_em: null,
            });
          }
        }
        navigate('/vendas');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link to="/vendas" className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm text-gray-500">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-2xl font-display font-bold">
          {id ? 'Editar Venda' : 'Nova Venda'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-12">
        <div className="card flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="label">Cliente</label>
            <div className="relative">
              <select
                className="input-field appearance-none pr-10"
                value={formData.cliente_id}
                onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                required
              >
                <option value="">Selecione um cliente...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="label">Produto</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ex: Floratta Rose 100ml"
              value={formData.produto}
              onChange={(e) => setFormData({ ...formData, produto: e.target.value })}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="label">Marca</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ex: O Boticário"
              value={formData.marca}
              onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="card flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="flex flex-col gap-1">
                <label className="label">Custo (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="input-field"
                  placeholder="0,00"
                  value={formData.custo}
                  onChange={(e) => setFormData({ ...formData, custo: e.target.value })}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="label">Valor Venda (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="input-field"
                  placeholder="0,00"
                  value={formData.valor_venda}
                  onChange={(e) => setFormData({ ...formData, valor_venda: e.target.value })}
                  required
                />
              </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="flex flex-col gap-1">
                <label className="label">Qtd Parcelas</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  className="input-field"
                  value={formData.qtd_parcelas}
                  onChange={(e) => setFormData({ ...formData, qtd_parcelas: e.target.value })}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="label">1º Vencimento</label>
                <input
                  type="date"
                  className="input-field"
                  value={formData.data_primeira_parcela}
                  onChange={(e) => setFormData({ ...formData, data_primeira_parcela: e.target.value })}
                  required
                />
              </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full h-14 flex items-center justify-center gap-2 mt-4"
        >
          {loading ? 'Faturando...' : (
            <>
              <Save size={20} />
              Finalizar Venda
            </>
          )}
        </button>
      </form>
    </div>
  );
};
