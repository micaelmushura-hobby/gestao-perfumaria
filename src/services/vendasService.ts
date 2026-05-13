import { api, TABLES } from './api';
import { Venda, BaserowResponse } from '../types';

export const vendasService = {
  list: async (userId: number) => {
    try {
      const response = await api.get<BaserowResponse<Venda>>(`database/rows/table/${TABLES.VENDAS}/`, {
        params: {
          user_field_names: true,
          filter__field_user_id__equal: Number(userId),
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('BASEROW ERROR (list vendas):', error.response?.data || error.message);
      throw error;
    }
  },
  create: async (data: any, userId: number) => {
    const url = `database/rows/table/${TABLES.VENDAS}/?user_field_names=true`;
    // Filter out read-only fields
    const { id, criado_em, ...payload } = data;
    payload.user_id = userId;
    console.log('POST URL:', url);
    console.log('POST PAYLOAD:', payload);
    try {
      const response = await api.post<Venda>(url, payload);
      return response.data;
    } catch (error: any) {
      console.error('BASEROW ERROR (create venda):', error.response?.data || error.message);
      throw error;
    }
  },
  update: async (id: number, data: any) => {
    const url = `database/rows/table/${TABLES.VENDAS}/${id}/?user_field_names=true`;
    // Filter out read-only fields
    const { id: _, criado_em, ...payload } = data;
    try {
      const response = await api.patch<Venda>(url, payload);
      return response.data;
    } catch (error: any) {
      console.error('BASEROW ERROR (update venda):', error.response?.data || error.message);
      throw error;
    }
  },
};
