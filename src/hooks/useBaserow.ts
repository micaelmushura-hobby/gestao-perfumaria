import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { BaserowResponse } from '../types';

export function useBaserow() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const getRows = useCallback(async <T,>(tableId: string | undefined, params: any = {}) => {
    if (!tableId || !user) return { results: [], count: 0 } as BaserowResponse<T>;
    setLoading(true);
    try {
      const response = await api.get<BaserowResponse<T>>(`database/rows/table/${tableId}/`, {
        params: {
          ...params,
          user_field_names: true,
          filter__field_user_id__equal: Number(user.id),
        },
      });
      return response.data;
    } catch (err: any) {
      console.error(`BASEROW ERROR fetching rows from table ${tableId}:`, err.response?.data || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addRow = useCallback(async <T,>(tableId: string | undefined, data: any) => {
    if (!tableId || !user) return;
    setLoading(true);
    const url = `database/rows/table/${tableId}/?user_field_names=true`;
    // Filter out read-only fields
    const { id, criado_em, whatsapp_link, ...payload } = data;
    payload.user_id = user.id;
    
    console.log('POST URL:', url);
    console.log('POST PAYLOAD:', payload);
    
    try {
      const response = await api.post<T>(url, payload);
      return response.data;
    } catch (err: any) {
      console.error(`BASEROW ERROR adding row to table ${tableId}:`, err.response?.data || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateRow = useCallback(async <T,>(tableId: string | undefined, rowId: number, data: any) => {
    if (!tableId) return;
    setLoading(true);
    const url = `database/rows/table/${tableId}/${rowId}/?user_field_names=true`;
    // Filter out read-only fields
    const { id: _, criado_em, whatsapp_link, ...payload } = data;
    
    try {
      const response = await api.patch<T>(url, payload);
      return response.data;
    } catch (err: any) {
      console.error(`BASEROW ERROR updating row ${rowId} in table ${tableId}:`, err.response?.data || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteRow = useCallback(async (tableId: string | undefined, rowId: number) => {
    if (!tableId) return;
    setLoading(true);
    try {
      await api.delete(`database/rows/table/${tableId}/${rowId}/`);
    } catch (err) {
      console.error(`Error deleting row ${rowId} from table ${tableId}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, getRows, addRow, updateRow, deleteRow };
}
