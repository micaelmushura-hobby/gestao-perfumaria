export type UserStatus = 'Ativo' | 'Inativo';
export type SaleStatus = 'Pendente' | 'Pago' | 'Parcial' | 'Em Aberto';
export type InstallmentStatus = 'Pendente' | 'Pago' | 'Vencido' | 'Em Aberto';

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  senha?: string;
  whatsapp_link?: string; // Formula
  criado_em: string;
}

export interface Cliente {
  id: number;
  user_id: number;
  nome: string;
  telefone: string;
  whatsapp_link?: string; // Formula
  observacao: string;
  criado_em: string;
}

export interface Venda {
  id: number;
  user_id: number;
  cliente_id: number;
  cliente_nome: string;
  produto: string;
  marca: string;
  custo: number;
  valor_venda: number;
  lucro: number;
  qtd_parcelas: number;
  status: SaleStatus;
  criado_em: string;
}

export interface Parcela {
  id: number;
  user_id: number;
  venda_id: number;
  cliente_nome: string;
  numero_parcela: number;
  valor_parcela: number;
  vencimento: string;
  status: InstallmentStatus;
  pago_em: string | null;
  criado_em: string;
}

export interface BaserowResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
