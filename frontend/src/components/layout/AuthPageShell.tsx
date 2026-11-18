import Link from 'next/link';
import { Bot, HeartHandshake, ShieldCheck, ShoppingBag, Sparkles } from 'lucide-react';
import AuthForm from '@/components/AuthForm';

export function AuthPageShell({ mode }: { mode: 'login' | 'register' }) {
  const isLogin = mode === 'login';
  return (
    <main className="market-container">
      <div className="market-auth-shell">
        <div className="market-auth-art">
          <div><span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-xs font-bold"><Sparkles size={15} /> YummIA</span><h2 className="mt-9">A melhor parte do seu dia começa aqui.</h2><p>Descubra novos sabores, organize seu carrinho e faça pedidos com mais praticidade.</p></div>
          <div className="relative z-10 grid gap-4 mt-8 text-sm font-semibold">
            <span className="flex gap-3 items-center"><ShoppingBag size={20} /> Diversos restaurantes em um lugar</span>
            <span className="flex gap-3 items-center"><Bot size={20} /> Assistente de compras inteligente</span>
            <span className="flex gap-3 items-center"><ShieldCheck size={20} /> Você confirma cada alteração</span>
          </div>
        </div>
        <div className="market-auth-form">
          <span className="market-eyebrow">{isLogin ? 'Bem-vindo de volta' : 'Comece agora'}</span>
          <h1 className="mt-3">{isLogin ? 'Entre na sua conta' : 'Crie sua conta'}</h1>
          <p>{isLogin ? 'Acesse seus pedidos, endereços e conversas.' : 'Cadastre-se para começar uma nova experiência de compras.'}</p>
          <div className="mt-2"><AuthForm mode={mode} /></div>
          <div className="border-t border-[#f4e6e8] pt-5 mt-6 text-sm text-[#7c6b70]">
            {isLogin ? 'Ainda não possui uma conta?' : 'Já possui uma conta?'}{' '}
            <Link href={isLogin ? '/register' : '/login'} className="font-extrabold text-[#bb1c2a] hover:underline">{isLogin ? 'Cadastre-se' : 'Fazer login'}</Link>
          </div>
          <p className="flex items-center gap-2 text-xs mt-7 text-[#a18e94]"><HeartHandshake size={15} /> Seus dados de acesso não são expostos ao assistente.</p>
        </div>
      </div>
    </main>
  );
}
