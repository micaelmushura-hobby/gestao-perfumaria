import { api, TABLES } from './api';
import { Cliente, BaserowResponse } from '../types';

export const clientesService = {
  list: async (userId: number) => {
    try {
      const response = await api.get<BaserowResponse<Cliente>>(`database/rows/table/${TABLES.CLIENTES}/`, {
        params: {
          user_field_names: true,
          filter__field_user_id__equal: Number(userId),
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('BASEROW ERROR (list clientes):', error.response?.data || error.message);
      throw error;
    }
  },
  getById: async (id: string | number) => {
    try {
      const response = await api.get<BaserowResponse<Cliente>>(`database/rows/table/${TABLES.CLIENTES}/`, {
        params: {
          user_field_names: true,
          filter__field_id__equal: id.toString(),
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('BASEROW ERROR (getById cliente):', error.response?.data || error.message);
      throw error;
    }
  },
  create: async (data: any, userId: number) => {
    const url = `database/rows/table/${TABLES.CLIENTES}/?user_field_names=true`;
    // Filter out read-only fields
    const { id, criado_em, whatsapp_link, ...payload } = data;
    payload.user_id = userId;
    console.log('POST URL:', url);
    console.log('POST PAYLOAD:', payload);
    try {
      const response = await api.post<Cliente>(url, payload);
      return response.data;
    } catch (error: any) {
      console.error('BASEROW ERROR (create cliente):', error.response?.data || error.message);
      throw error;
    }
  },
  update: async (id: number, data: any) => {
    const url = `database/rows/table/${TABLES.CLIENTES}/${id}/?user_field_names=true`;
    // Filter out read-only fields
    const { id: _, criado_em, whatsapp_link, ...payload } = data;
    try {
      const response = await api.patch<Cliente>(url, payload);
      return response.data;
    } catch (error: any) {
      console.error('BASEROW ERROR (update cliente):', error.response?.data || error.message);
      throw error;
    }
  },
};
