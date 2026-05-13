import { api, TABLES } from './api';
import { Usuario, BaserowResponse } from '../types';

export const usuariosService = {
  getByEmailAndSenha: async (email: string, senha: string) => {
    try {
      const response = await api.get<BaserowResponse<Usuario>>(`database/rows/table/${TABLES.USUARIOS}/`, {
        params: {
          user_field_names: true,
          filter__field_email__equal: email,
          filter__field_senha__equal: senha,
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('BASEROW ERROR (getByEmailAndSenha):', error.response?.data || error.message);
      throw error;
    }
  },
  getByEmail: async (email: string) => {
    try {
      const response = await api.get<BaserowResponse<Usuario>>(`database/rows/table/${TABLES.USUARIOS}/`, {
        params: {
          user_field_names: true,
          filter__field_email__equal: email,
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('BASEROW ERROR (getByEmail):', error.response?.data || error.message);
      throw error;
    }
  },
  create: async (data: any) => {
    const url = `database/rows/table/${TABLES.USUARIOS}/?user_field_names=true`;
    // Filter out read-only fields
    const { id, criado_em, whatsapp_link, ...payload } = data;
    console.log('POST URL:', url);
    console.log('POST PAYLOAD:', payload);
    try {
      const response = await api.post<Usuario>(url, payload);
      return response.data;
    } catch (error: any) {
      console.error('BASEROW ERROR (create):', error.response?.data || error.message);
      throw error;
    }
  },
};
