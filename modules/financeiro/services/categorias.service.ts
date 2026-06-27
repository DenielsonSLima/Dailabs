import { supabase } from '../../../lib/supabase';
import { ICategoriaFinanceira } from '../financeiro.types';

export const CategoriasService = {
    async getCategorias(): Promise<ICategoriaFinanceira[]> {
        const { data, error } = await supabase
            .from('fin_categorias')
            .select('id, nome, tipo, natureza')
            .order('nome');
        if (error) throw error;
        return data as ICategoriaFinanceira[];
    },

    async saveCategoria(payload: Omit<ICategoriaFinanceira, 'id'>): Promise<ICategoriaFinanceira> {
        const { data, error } = await supabase
            .from('fin_categorias')
            .insert({
                nome: payload.nome.trim().toUpperCase(),
                tipo: payload.tipo,
                natureza: payload.natureza
            })
            .select('id, nome, tipo, natureza')
            .single();

        if (error) throw error;
        return data as ICategoriaFinanceira;
    }
};
