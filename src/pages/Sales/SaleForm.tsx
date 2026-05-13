import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Plus, ChevronDown } from 'lucide-react';
import { addMonths, format, parseISO } from 'date-fns';
import { useBaserow } from '../../hooks/useBaserow';
import { TABLES } from '../../services/api';
import { Cliente, Venda, Parcela } from '../../types';
import { parseDecimal } from '../../utils/formatters';

export const SaleForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addRow, updateRow, getRows, loading } = useBaserow();
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    cliente_id: '',
    produto: '',
    marca: '',
    custo: '',
    valor_venda: '',
    qtd_parcelas: '1',
    data_primeira_parcela: format(new Date(), 'yyyy-MM-dd'),
    status: 'Em Aberto',
  });

  const marcas = ['O Boticário', 'Natura', 'Eudora', 'Avon', 'Hinode', 'Mary Kay', 'Outro'];

  useEffect(() => {
    loadClientes();
    if (id) loadSale();
  }, [id]);

  useEffect(() => {
    if (!id) { // Only auto-generate if creating new sale
      generateInstallments();
    }
  }, [formData.qtd_parcelas, formData.valor_venda, formData.data_primeira_parcela]);

  const generateInstallments = () => {
    const count = parseInt(formData.qtd_parcelas) || 1;
    const total = parseDecimal(formData.valor_venda) || 0;
    const baseDateStr = formData.data_primeira_parcela;
    
    if (!baseDateStr) return;
    const baseDate = parseISO(baseDateStr);
    if (isNaN(baseDate.getTime())) return;

    const valuePerInstallment = Number((total / count).toFixed(2));
    const items = [];
    let sum = 0;

    for (let i = 1; i <= count; i++) {
      const isLast = i === count;
      const val = isLast ? Number((total - sum).toFixed(2)) : valuePerInstallment;
      sum += val;
      
      items.push({
        numero_parcela: i,
        valor_parcela: val.toFixed(2).replace('.', ','),
        vencimento: format(addMonths(baseDate, i - 1), 'yyyy-MM-dd'),
        status: 'Em Aberto'
      });
    }
    setInstallments(items);
  };

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
          data_primeira_parcela: format(parseISO(v.criado_em), 'yyyy-MM-dd'), 
          status: v.status,
        });

        // Load existing installments
        const pResp = await getRows<Parcela>(TABLES.PARCELAS, {
          filters: JSON.stringify({
            filter_type: 'AND',
            filters: [{ field: 'venda_id', type: 'equal', value: id }],
          })
        });
        setInstallments(pResp.results.map(p => ({
          ...p,
          valor_parcela: p.valor_parcela.toString().replace('.', ',')
        })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInstallmentChange = (index: number, field: string, value: string) => {
    const newInstallments = [...installments];
    newInstallments[index] = { ...newInstallments[index], [field]: value };
    setInstallments(newInstallments);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseDecimal(formData.custo);
    const saleValue = parseDecimal(formData.valor_venda);
    const profit = saleValue - cost;
    const installmentsCount = parseInt(formData.qtd_parcelas);
    
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

        // Update installments
        for (const p of installments) {
          if (p.id) {
            await updateRow(TABLES.PARCELAS, p.id, {
              valor_parcela: parseDecimal(p.valor_parcela),
              vencimento: p.vencimento,
              status: p.status,
            });
          }
        }
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
          // Save generated installments
          for (const p of installments) {
            await addRow(TABLES.PARCELAS, {
              venda_id: newVenda.id,
              cliente_nome: selectedCliente?.nome || '',
              numero_parcela: p.numero_parcela,
              valor_parcela: parseDecimal(p.valor_parcela),
              vencimento: p.vencimento,
              status: p.status,
              pago_em: p.status === 'Pago' ? format(new Date(), 'yyyy-MM-dd') : null,
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
        <Link to="/vendas" className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm text-gray-500 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-2xl font-display font-bold text-gray-800">
          {id ? 'Editar Venda' : 'Lançar Nova Venda'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-20">
        <div className="card flex flex-col gap-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1">Informações do Cliente</h3>
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
        </div>

        <div className="card flex flex-col gap-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1">Detalhes do Produto</h3>
          
          <div className="flex flex-col gap-1">
            <label className="label">Marca</label>
            <div className="relative">
              <select
                className="input-field appearance-none pr-10"
                value={formData.marca}
                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                required
              >
                <option value="">Selecione a marca...</option>
                {marcas.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="label">Produto / Fragrância</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ex: Floratta Rose 100ml"
              value={formData.produto}
              onChange={(e) => setFormData({ ...formData, produto: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="card flex flex-col gap-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1">Valores e Parcelamento</h3>
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
                <label className="label">Venda (R$)</label>
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
                <label className="label">Parcelas</label>
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
              {!id && (
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
              )}
          </div>
        </div>

        {installments.length > 0 && (
          <div className="flex flex-col gap-3">
             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1">Controle de Parcelas</h3>
             <div className="flex flex-col gap-2">
                {installments.map((p, idx) => (
                  <div key={idx} className="card p-4 flex flex-col gap-3 border-l-4 border-l-brand-accent">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-400">PARCELA {p.numero_parcela}</span>
                      <select 
                        className="text-[10px] font-bold uppercase bg-gray-100 rounded px-2 py-1 outline-none"
                        value={p.status}
                        onChange={(e) => handleInstallmentChange(idx, 'status', e.target.value)}
                      >
                        <option value="Em Aberto">Em Aberto</option>
                        <option value="Pago">Pago</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="text" 
                        className="input-field py-2 text-sm"
                        value={p.valor_parcela}
                        placeholder="Valor"
                        onChange={(e) => handleInstallmentChange(idx, 'valor_parcela', e.target.value)}
                      />
                      <input 
                        type="date" 
                        className="input-field py-2 text-sm"
                        value={p.vencimento}
                        onChange={(e) => handleInstallmentChange(idx, 'vencimento', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        <div className="sticky bottom-6 mt-4">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full h-16 flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-transform"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save size={24} />
                <span className="text-lg font-bold">Salvar Venda</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
