
import React, { useState, useEffect } from 'react';
import { IUsuario, UserRole } from '../usuarios.types';

interface FormUsuarioProps {
  initialData?: IUsuario | null;
  onSubmit: (data: Partial<IUsuario>) => void;
  onCancel: () => void;
}

const FormUsuario: React.FC<FormUsuarioProps> = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Partial<IUsuario>>({
    nome: '',
    sobrenome: '',
    cpf: '',
    email: '',
    senha: '',
    telefone: '',
    role: 'OPERADOR',
    ativo: true
  });
  const [confirmSenha, setConfirmSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmSenha, setShowConfirmSenha] = useState(false);

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData, senha: '' });
      setConfirmSenha('');
      return;
    }

    setFormData({
      nome: '',
      sobrenome: '',
      cpf: '',
      email: '',
      senha: '',
      telefone: '',
      role: 'OPERADOR',
      ativo: true
    });
    setConfirmSenha('');
  }, [initialData]);

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'Vazia', color: 'bg-slate-200' };
    if (pwd.length < 6) return { score: 1, label: 'Fraca (Mín. 6)', color: 'bg-rose-500' };

    let strength = 1;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;

    if (strength <= 2) return { score: 2, label: 'Razoável', color: 'bg-amber-500' };
    if (strength <= 4) return { score: 3, label: 'Boa', color: 'bg-blue-500' };
    return { score: 4, label: 'Forte', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(formData.senha || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    let val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    if (name === 'cpf') {
      val = formatCPF(val as string);
    }

    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!initialData && !formData.email) {
      alert('E-mail é obrigatório para cadastrar o usuário.');
      return;
    }

    if (initialData && formData.senha && formData.senha.length > 0 && formData.senha.length < 6) {
      alert('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (initialData && formData.senha && formData.senha !== confirmSenha) {
      alert('As senhas não coincidem!');
      return;
    }

    if (!initialData && !formData.nome) {
      alert('Nome é obrigatório para cadastrar o usuário.');
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest">
            {initialData ? 'Editar Acesso' : 'Novo Usuário do Sistema'}
          </h3>
          <p className="text-slate-500 text-sm">Defina as credenciais e permissões do colaborador.</p>
        </div>

        <div className="flex items-center space-x-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
          <span className={`text-[10px] font-black uppercase tracking-wider ${formData.ativo ? 'text-emerald-600' : 'text-slate-400'}`}>
            {formData.ativo ? 'Acesso Ativo' : 'Acesso Inativo'}
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="ativo"
              checked={formData.ativo}
              onChange={handleChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-widest">Nome *</label>
            <input
              type="text"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-widest">Sobrenome</label>
            <input
              type="text"
              name="sobrenome"
              value={formData.sobrenome}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-widest">E-mail (Login) *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-widest">CPF</label>
            <input
              type="text"
              name="cpf"
              value={formData.cpf}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
              placeholder="000.000.000-00"
            />
          </div>
        </div>

        {initialData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-widest">Nova Senha (Opcional)</label>
              <div className="relative">
                <input
                  type={showSenha ? "text" : "password"}
                  name="senha"
                  value={formData.senha}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                >
                  {showSenha ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>

              <div className="mt-2 px-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-black uppercase text-slate-400">Força da Senha</span>
                  <span className={`text-[9px] font-black uppercase ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-full flex-1 transition-all duration-500 ${i <= strength.score ? strength.color : 'bg-slate-200'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-widest">Confirmar Nova Senha</label>
              <div className="relative">
                <input
                  type={showConfirmSenha ? "text" : "password"}
                  value={confirmSenha}
                  onChange={(e) => setConfirmSenha(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmSenha(!showConfirmSenha)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                >
                  {showConfirmSenha ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start space-x-3 mb-6">
            <div className="text-amber-500 mt-0.5">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h4 className="text-xs font-black text-amber-900 uppercase tracking-widest">Geração de Senha Segura</h4>
              <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                A senha de acesso será gerada automaticamente de forma segura. Após a criação, <b>copie as credenciais geradas</b> e repasse ao usuário. Ele será obrigado a alterar a senha no primeiro acesso.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-widest">Nível de Acesso</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold appearance-none"
            >
              <option value="ADMIN">Administrador Full</option>
              <option value="GESTOR">Gestor de Módulo</option>
              <option value="OPERADOR">Operador Padrão</option>
              <option value="VENDEDOR">Vendedor / PDV</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-widest">Telefone</label>
            <input
              type="text"
              name="telefone"
              value={formData.telefone}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-6 mt-8 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-8 py-3 text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-10 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
          >
            {initialData ? 'Salvar Alterações' : 'Criar Acesso'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormUsuario;
