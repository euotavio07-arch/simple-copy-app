import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import logoImg from '@/assets/logo-fotech-horizontal.png';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setSuccess('Conta criada! Verifique seu e-mail para confirmar.');
      }
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials'
        ? 'E-mail ou senha incorretos'
        : err.message === 'User already registered'
          ? 'Este e-mail já está cadastrado'
          : err.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src={logoImg} alt="FOTech Solutions" className="h-16 object-contain drop-shadow-lg" />
        </div>

        <div className="bg-card rounded-3xl p-8 apple-shadow-xl border border-border">
          <h2 className="text-xl font-bold text-foreground text-center mb-1">
            {isLogin ? 'Entrar' : 'Criar Conta'}
          </h2>
          <p className="text-xs text-muted-foreground text-center mb-8">
            {isLogin ? 'Acesse sua conta para continuar' : 'Preencha os dados para se cadastrar'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3.5 bg-secondary/60 border border-border/60 focus:border-primary rounded-xl outline-none text-sm font-medium transition-all placeholder:text-muted-foreground/40"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-12 py-3.5 bg-secondary/60 border border-border/60 focus:border-primary rounded-xl outline-none text-sm font-medium transition-all placeholder:text-muted-foreground/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <p className="text-xs text-destructive font-medium bg-destructive/5 px-4 py-2.5 rounded-xl">{error}</p>
            )}
            {success && (
              <p className="text-xs text-success font-medium bg-success/5 px-4 py-2.5 rounded-xl">{success}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-foreground text-background py-4 rounded-2xl font-semibold text-xs uppercase tracking-wider apple-shadow-md active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLogin ? 'Entrar' : 'Criar Conta'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
              className="text-xs text-primary font-semibold hover:underline transition-all"
            >
              {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
