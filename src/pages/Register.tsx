import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, User, Mail, Phone, Lock } from 'lucide-react';
import { api, TABLES } from '../services/api';

export const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    senha: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check if user already exists
      const checkResponse = await api.get(`/database/rows/table/${TABLES.USUARIOS}/`, {
        params: {
          filters: JSON.stringify({
            filter_type: 'AND',
            filters: [{ field: 'email', type: 'equal', value: formData.email }],
          }),
        },
      });

      if (checkResponse.data.results.length > 0) {
        setError('Este e-mail já está em uso.');
        setLoading(false);
        return;
      }

      await api.post(`/database/rows/table/${TABLES.USUARIOS}/?user_field_names=true`, {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        senha: formData.senha,
        criado_em: new Date().toISOString(),
      });

      navigate('/login', { state: { message: 'Conta criada com sucesso! Faça login para continuar.' } });
    } catch (err) {
      console.error(err);
      setError('Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="flex flex-col gap-8 py-10">
      <div className="text-center">
        <h2 className="text-3xl font-display font-bold">Criar Conta</h2>
        <p className="text-gray-500 mt-2">Comece a gerenciar suas vendas de forma profissional</p>
      </div>

      <form onSubmit={handleRegister} className="flex flex-col gap-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="label">Nome Completo</label>
          <div className="relative">
             <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input
              type="text"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              className="input-field pl-12"
              placeholder="Seu nome"
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="label">E-mail</label>
          <div className="relative">
             <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input-field pl-12"
              placeholder="exemplo@email.com"
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="label">Telefone (WhatsApp)</label>
          <div className="relative">
             <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input
              type="tel"
              name="telefone"
              value={formData.telefone}
              onChange={handleChange}
              className="input-field pl-12"
              placeholder="11999999999"
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="label">Senha</label>
          <div className="relative">
             <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input
              type="password"
              name="senha"
              value={formData.senha}
              onChange={handleChange}
              className="input-field pl-12"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary mt-4 flex items-center justify-center gap-2 h-12"
        >
          {loading ? 'Criando conta...' : (
            <>
              <UserPlus size={20} />
              Cadastrar
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Já tem uma conta?{' '}
        <Link to="/login" className="text-brand-accent font-semibold">
          Faça login
        </Link>
      </p>
    </div>
  );
};
