import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock } from 'lucide-react';
import { usuariosService } from '../services/usuariosService';
import { useAuth } from '../contexts/AuthContext';
import { Usuario } from '../types';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await usuariosService.getByEmailAndSenha(email, senha);

      if (data.results.length > 0) {
        const userData = data.results[0];
        // Don't store password in local state
        const { senha: _, ...safeUser } = userData;
        login(safeUser as Usuario);
        navigate('/');
      } else {
        setError('E-mail ou senha incorretos.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao realizar login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 py-10">
      <div className="text-center">
        <h2 className="text-3xl font-display font-bold dark:text-white">Bem-vindo</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Entre na sua conta para gerenciar seu negócio</p>
      </div>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="label">E-mail</label>
          <div className="relative">
             <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field pl-12"
              placeholder="exemplo@email.com"
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
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
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
          {loading ? 'Entrando...' : (
            <>
              <LogIn size={20} />
              Entrar
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Não tem uma conta?{' '}
        <Link to="/register" className="text-brand-accent font-semibold">
          Cadastre-se agora
        </Link>
      </p>
    </div>
  );
};
