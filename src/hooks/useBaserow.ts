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
      const filters = params.filters ? JSON.parse(params.filters) : { filter_type: 'AND', filters: [] };
      
      // Always enforce user_id filter
      filters.filters.push({ field: 'user_id', type: 'equal', value: user.id.toString() });

      const response = await api.get<BaserowResponse<T>>(`/database/rows/table/${tableId}/`, {
        params: {
          ...params,
          user_field_names: true,
          filters: JSON.stringify(filters),
        },
      });
      return response.data;
    } catch (err) {
      console.error(`Error fetching rows from table ${tableId}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addRow = useCallback(async <T,>(tableId: string | undefined, data: any) => {
    if (!tableId || !user) return;
    setLoading(true);
    try {
      const response = await api.post<T>(`/database/rows/table/${tableId}/?user_field_names=true`, {
        ...data,
        user_id: user.id,
        criado_em: new Date().toISOString(),
      });
      return response.data;
    } catch (err) {
      console.error(`Error adding row to table ${tableId}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateRow = useCallback(async <T,>(tableId: string | undefined, rowId: number, data: any) => {
    if (!tableId) return;
    setLoading(true);
    try {
      const response = await api.patch<T>(`/database/rows/table/${tableId}/${rowId}/?user_field_names=true`, data);
      return response.data;
    } catch (err) {
      console.error(`Error updating row ${rowId} in table ${tableId}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteRow = useCallback(async (tableId: string | undefined, rowId: number) => {
    if (!tableId) return;
    setLoading(true);
    try {
      await api.delete(`/database/rows/table/${tableId}/${rowId}/`);
    } catch (err) {
      console.error(`Error deleting row ${rowId} from table ${tableId}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, getRows, addRow, updateRow, deleteRow };
}
