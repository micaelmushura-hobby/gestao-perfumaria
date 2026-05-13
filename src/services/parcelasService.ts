import { api, TABLES } from './api';
import { Parcela, BaserowResponse } from '../types';

export const parcelasService = {
  list: async (userId: number) => {
    const response = await api.get<BaserowResponse<Parcela>>(`database/rows/table/${TABLES.PARCELAS}/`, {
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
  update: async (id: number, data: any) => {
    const response = await api.patch<Parcela>(`database/rows/table/${TABLES.PARCELAS}/${id}/?user_field_names=true`, data);
    return response.data;
  },
};
