import { api, TABLES } from './api';
import { Usuario, BaserowResponse } from '../types';

export const usuariosService = {
  getByEmailAndSenha: async (email: string, senha: string) => {
    const response = await api.get<BaserowResponse<Usuario>>(`database/rows/table/${TABLES.USUARIOS}/`, {
      params: {
        user_field_names: true,
        filters: JSON.stringify({
          filter_type: 'AND',
          filters: [
            { field: 'email', type: 'equal', value: email },
            { field: 'senha', type: 'equal', value: senha },
          ],
        }),
      },
    });
    return response.data;
  },
  getByEmail: async (email: string) => {
    const response = await api.get<BaserowResponse<Usuario>>(`database/rows/table/${TABLES.USUARIOS}/`, {
      params: {
        user_field_names: true,
        filters: JSON.stringify({
          filter_type: 'AND',
          filters: [{ field: 'email', type: 'equal', value: email }],
        }),
      },
    });
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post<Usuario>(`database/rows/table/${TABLES.USUARIOS}/?user_field_names=true`, {
      ...data,
      criado_em: new Date().toISOString(),
    });
    return response.data;
  },
};
