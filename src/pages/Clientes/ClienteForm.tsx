import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { useBaserow } from '../../hooks/useBaserow';
import { TABLES } from '../../services/api';
import { Cliente } from '../../types';

export const ClienteForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addRow, updateRow, getRows, deleteRow, loading } = useBaserow();
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    observacao: '',
  });

  useEffect(() => {
    if (id) {
      loadCliente();
    }
  }, [id]);

  const loadCliente = async () => {
    try {
      const resp = await getRows<Cliente>(TABLES.CLIENTES, {
        filters: JSON.stringify({
          filter_type: 'AND',
          filters: [{ field: 'id', type: 'equal', value: id }],
        }),
      });
      if (resp.results.length > 0) {
        const c = resp.results[0];
        setFormData({
          nome: c.nome,
          telefone: c.telefone,
          observacao: c.observacao,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (id) {
        await updateRow(TABLES.CLIENTES, parseInt(id), formData);
      } else {
        await addRow(TABLES.CLIENTES, formData);
      }
      navigate('/clientes');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        await deleteRow(TABLES.CLIENTES, parseInt(id));
        navigate('/clientes');
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link to="/clientes" className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm text-gray-500">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-2xl font-display font-bold">
          {id ? 'Editar Cliente' : 'Novo Cliente'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="card flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="label">Nome Completo</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ex: Maria Souza"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="label">Telefone (Somente Números)</label>
            <input
              type="tel"
              className="input-field"
              placeholder="Ex: 11999999999"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value.replace(/\D/g, '') })}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="label">Observações</label>
            <textarea
              className="input-field min-h-[120px] resize-none"
              placeholder="Anote detalhes importantes sobre este cliente..."
              value={formData.observacao}
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-4">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full h-14 flex items-center justify-center gap-2"
          >
            <Save size={20} />
            {loading ? 'Salvando...' : 'Salvar Cliente'}
          </button>

          {id && (
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center justify-center gap-2 text-red-500 font-semibold p-4"
            >
              <Trash2 size={20} />
              Excluir Cliente
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
