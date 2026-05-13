import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, UserPlus, Phone, ChevronRight, Users } from 'lucide-react';
import { useBaserow } from '../../hooks/useBaserow';
import { TABLES } from '../../services/api';
import { Cliente } from '../../types';
import { formatPhone, getErrorMessage } from '../../utils/formatters';

export const ClienteList: React.FC = () => {
  const { getRows, loading } = useBaserow();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadClientes();
  }, [getRows]);

  const loadClientes = async () => {
    try {
      const data = await getRows<Cliente>(TABLES.CLIENTES, {
        order_by: 'nome',
      });
      setClientes(data.results);
    } catch (err: any) {
      console.error(err);
      alert(getErrorMessage(err));
    }
  };

  const filteredClientes = clientes.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefone.includes(searchTerm)
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold">Meus Clientes</h2>
          <Link to="/clientes/novo" className="btn-primary flex items-center gap-2 px-4 py-2">
            <UserPlus size={18} />
            Novo
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar nome ou telefone..."
            className="input-field pl-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {loading && clientes.length === 0 ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
          ))
        ) : filteredClientes.length > 0 ? (
          filteredClientes.map((cliente) => (
            <Link
              key={cliente.id}
              to={`/clientes/${cliente.id}`}
              state={{ cliente }}
              className="card flex items-center justify-between active:bg-gray-50 bg-white"
            >
              <div className="flex flex-col gap-1">
                <span className="font-bold text-lg">{cliente.nome}</span>
                <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                  <Phone size={14} />
                  <span>{formatPhone(cliente.telefone)}</span>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-300" />
            </Link>
          ))
        ) : (
          <div className="text-center py-12 flex flex-col items-center gap-3">
            <div className="bg-gray-100 p-4 rounded-full text-gray-400">
              <Users size={40} />
            </div>
            <p className="text-gray-500">Nenhum cliente encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
};
