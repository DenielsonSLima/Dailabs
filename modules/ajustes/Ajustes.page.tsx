import React from 'react';
import ModulePlaceholder from '../ModulePlaceholder';

const AjustesPage: React.FC = () => {
  return (
    <ModulePlaceholder
      title="Ajustes do Sistema"
      description="Configure as permissões, dados fiscais, financeiros e identidade visual."
      submodules={[
        { label: 'Dados da Empresa', path: '/ajustes/empresa', status: 'pronto' },
        { label: 'Contas Bancárias', path: '/ajustes/contas-bancarias', status: 'pronto' },
        { label: 'Saldo Inicial', path: '/ajustes/saldo-inicial', status: 'pronto' },
        { label: 'Site Público', path: '/ajustes/site-publico', status: 'pronto' },
        { label: 'Usuários e Acessos', path: '/ajustes/usuarios', status: 'pronto' },
        { label: 'Marca D\'água', path: '/ajustes/marca-dagua', status: 'pronto' },
        { label: 'Quadro de Sócios', path: '/ajustes/socios', status: 'pronto' },
        { label: 'Logs de Sistema', path: '/ajustes/logs', status: 'pronto' },
        { label: 'Backup e API', status: 'desenvolvimento' }
      ]}
    />
  );
};

export default AjustesPage;
