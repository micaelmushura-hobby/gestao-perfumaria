import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { SaleList } from './Sales/SaleList';
import { SaleForm } from './Sales/SaleForm';

export const Vendas: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<SaleList />} />
      <Route path="/nova" element={<SaleForm />} />
      <Route path="/editar/:id" element={<SaleForm />} />
    </Routes>
  );
};
