import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Edit2, Phone, Briefcase, History, TrendingUp, DollarSign, Wallet, ShoppingBag, Clock, CheckCircle2, MessageSquare } from 'lucide-react';
import { useBaserow } from '../../hooks/useBaserow';
import { TABLES } from '../../services/api';
import { Cliente, Venda, Parcela } from '../../types';
import { formatCurrency, formatPhone, formatDate, isOverdue, getSelectValue, getErrorMessage } from '../../utils/formatters';
import { cn } from '../../lib/utils';

export const ClienteDetail: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const { getRows, updateRow, loading: baserowLoading } = useBaserow();
  const [cliente, setCliente] = useState<Cliente | null>(location.state?.cliente || null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'Dinheiro' | 'Cartão'>('PIX');
  const [stats, setStats] = useState({
    totalGasto: 0,
    totalPago: 0,
    totalPendente: 0,
    totalVencido: 0,
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
    setErrorStatus(null);
    try {
      const vParams = {
        filters: JSON.stringify({
          filter_type: 'AND',
          filters: [{ field: 'cliente_id', type: 'equal', value: id }],
        }),
        order_by: '-criado_em'
      };

      const [vendasData, parcelasData] = await Promise.all([
        getRows<Venda>(TABLES.VENDAS, vParams),
        getRows<Parcela>(TABLES.PARCELAS, { order_by: 'vencimento' })
      ]);

      const vList = vendasData.results || [];
      const vIds = vList.map(v => v.id);
      const pList = (parcelasData.results || []).filter(p => vIds.includes(Number(p.venda_id)));
      
      setVendas(vList);
      setParcelas(pList);

      const totalVencido = pList.filter(p => isOverdue(p.vencimento, getSelectValue(p.status))).reduce((acc, p) => acc + Number(p.valor_parcela || 0), 0);

      setStats({
        totalGasto: vList.reduce((acc, v) => acc + Number(v.valor_venda || 0), 0),
        totalPago: pList.filter(p => getSelectValue(p.status) === 'Pago').reduce((acc, p) => acc + Number(p.valor_parcela || 0), 0),
        totalPendente: pList.filter(p => getSelectValue(p.status) !== 'Pago' && !isOverdue(p.vencimento, getSelectValue(p.status))).reduce((acc, p) => acc + Number(p.valor_parcela || 0), 0),
        totalVencido: totalVencido,
        lucroGerado: vList.reduce((acc, v) => acc + Number(v.lucro || 0), 0),
        parcelasAbertas: pList.filter(p => getSelectValue(p.status) !== 'Pago' && !isOverdue(p.vencimento, getSelectValue(p.status))).length,
        parcelasPagas: pList.filter(p => getSelectValue(p.status) === 'Pago').length,
        parcelasVencidas: pList.filter(p => isOverdue(p.vencimento, getSelectValue(p.status))).length,
      });

      // Fetch client only if missing
      if (!cliente) {
        const cData = await getRows<Cliente>(TABLES.CLIENTES, {
          filters: JSON.stringify({
            filter_type: 'AND',
            filters: [{ field: 'id', type: 'equal', value: id }],
          }),
        });
        if (cData.results && cData.results.length > 0) {
          setCliente(cData.results[0]);
        }
      }
    } catch (err: any) {
      console.error('Error loading client details:', err);
      setErrorStatus("Não foi possível carregar o histórico financeiro deste cliente.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (parcela: Parcela) => {
    const currentStatus = getSelectValue(parcela.status);
    const isPaying = currentStatus !== 'Pago';
    const newStatus = isPaying ? 'Pago' : 'Em Aberto';
    const pago_em = isPaying ? new Date().toISOString().split('T')[0] : null;
    
    try {
      await updateRow(TABLES.PARCELAS, parcela.id, {
        status: newStatus,
        pago_em: pago_em
      });
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert(getErrorMessage(err));
    }
  };

  const generateDetailedExtract = () => {
    if (!cliente) return '';

    let message = `Olá, *${cliente.nome}*! Tudo bem?\n\nSegue o resumo da sua compra:\n\n`;
    
    vendas.forEach((venda, idx) => {
      const vendaParcelas = parcelas.filter(p => Number(p.venda_id) === venda.id).sort((a, b) => Number(a.numero_parcela) - Number(b.numero_parcela));
      
      const formatMsgCurrency = (val: number) => formatCurrency(val).replace('R$\u00A0', '').replace('R$ ', '');

      // Parse products if saved in multiple format
      const productLines = (venda.produto || '').split('\n');
      if (productLines.length > 1) {
        productLines.forEach(line => {
          message += `*${line}*\n`;
        });
      } else {
        message += `*${venda.produto}* = ${formatMsgCurrency(venda.valor_venda)}\n`;
      }
      
      message += `Total: ${formatMsgCurrency(venda.valor_venda)}\n\n`;
      
      vendaParcelas.forEach(p => {
        let icon = '';
        const statusVal = getSelectValue(p.status);
        if (statusVal === 'Pago') icon = ' ✅';
        else if (isOverdue(p.vencimento, statusVal)) icon = ' ⚠️';

        message += `${p.numero_parcela}. ${formatDate(p.vencimento)} = ${formatMsgCurrency(p.valor_parcela)}${icon}\n`;
      });

      if (idx < vendas.length - 1) {
        message += `\n<<<<<<<<<<<<<<<<<<\n\n`;
      }
    });

    message += `\n---\n\n*Resumo:*\n`;
    message += `Total comprado: ${formatCurrency(stats.totalGasto)}\n`;
    message += `Total pago: ${formatCurrency(stats.totalPago)}\n`;
    message += `Total em aberto: ${formatCurrency(stats.totalPendente)}\n`;
    message += `Total vencido: ${formatCurrency(stats.totalVencido)}\n\n`;
    message += `*Forma de pagamento:* ${paymentMethod}\n\n`;
    message += `Qualquer dúvida, fico à disposição.`;

    return encodeURIComponent(message);
  };

  const generateOpenExtract = () => {
    if (!cliente) return '';

    let message = `Olá, *${cliente.nome}*! Tudo bem?\n\nSegue o resumo dos valores em aberto:\n\n`;
    
    let hasOpen = false;
    vendas.forEach((venda, idx) => {
      const openParcelas = parcelas
        .filter(p => Number(p.venda_id) === venda.id)
        .filter(p => getSelectValue(p.status) !== 'Pago')
        .sort((a, b) => Number(a.numero_parcela) - Number(b.numero_parcela));
      
      if (openParcelas.length === 0) return;
      hasOpen = true;

      const formatMsgCurrency = (val: number) => formatCurrency(val).replace('R$\u00A0', '').replace('R$ ', '');

      message += `*${venda.produto.split('\n')[0]}*\n`;
      
      openParcelas.forEach(p => {
        let icon = '';
        const statusVal = getSelectValue(p.status);
        if (isOverdue(p.vencimento, statusVal)) icon = ' ⚠️';

        message += `${p.numero_parcela}. ${formatDate(p.vencimento)} = ${formatMsgCurrency(p.valor_parcela)}${icon}\n`;
      });

      if (idx < vendas.length - 1) {
        message += `\n<<<<<<<<<<<<<<<<<<\n\n`;
      }
    });

    if (!hasOpen) {
      message = `Olá, *${cliente.nome}*! Tudo bem?\n\nVocê não possui parcelas em aberto no momento. ✅`;
    } else {
      message += `\n---\n\n*Resumo em aberto:*\n`;
      message += `Total em aberto: ${formatCurrency(stats.totalPendente)}\n`;
      message += `Total vencido: ${formatCurrency(stats.totalVencido)}\n\n`;
      message += `*Forma de pagamento:* ${paymentMethod}\n\n`;
      message += `Qualquer dúvida, fico à disposição.`;
    }

    return encodeURIComponent(message);
  };

  const StatusBadge = ({ status, date }: { status: any; date: string }) => {
    const val = getSelectValue(status);
    const overdue = isOverdue(date, val);
    
    if (val === 'Pago') return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Pago</span>;
    if (overdue) return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">⚠️ Vencido</span>;
    return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{val}</span>;
  };

  if (loading && !cliente) return <div className="h-full flex items-center justify-center py-20 text-gray-500 font-bold animate-pulse text-center">Carregando dados...</div>;
  if (!cliente) {
    return (
      <div className="p-10 flex flex-col items-center gap-4 text-center">
        <ArrowLeft className="cursor-pointer text-gray-400" onClick={() => window.history.back()} />
        <p className="text-gray-500 font-bold">{errorStatus || "Cliente não encontrado."}</p>
        <button onClick={() => loadData()} className="btn-secondary text-sm">Tentar Novamente</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      {errorStatus && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-xl text-xs font-bold text-center">
          ⚠️ {errorStatus}
        </div>
      )}
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
        
        <div className="flex flex-col items-center gap-4 w-full max-w-xs">
          <div className="flex gap-2 w-full">
            <a 
              href={`https://wa.me/55${cliente.telefone.replace(/\D/g, '')}`} 
              target="_blank"
              className="flex-1 flex items-center justify-center gap-2 text-green-600 bg-green-50 px-4 py-2.5 rounded-xl text-sm font-bold border border-green-100 active:scale-95 transition-transform"
            >
              <Phone size={16} />
              {formatPhone(cliente.telefone)}
            </a>
          </div>

          <div className="flex flex-col gap-2 w-full bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Forma de Pagto (WhatsApp)</label>
            <div className="grid grid-cols-3 gap-1">
              {(['PIX', 'Dinheiro', 'Cartão'] as const).map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={cn(
                    "py-1.5 text-[10px] font-bold rounded-lg transition-all",
                    paymentMethod === method 
                      ? "bg-brand-primary text-white shadow-sm" 
                      : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  )}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full">
            <a 
              href={`https://wa.me/55${cliente.telefone.replace(/\D/g, '')}?text=${generateDetailedExtract()}`} 
              target="_blank"
              className="w-full flex items-center justify-center gap-2 text-white bg-green-500 px-4 py-3 rounded-xl text-xs font-bold shadow-lg shadow-green-200 active:scale-95 transition-transform"
            >
              <MessageSquare size={16} />
              Enviar extrato detalhado
            </a>

            <a 
              href={`https://wa.me/55${cliente.telefone.replace(/\D/g, '')}?text=${generateOpenExtract()}`} 
              target="_blank"
              className="w-full flex items-center justify-center gap-2 text-green-600 bg-white border border-green-200 px-4 py-3 rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-transform"
            >
              <MessageSquare size={16} />
              Enviar somente em aberto
            </a>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <div className="card flex flex-col gap-1 p-4 bg-white border-brand-primary/20">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <ShoppingBag size={10} /> Consumo Total
          </span>
          <span className="text-lg font-bold text-gray-700">{formatCurrency(stats.totalGasto)}</span>
        </div>
        <div className="card flex flex-col gap-1 p-4 bg-white border-brand-primary/20">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <TrendingUp size={10} /> Lucro Gerado
          </span>
          <span className="text-lg font-bold text-brand-primary">{formatCurrency(stats.lucroGerado)}</span>
        </div>
        <div className="card flex flex-col gap-1 p-4 bg-green-50 border-green-200">
          <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest flex items-center gap-1">
            <CheckCircle2 size={10} /> Total Pago
          </span>
          <span className="text-lg font-bold text-green-700">{formatCurrency(stats.totalPago)}</span>
          <span className="text-[9px] text-green-600/60 font-medium">{stats.parcelasPagas} parcelas</span>
        </div>
        <div className="card flex flex-col gap-1 p-4 bg-amber-50 border-amber-200">
          <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1">
            <Clock size={10} /> Valor Aberto
          </span>
          <span className="text-lg font-bold text-amber-700">{formatCurrency(stats.totalPendente)}</span>
          <span className="text-[9px] text-amber-600/60 font-medium">{stats.parcelasAbertas + stats.parcelasVencidas} em aberto</span>
        </div>
        <div className="card col-span-2 flex justify-between items-center p-3 bg-red-50 border-red-100">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest">Valor Vencido</span>
            <span className="text-lg font-bold text-red-700">{formatCurrency(stats.totalVencido)}</span>
          </div>
          <div className="bg-red-500 text-white px-2 py-1 rounded-lg text-sm font-bold">
            {stats.parcelasVencidas} ⚠️
          </div>
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
            const vendaParcelas = parcelas.filter(p => Number(p.venda_id) === venda.id).sort((a, b) => Number(a.numero_parcela) - Number(b.numero_parcela));
            const vendaStatus = getSelectValue(venda.status);
            
            return (
              <div key={venda.id} className="flex flex-col gap-4">
                <div className="card p-5 bg-white border-brand-accent/20 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-brand-accent/10 rounded-bl-xl text-[9px] font-bold text-brand-accent uppercase tracking-wider">
                    Compra #{venda.id}
                  </div>
                  
                  <div className="flex flex-col gap-4 mt-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Produto</span>
                      <span className="font-bold text-xl text-gray-800 leading-tight">{venda.produto}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Marca</span>
                        <div className="flex items-center gap-1.5 text-sm font-bold text-brand-accent">
                          <Briefcase size={14} />
                          {getSelectValue(venda.marca)}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Data</span>
                        <div className="text-sm font-bold text-gray-600">
                          {formatDate(venda.criado_em)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-50">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Valor da Venda</span>
                        <div className="text-lg font-bold text-gray-800">
                          {formatCurrency(venda.valor_venda)}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Lucro</span>
                        <div className="text-lg font-bold text-brand-primary">
                          {formatCurrency(venda.lucro)}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-gray-50 text-[11px] font-bold uppercase tracking-wider">
                      <div className="flex gap-2">
                        <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded-lg italic">{venda.qtd_parcelas}x Parcelas</span>
                        <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">Custo: {formatCurrency(venda.custo)}</span>
                      </div>
                      <StatusBadge status={vendaStatus} date={venda.criado_em} />
                    </div>
                  </div>
                </div>

                <div className="pl-2 flex flex-col gap-3">
                   <div className="flex items-center gap-2 px-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-brand-accent"></span>
                     <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Controle de Parcelas</h4>
                   </div>
                   
                   <div className="flex flex-col gap-2">
                    {vendaParcelas.map(p => {
                      const statusVal = getSelectValue(p.status);
                      const isPaid = statusVal === 'Pago';
                      const overdue = isOverdue(p.vencimento, statusVal);

                      return (
                        <div key={p.id} className={cn(
                          "card p-3 flex items-center justify-between border-dashed",
                          isPaid ? "bg-green-50/30 border-green-100" : (overdue ? "bg-red-50/30 border-red-100" : "bg-white border-gray-100")
                        )}>
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm transition-all",
                                isPaid ? "bg-green-500 text-white" : (overdue ? "bg-red-500 text-white" : "bg-gray-100 text-gray-400")
                              )}>
                                {p.numero_parcela}
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase">Venc. {formatDate(p.vencimento)}</span>
                                  {isPaid && <span className="text-[8px] font-bold text-green-500 uppercase tracking-tighter bg-green-100 px-1 rounded">Pago em {formatDate(p.pago_em || '')}</span>}
                                </div>
                                <span className={cn("font-bold text-base", isPaid ? "text-green-600" : "text-gray-700")}>
                                  {formatCurrency(p.valor_parcela)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleToggleStatus(p)}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95",
                                  isPaid 
                                    ? "text-amber-600 bg-white border border-amber-100 hover:bg-amber-50" 
                                    : "text-white bg-green-500 border border-green-600 hover:bg-green-600"
                                )}
                              >
                                {isPaid ? (
                                  <>
                                    <Clock size={12} />
                                    Estornar
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 size={12} />
                                    PAGO
                                  </>
                                )}
                              </button>
                            </div>
                        </div>
                      );
                    })}
                   </div>
                </div>
              </div>
            );
          }) : (
            <div className="card py-16 flex flex-col items-center justify-center text-gray-300 gap-4 opacity-70 bg-white border-dashed">
              <ShoppingBag size={48} className="text-gray-200" />
              <div className="text-center">
                <p className="font-bold text-gray-500">Nenhuma compra registrada</p>
                <p className="text-xs text-gray-400">As vendas deste cliente aparecerão aqui.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
