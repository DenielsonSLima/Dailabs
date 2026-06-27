
import React, { useState } from 'react';

interface LoginFormProps {
  onSubmit: (email: string, pass: string) => void;
  onForgotPassword: (email: string) => void;
  isLoading: boolean;
  isResetLoading: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, onForgotPassword, isLoading, isResetLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-[10px] font-black text-white/70 uppercase mb-2 tracking-widest ml-1">E-mail</label>
        <div className="relative group">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-black/40 group-focus-within:text-black transition-colors z-10 transition-transform duration-300 group-focus-within:scale-110">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
            </svg>
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder-white/30 focus:bg-white/10 focus:border-white/30 focus:ring-2 focus:ring-white/20 outline-none transition-all font-bold backdrop-blur-sm"
            placeholder="exemplo@nexus.com"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-black text-white/70 uppercase mb-2 tracking-widest ml-1">Senha de Acesso</label>
        <div className="relative group">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-black/40 group-focus-within:text-black transition-colors z-10 transition-transform duration-300 group-focus-within:scale-110">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </span>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-sm text-white placeholder-white/30 focus:bg-white/10 focus:border-white/30 focus:ring-2 focus:ring-white/20 outline-none transition-all font-mono backdrop-blur-sm"
            placeholder="••••••••"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/40 hover:text-white transition-colors z-20"
            title={showPassword ? "Ocultar senha" : "Ver senha"}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <label className="flex items-center space-x-2 cursor-pointer group">
          <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0" />
          <span className="text-xs font-bold text-white/60 group-hover:text-white transition-colors">Lembrar acesso</span>
        </label>
        <button
          type="button"
          onClick={() => onForgotPassword(email)}
          disabled={isResetLoading || isLoading}
          className="text-xs font-black text-white/80 hover:text-white hover:underline uppercase tracking-tighter transition-colors disabled:opacity-50"
        >
          {isResetLoading ? 'Enviando...' : 'Esqueceu a senha?'}
        </button>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-white text-[#004691] py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-black/20 hover:bg-emerald-400 hover:text-emerald-950 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center space-x-3"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-[#004691]/30 border-t-[#004691] rounded-full animate-spin" />
        ) : (
          <span>Entrar no Sistema</span>
        )}
      </button>
    </form>
  );
};

export default LoginForm;
