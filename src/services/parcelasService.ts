import { api, TABLES } from './api';
import { Parcela, BaserowResponse } from '../types';

export const parcelasService = {
  list: async (userId: number) => {
    try {
      const response = await api.get<BaserowResponse<Parcela>>(`database/rows/table/${TABLES.PARCELAS}/`, {
        params: {
          user_field_names: true,
          filter__field_user_id__equal: Number(userId),
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('BASEROW ERROR (list parcelas):', error.response?.data || error.message);
      throw error;
    }
  },
  update: async (id: number, data: any) => {
    const url = `database/rows/table/${TABLES.PARCELAS}/${id}/?user_field_names=true`;
    // Filter out read-only fields
    const { id: _, criado_em, ...payload } = data;
    try {
      const response = await api.patch<Parcela>(url, payload);
      return response.data;
    } catch (error: any) {
      console.error('BASEROW ERROR (update parcela):', error.response?.data || error.message);
      throw error;
    }
  },
};
