import axios from 'axios';

function extractTableId(value: string | undefined): string {
  if (!value) return '';
  const match = value.match(/\/table\/(\d+)/);
  if (match) return match[1];
  return value.trim();
}

const BASEROW_URL = (import.meta.env.VITE_BASEROW_URL || 'https://api.baserow.io').replace(/\/$/, '');
const BASEROW_TOKEN = import.meta.env.VITE_BASEROW_TOKEN;

console.log('BASEROW_URL:', BASEROW_URL);

export const api = axios.create({
  baseURL: `${BASEROW_URL}/api/`,
  headers: {
    Authorization: `Token ${BASEROW_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

export const TABLES = {
  USUARIOS: extractTableId(import.meta.env.VITE_TABLE_USUARIOS),
  CLIENTES: extractTableId(import.meta.env.VITE_TABLE_CLIENTES),
  VENDAS: extractTableId(import.meta.env.VITE_TABLE_VENDAS),
  PARCELAS: extractTableId(import.meta.env.VITE_TABLE_PARCELAS),
};

console.log('TABLES:', TABLES);
