import { api, TABLES } from './api';
import { Venda, BaserowResponse } from '../types';

export const vendasService = {
  list: async (userId: number) => {
    const response = await api.get<BaserowResponse<Venda>>(`database/rows/table/${TABLES.VENDAS}/`, {
      params: {
        user_field_names: true,
        filters: JSON.stringify({
          filter_type: 'AND',
          filters: [{ field: 'user_id', type: 'equal', value: userId.toString() }],
        }),
      },
    });
    return response.data;
  },
  create: async (data: any, userId: number) => {
    const response = await api.post<Venda>(`database/rows/table/${TABLES.VENDAS}/?user_field_names=true`, {
      ...data,
      user_id: userId,
      criado_em: new Date().toISOString(),
    });
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.patch<Venda>(`database/rows/table/${TABLES.VENDAS}/${id}/?user_field_names=true`, data);
    return response.data;
  },
};
