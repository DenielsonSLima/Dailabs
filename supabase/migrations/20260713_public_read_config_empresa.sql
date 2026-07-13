-- Migration: Allow Public Read Access to config_empresa Table
-- Date: 2026-07-13
-- Objetivo: Permitir que usuários não autenticados (visitantes do site público) possam ler os dados de contato e informações básicas da concessionária.

CREATE POLICY public_read_config_empresa ON public.config_empresa
    FOR SELECT
    TO public
    USING (true);
