import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ClienteList } from './Clientes/ClienteList';
import { ClienteForm } from './Clientes/ClienteForm';
import { ClienteDetail } from './Clientes/ClienteDetail';

export const Clientes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<ClienteList />} />
      <Route path="/novo" element={<ClienteForm />} />
      <Route path="/editar/:id" element={<ClienteForm />} />
      <Route path="/:id" element={<ClienteDetail />} />
    </Routes>
  );
};
