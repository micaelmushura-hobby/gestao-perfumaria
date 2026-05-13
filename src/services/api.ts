import axios from 'axios';

const BASEROW_URL = import.meta.env.VITE_BASEROW_URL || 'https://api.baserow.io';
const BASEROW_TOKEN = import.meta.env.VITE_BASEROW_TOKEN;

export const api = axios.create({
  baseURL: `${BASEROW_URL}/api`,
  headers: {
    Authorization: `Token ${BASEROW_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

// Table IDs from env
export const TABLES = {
  USUARIOS: import.meta.env.VITE_TABLE_USUARIOS,
  CLIENTES: import.meta.env.VITE_TABLE_CLIENTES,
  VENDAS: import.meta.env.VITE_TABLE_VENDAS,
  PARCELAS: import.meta.env.VITE_TABLE_PARCELAS,
};
