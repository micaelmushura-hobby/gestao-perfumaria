import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { BaserowResponse } from '../types';
import { getSelectValue } from '../utils/formatters';

export function useBaserow() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const normalizeRow = useCallback((row: any) => {
    return {
      ...row,
      marca: getSelectValue(row.marca),
      status: getSelectValue(row.status),
      custo: Number(row.custo || 0),
      valor_venda: Number(row.valor_venda || 0),
      lucro: Number(row.lucro || 0),
      qtd_parcelas: Number(row.qtd_parcelas || 0),
      cliente_id: Number(row.cliente_id || 0),
      venda_id: Number(row.venda_id || 0),
      user_id: Number(row.user_id || 0),
      valor_parcela: Number(row.valor_parcela || 0),
      numero_parcela: Number(row.numero_parcela || 0),
    };
  }, []);

  const getRows = useCallback(async <T,>(tableId: string | undefined, params: any = {}) => {
    const userId = Number(user?.id);
    if (!tableId || !userId || isNaN(userId)) {
      return { results: [], count: 0 } as BaserowResponse<T>;
    }
    setLoading(true);
    try {
      const response = await api.get<BaserowResponse<T>>(`database/rows/table/${tableId}/`, {
        params: {
          ...params,
          user_field_names: true,
          filter__field_user_id__equal: userId,
        },
      });
      
      const normalizedResults = (response.data.results || []).map(normalizeRow) as T[];
      return {
        ...response.data,
        results: normalizedResults
      };
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      console.error(`BASEROW ERROR fetching rows from table ${tableId}:`, errorMsg);
      return { results: [], count: 0 } as BaserowResponse<T>;
    } finally {
      setLoading(false);
    }
  }, [user, normalizeRow]);

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
      return normalizeRow(response.data) as T;
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      console.error(`BASEROW ERROR adding row to table ${tableId}:`, errorMsg);
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
      return normalizeRow(response.data) as T;
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      console.error(`BASEROW ERROR updating row ${rowId} in table ${tableId}:`, errorMsg);
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
