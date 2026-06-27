
import { supabase } from '../../../lib/supabase';
import { IUsuario } from './usuarios.types';

export const UsuariosService = {
  /**
   * Busca perfis na tabela public.profiles.
   * Tratamento aprimorado para erros de recursão de RLS.
   */
  async getAll(): Promise<IUsuario[]> {
    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('id, nome, sobrenome, cpf, telefone, role, avatar_url, email, ativo, force_password_change')
        .order('nome', { ascending: true });

      if (error) {
        // Se houver erro 500, provavelmente é a recursão de política no banco
        if (status === 500 || error.message.includes('recursion')) {
          throw new Error("Falha Crítica de RLS: Recursão infinita detectada nas políticas do banco de dados.");
        }
        console.error(`Erro Supabase [${status}]:`, error.message);
        return [];
      }

      return (data || []).map(u => ({
        ...u,
        created_at: new Date().toISOString()
      })) as IUsuario[];
    } catch (err: any) {
      console.error('Erro ao listar usuários:', err.message);
      throw err; // Repassa para a Page tratar a UI
    }
  },

  /**
   * Salva ou atualiza um usuário.
   */
  async save(usuario: Partial<IUsuario>): Promise<{ tempPassword?: string } | void> {
    const isNew = !usuario.id;
    const email = usuario.email?.trim().toLowerCase();

    if (isNew) {
      if (!email) {
        throw new Error("E-mail é obrigatório para criar um novo usuário.");
      }

      // 1. Chamar a Edge Function 'admin-create-user' para não sobrescrever a sessão atual
      const { data: authData, error: authError } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email,
          nome: usuario.nome,
          sobrenome: usuario.sobrenome,
          telefone: usuario.telefone,
          cpf: usuario.cpf,
          role: usuario.role,
          ativo: usuario.ativo !== undefined ? usuario.ativo : true
        }
      });

      if (authError) {
        console.error("Edge Function Error:", authError);
        throw new Error(`Erro ao criar usuário: ${authError.message || JSON.stringify(authError)}`);
      }

      if (authData?.error) {
        throw new Error(`Erro ao criar usuário: ${authData.error}`);
      }

      // Retornar a senha provisória apenas na criação
      return { tempPassword: authData.tempPassword };

    } else {
      const { data, error } = await supabase.functions.invoke('admin-update-user', {
        body: {
          userId: usuario.id,
          email,
          password: usuario.senha || undefined,
          nome: usuario.nome,
          sobrenome: usuario.sobrenome,
          cpf: usuario.cpf,
          telefone: usuario.telefone,
          role: usuario.role,
          ativo: usuario.ativo !== undefined ? usuario.ativo : true
        }
      });

      if (error) {
        console.error("Edge Function Update Error:", error);
        throw new Error(`Erro ao atualizar usuário: ${error.message}`);
      }

      if (data?.error) {
        throw new Error(`Erro ao atualizar usuário: ${data.error}`);
      }
    }
  },

  async toggleStatus(id: string, currentStatus: boolean): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ ativo: !currentStatus })
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    // 1. Proteção absoluta para o usuário de TI
    const { data: profile } = await supabase.from('profiles').select('email').eq('id', id).single();
    if (profile?.email === 'denielsonlima201099@gmail.com') {
      throw new Error("Acesso protegido: O usuário raiz do sistema não pode ser excluído.");
    }

    // 2. Verifica lançamentos em vendas
    const { count: countVendas, error: errVendas } = await supabase
      .from('venda_pedidos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id);

    // Verifica lançamentos em compras
    const { count: countCompras, error: errCompras } = await supabase
      .from('cmp_pedidos')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id);

    if ((countVendas && countVendas > 0) || (countCompras && countCompras > 0)) {
      throw new Error("Este usuário possui lançamentos (vendas/compras) vinculados no sistema e não pode ser excluído. Em vez disso, apenas inative o acesso.");
    }

    // Chama a função segura no banco de dados para excluir da auth.users
    const { error } = await supabase.rpc('delete_user_completely', { user_id: id });

    if (error) {
      if (error.code === '23503' || error.message?.includes('foreign key constraint')) {
        throw new Error("Este usuário possui registros vinculados no banco de dados e não pode ser excluído.");
      }
      throw error;
    }
  },

  subscribeToChanges(callback: () => void) {
    return supabase
      .channel('public:profiles_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        callback
      )
      .subscribe();
  },

  unsubscribeFromChanges(channel: any) {
    supabase.removeChannel(channel);
  }
};
