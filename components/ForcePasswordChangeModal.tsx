import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth.store';
import { AuthService } from '../modules/auth/auth.service';

interface ForcePasswordChangeModalProps {
    onSuccess: () => void;
    onLogout: () => void;
    mode?: 'first_access' | 'recovery';
}

const ForcePasswordChangeModal: React.FC<ForcePasswordChangeModalProps> = ({ onSuccess, onLogout, mode = 'first_access' }) => {
    const { session, profile } = useAuthStore();
    const [senha, setSenha] = useState('');
    const [confirmSenha, setConfirmSenha] = useState('');
    const [showSenha, setShowSenha] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Lógica de força de senha
    const calculateStrength = (pass: string) => {
        let score = 0;
        if (!pass) return { score: 0, label: 'Vazia', color: 'bg-slate-200' };
        if (pass.length >= 6) score += 1;
        if (pass.match(/[A-Z]/)) score += 1;
        if (pass.match(/[0-9]/)) score += 1;
        if (pass.match(/[^A-Za-z0-9]/)) score += 1;

        if (score <= 1) return { score, label: 'Fraca', color: 'bg-rose-500' };
        if (score === 2) return { score, label: 'Razoável', color: 'bg-amber-500' };
        if (score === 3) return { score, label: 'Boa', color: 'bg-indigo-500' };
        return { score, label: 'Forte', color: 'bg-emerald-500' };
    };

    const strength = calculateStrength(senha);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (senha.length < 6) {
            setError('A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        if (senha !== confirmSenha) {
            setError('As senhas não coincidem!');
            return;
        }

        setLoading(true);

        try {
            await AuthService.updateCurrentUserPassword(senha);

            // 2. Atualizar o profile para tirar a flag de force_password_change
            const profileId = profile?.id || session?.user?.id;
            if (profileId) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ force_password_change: false })
                    .eq('id', profileId);

                if (profileError) throw profileError;
            }

            onSuccess();
        } catch (err: any) {
            console.error('Erro ao atualizar senha:', err);
            setError(err.message || 'Ocorreu um erro ao atualizar sua senha.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">

                {/* Header Visual */}
                <div className="bg-indigo-600 p-8 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-white/10 blur-3xl rounded-full"></div>

                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl mb-4 relative z-10">
                        <svg className="w-10 h-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>

                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase relative z-10">
                        {mode === 'recovery' ? 'Redefinir Senha' : 'Segurança em 1º Lugar'}
                    </h2>
                    <p className="text-indigo-100 text-sm mt-2 text-center relative z-10 opacity-90">
                        {mode === 'recovery'
                            ? 'Crie uma nova senha para voltar a acessar o sistema com segurança.'
                            : 'Bem-vindo! Para sua segurança, é obrigatório criar uma nova senha no seu primeiro acesso.'}
                    </p>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">

                    {error && (
                        <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-sm font-medium flex items-start flex-col">
                            <span className="font-black text-[10px] uppercase tracking-widest mb-1">Acesso Negado</span>
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Sua Nova Senha</label>
                        <div className="relative">
                            <input
                                type={showSenha ? "text" : "password"}
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                                placeholder="Mínimo 6 caracteres"
                                required
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

                        {/* Password Strength Indicator */}
                        {senha.length > 0 && (
                            <div className="mt-3 px-1 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Força da Senha</span>
                                    <span className={`text-[9px] font-black uppercase tracking-wider ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</span>
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
                        )}
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Confirme a Senha</label>
                        <input
                            type={showSenha ? "text" : "password"}
                            value={confirmSenha}
                            onChange={(e) => setConfirmSenha(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                            placeholder="Digite novamente"
                            required
                        />
                    </div>

                    <div className="pt-4 flex flex-col space-y-3">
                        <button
                            type="submit"
                            disabled={loading || senha.length < 6 || senha !== confirmSenha}
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex justify-center items-center h-[52px]"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                'Salvar Nova Senha'
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={onLogout}
                            disabled={loading}
                            className="w-full py-4 bg-white border-2 border-slate-100 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 hover:border-rose-100 hover:text-rose-500 transition-all flex justify-center items-center h-[52px]"
                        >
                            Sair da Conta
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ForcePasswordChangeModal;
