import { api, TABLES } from './api';
import { Cliente, BaserowResponse } from '../types';

export const clientesService = {
  list: async (userId: number) => {
    const response = await api.get<BaserowResponse<Cliente>>(`database/rows/table/${TABLES.CLIENTES}/`, {
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
  getById: async (id: string | number) => {
    const response = await api.get<BaserowResponse<Cliente>>(`database/rows/table/${TABLES.CLIENTES}/`, {
      params: {
        user_field_names: true,
        filters: JSON.stringify({
          filter_type: 'AND',
          filters: [{ field: 'id', type: 'equal', value: id.toString() }],
        }),
      },
    });
    return response.data;
  },
  create: async (data: any, userId: number) => {
    const response = await api.post<Cliente>(`database/rows/table/${TABLES.CLIENTES}/?user_field_names=true`, {
      ...data,
      user_id: userId,
      criado_em: new Date().toISOString(),
    });
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.patch<Cliente>(`database/rows/table/${TABLES.CLIENTES}/${id}/?user_field_names=true`, data);
    return response.data;
  },
};
