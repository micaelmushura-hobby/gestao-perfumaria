import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Plus, ChevronDown } from 'lucide-react';
import { addMonths, format, parseISO } from 'date-fns';
import { useBaserow } from '../../hooks/useBaserow';
import { TABLES } from '../../services/api';
import { Cliente, Venda, Parcela } from '../../types';
import { parseDecimal, getSelectValue, getErrorMessage } from '../../utils/formatters';

export const SaleForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addRow, updateRow, getRows, deleteRow, loading } = useBaserow();
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([{ name: '', brand: '', cost: '', price: '' }]);
  const [formData, setFormData] = useState({
    cliente_id: '',
    qtd_parcelas: '1',
    data_primeira_parcela: format(new Date(), 'yyyy-MM-dd'),
    status: 'Em Aberto',
  });

  const marcas = ['O Boticário', 'Natura', 'Eudora', 'Avon', 'Hinode', 'Mary Kay', 'Outro'];

  useEffect(() => {
    loadClientes();
    if (id) loadSale();
  }, [id]);

  const totalSaleValue = products.reduce((acc, p) => acc + parseDecimal(p.price), 0);
  const totalCost = products.reduce((acc, p) => acc + parseDecimal(p.cost), 0);

  useEffect(() => {
    const count = parseInt(formData.qtd_parcelas) || 1;
    setInstallments(prev => {
      const total = totalSaleValue;
      const valPer = Number((total / count).toFixed(2));
      const newItems = [...prev];

      if (count > prev.length) {
        // Add new ones
        for (let i = prev.length + 1; i <= count; i++) {
          const baseDate = parseISO(formData.data_primeira_parcela);
          newItems.push({
            numero_parcela: i,
            valor_parcela: valPer.toFixed(2).replace('.', ','),
            vencimento: format(addMonths(isNaN(baseDate.getTime()) ? new Date() : baseDate, i - 1), 'yyyy-MM-dd'),
            status: 'Em Aberto'
          });
        }
      } else if (count < prev.length) {
        // Trim
        return prev.slice(0, count);
      }

      // If price changed, maybe redistribute? 
      // The instructions say "Parcelas são calculadas sobre o total da venda"
      // But manual edits should be preserved. Usually redistribution is only for new sales.
      // For existing sales, we'll only redistribute if they don't have many manual edits or if user changed price?
      // Actually, if it's a NEW sale, we redistribute. If EDITING, we might want to redistribute if they haven't manually changed much.
      // To keep it simple: if NOT editing, redistribute. If editing, only adjust last one? 
      // User says "Parcelamento deve ser feito sobre o valor total da venda".
      
      if (!id) {
         // Redistribution for new sale
         let sum = 0;
         for (let i = 0; i < newItems.length; i++) {
           const isLast = i === newItems.length - 1;
           const v = isLast ? Number((total - sum).toFixed(2)) : valPer;
           sum += v;
           newItems[i].valor_parcela = v.toFixed(2).replace('.', ',');
         }
      }

      return newItems;
    });
  }, [formData.qtd_parcelas, totalSaleValue, formData.data_primeira_parcela, id]);

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
      if (resp && resp.results && resp.results.length > 0) {
        const v = resp.results[0];
        setFormData({
          cliente_id: (v.cliente_id || '').toString(),
          qtd_parcelas: (v.qtd_parcelas || 1).toString(),
          data_primeira_parcela: v.criado_em ? format(parseISO(v.criado_em), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'), 
          status: getSelectValue(v.status),
        });

        // Try to parse multiple products from name field if possible
        // Format: "Name = Price\nName = Price"
        const productLines = (v.produto || '').split('\n');
        const parsedProducts = productLines.map(line => {
          const parts = line.split(' = ');
          if (parts.length === 2) {
            return { name: parts[0], brand: getSelectValue(v.marca), cost: '', price: parts[1] };
          }
          return { name: line, brand: getSelectValue(v.marca), cost: '', price: '' };
        });

        if (parsedProducts.length > 0 && parsedProducts[0].name) {
          // If first product is empty or just generic name, set cost/price from v fields
          if (parsedProducts.length === 1) {
            parsedProducts[0].price = (v.valor_venda || 0).toString().replace('.', ',');
            parsedProducts[0].cost = (v.custo || 0).toString().replace('.', ',');
          }
          setProducts(parsedProducts);
        }

        // Load existing installments
        const pResp = await getRows<Parcela>(TABLES.PARCELAS, {
          filters: JSON.stringify({
            filter_type: 'AND',
            filters: [{ field: 'venda_id', type: 'equal', value: id }],
          })
        });
        if (pResp && pResp.results) {
          setInstallments(pResp.results.sort((a, b) => Number(a.numero_parcela) - Number(b.numero_parcela)).map(p => ({
            ...p,
            valor_parcela: (p.valor_parcela || 0).toString().replace('.', ','),
            status: getSelectValue(p.status)
          })));
        }
      }
    } catch (err) {
      console.error('Error loading sale:', err);
    }
  };

  const handleProductChange = (index: number, field: string, value: string) => {
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    setProducts(newProducts);
  };

  const addProduct = () => {
    setProducts([...products, { name: '', brand: '', cost: '', price: '' }]);
  };

  const removeProduct = (index: number) => {
    if (products.length === 1) return;
    const newProducts = products.filter((_, i) => i !== index);
    setProducts(newProducts);
  };

  const handleInstallmentChange = (index: number, field: string, value: string) => {
    const newInstallments = [...installments];
    newInstallments[index] = { ...newInstallments[index], [field]: value };
    setInstallments(newInstallments);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const saleValue = totalSaleValue;
    const cost = totalCost;
    const profit = saleValue - cost;
    const installmentsCount = parseInt(formData.qtd_parcelas);
    
    if (!formData.cliente_id) {
      alert('Por favor, selecione um cliente.');
      return;
    }

    const selectedCliente = clientes.find(c => c.id.toString() === formData.cliente_id);

    // Format products string: "Name = Price"
    const productStr = products.map(p => `${p.name} = ${p.price}`).join('\n');
    const brandStr = Array.from(new Set(products.map(p => p.brand).filter(Boolean))).join(' / ');

    try {
      if (id) {
        await updateRow(TABLES.VENDAS, parseInt(id), {
          cliente_id: parseInt(formData.cliente_id),
          cliente_nome: selectedCliente?.nome || '',
          produto: productStr,
          marca: brandStr,
          custo: cost,
          valor_venda: saleValue,
          lucro: profit,
          qtd_parcelas: installmentsCount,
          status: formData.status,
        });

        // Sync installments
        const existingPResp = await getRows<Parcela>(TABLES.PARCELAS, {
          filters: JSON.stringify({
            filter_type: 'AND',
            filters: [{ field: 'venda_id', type: 'equal', value: id }]
          })
        });
        const dbPIds = (existingPResp.results || []).map(p => p.id);
        const currentPIds = installments.map(p => p.id).filter(Boolean);
        const toDelete = dbPIds.filter(pid => !currentPIds.includes(pid));

        for (const pid of toDelete) {
          await deleteRow(TABLES.PARCELAS, pid);
        }

        for (const p of installments) {
          if (p.id) {
            await updateRow(TABLES.PARCELAS, p.id, {
              valor_parcela: parseDecimal(p.valor_parcela),
              vencimento: p.vencimento,
              status: getSelectValue(p.status),
            });
          } else {
            await addRow(TABLES.PARCELAS, {
              venda_id: parseInt(id),
              cliente_nome: selectedCliente?.nome || '',
              numero_parcela: p.numero_parcela,
              valor_parcela: parseDecimal(p.valor_parcela),
              vencimento: p.vencimento,
              status: getSelectValue(p.status),
              pago_em: getSelectValue(p.status) === 'Pago' ? format(new Date(), 'yyyy-MM-dd') : null,
            });
          }
        }
        navigate('/vendas');
      } else {
        // Create Venda
        const newVenda = await addRow<Venda>(TABLES.VENDAS, {
          cliente_id: parseInt(formData.cliente_id),
          cliente_nome: selectedCliente?.nome || '',
          produto: productStr,
          marca: brandStr,
          custo: cost,
          valor_venda: saleValue,
          lucro: profit,
          qtd_parcelas: installmentsCount,
          status: 'Em Aberto',
        });

        if (newVenda) {
          // Save generated installments
          const pPromises = installments.map(p => addRow(TABLES.PARCELAS, {
            venda_id: newVenda.id,
            cliente_nome: selectedCliente?.nome || '',
            numero_parcela: p.numero_parcela,
            valor_parcela: parseDecimal(p.valor_parcela),
            vencimento: p.vencimento,
            status: getSelectValue(p.status),
            pago_em: getSelectValue(p.status) === 'Pago' ? format(new Date(), 'yyyy-MM-dd') : null,
          }));
          await Promise.allSettled(pPromises);
        }
        navigate('/vendas');
      }
    } catch (err: any) {
      console.error('Error saving sale:', err);
      alert(getErrorMessage(err));
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

        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Produtos</h3>
            <button 
              type="button" 
              onClick={addProduct}
              className="flex items-center gap-1 text-[10px] font-bold text-brand-accent bg-brand-accent/10 px-2 py-1 rounded"
            >
              <Plus size={12} />
              ADICIONAR PRODUTO
            </button>
          </div>
          
          <div className="flex flex-col gap-4">
            {products.map((p, idx) => (
              <div key={idx} className="card flex flex-col gap-4 relative">
                {products.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeProduct(idx)}
                    className="absolute top-2 right-2 text-red-500 p-1"
                  >
                    <span className="text-[10px] font-bold">REMOVER</span>
                  </button>
                )}
                
                <div className="flex flex-col gap-1">
                  <label className="label text-[10px]">Marca</label>
                  <div className="relative">
                    <select
                      className="input-field appearance-none pr-10 py-2 text-sm"
                      value={p.brand}
                      onChange={(e) => handleProductChange(idx, 'brand', e.target.value)}
                      required
                    >
                      <option value="">Selecione a marca...</option>
                      {marcas.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="label text-[10px]">Produto / Fragrância</label>
                  <input
                    type="text"
                    className="input-field py-2 text-sm"
                    placeholder="Ex: Floratta Rose 100ml"
                    value={p.name}
                    onChange={(e) => handleProductChange(idx, 'name', e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="label text-[10px]">Custo (R$)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="input-field py-2 text-sm"
                      placeholder="0,00"
                      value={p.cost}
                      onChange={(e) => handleProductChange(idx, 'cost', e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="label text-[10px]">Venda (R$)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="input-field py-2 text-sm"
                      placeholder="0,00"
                      value={p.price}
                      onChange={(e) => handleProductChange(idx, 'price', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card flex flex-col gap-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1">Resumo Total</h3>
          <div className="grid grid-cols-2 gap-4">
             <div className="flex flex-col gap-1">
                <label className="label">Custo Total (R$)</label>
                <div className="input-field bg-gray-50 flex items-center text-gray-500 font-bold">
                  {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="label">Venda Total (R$)</label>
                <div className="input-field bg-gray-50 flex items-center text-gray-800 font-bold">
                  {totalSaleValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
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
