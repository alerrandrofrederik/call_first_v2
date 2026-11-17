import { createBrowserRouter, RouterProvider, NavLink, Outlet } from 'react-router';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Sheet, SheetContent, SheetHeader, SheetTitle, useIsMobile } from '@databricks/appkit-ui/react';
import { Bot, LayoutDashboard, ListOrdered, Layers, Menu, Moon, PhoneCall, Sun } from 'lucide-react';
import { VisaoGeralPage } from './pages/VisaoGeralPage';
import { FilaDoDiaPage } from './pages/FilaDoDiaPage';
import { AgentePage } from './pages/AgentePage';
import { PlataformaPage } from './pages/PlataformaPage';
import { VersaoProvider } from './lib/versao';

interface NavItem {
  to: string;
  label: string;
  hint: string;
  icon: ReactNode;
}

const GRUPOS: { titulo: string; itens: NavItem[] }[] = [
  {
    titulo: 'Operação',
    itens: [
      { to: '/', label: 'Visão do Gestor', hint: 'Funil · Intenção · Canal', icon: <LayoutDashboard className="h-4 w-4" /> },
      { to: '/fila', label: 'Fila do Dia', hint: '20 leads · 5 por vendedor', icon: <ListOrdered className="h-4 w-4" /> },
    ],
  },
  {
    titulo: 'Inteligência',
    itens: [{ to: '/agente', label: 'Agente', hint: 'AI/BI Genie', icon: <Bot className="h-4 w-4" /> }],
  },
  {
    titulo: 'Plataforma',
    itens: [{ to: '/plataforma', label: 'Da fonte à decisão', hint: 'SDP · UC · AI Functions', icon: <Layers className="h-4 w-4" /> }],
  },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-6">
      {GRUPOS.map((grupo) => (
        <div key={grupo.titulo}>
          <div className="px-3 mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase text-slate-400">{grupo.titulo}</div>
          <div className="flex flex-col gap-1">
            {grupo.itens.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-start gap-3 rounded-md px-3 py-2 transition-colors ${
                    isActive ? 'bg-white/10 text-white ring-1 ring-white/15' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <span className="mt-0.5">{item.icon}</span>
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-[11px] text-slate-400">{item.hint}</span>
                </span>
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function StatusServicos() {
  return (
    <div className="grid grid-cols-2 gap-y-1.5 text-xs text-slate-300">
      {['SQL Warehouse', 'Genie', 'AI Functions', 'Unity Catalog'].map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          {s}
        </span>
      ))}
    </div>
  );
}

function Marca() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-sky-500 flex items-center justify-center text-white">
        <PhoneCall className="h-5 w-5" />
      </div>
      <div>
        <div className="text-white font-semibold leading-tight">Call First</div>
        <div className="text-xs text-slate-400">Atlas Software · Comercial</div>
      </div>
    </div>
  );
}

function useTema() {
  const [escuro, setEscuro] = useState(() => {
    const raiz = document.documentElement.classList;
    if (raiz.contains('dark')) return true;
    if (raiz.contains('light')) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const alternar = () => {
    const proximo = !escuro;
    document.documentElement.classList.toggle('dark', proximo);
    document.documentElement.classList.toggle('light', !proximo);
    setEscuro(proximo);
  };
  return { escuro, alternar };
}

function Layout() {
  const isMobile = useIsMobile();
  const [menuAberto, setMenuAberto] = useState(false);
  const { escuro, alternar } = useTema();

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col gap-8 bg-[#0b1736] px-4 py-6">
      <Marca />
      <div className="flex-1 overflow-y-auto">
        <SidebarNav onNavigate={onNavigate} />
      </div>
      <StatusServicos />
      <button
        type="button"
        onClick={alternar}
        className="flex items-center justify-center gap-2 rounded-md border border-white/15 py-2 text-sm text-slate-200 hover:bg-white/5"
      >
        {escuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        {escuro ? 'Tema claro' : 'Tema escuro'}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:block w-64 shrink-0 sticky top-0 h-screen">{sidebar()}</aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center gap-3 px-4 md:px-8 py-3 border-b">
          <div className="md:hidden">
            <Sheet open={menuAberto && isMobile} onOpenChange={setMenuAberto}>
              <Button variant="ghost" size="icon" onClick={() => setMenuAberto(true)}>
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menu</span>
              </Button>
              <SheetContent side="left" className="p-0 w-72 border-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                {sidebar(() => setMenuAberto(false))}
              </SheetContent>
            </Sheet>
          </div>
          <span className="ml-auto rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
            Demo · dados 100% sintéticos
          </span>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <VisaoGeralPage /> },
      { path: '/fila', element: <FilaDoDiaPage /> },
      { path: '/agente', element: <AgentePage /> },
      { path: '/plataforma', element: <PlataformaPage /> },
    ],
  },
]);

export default function App() {
  return (
    <VersaoProvider>
      <RouterProvider router={router} />
    </VersaoProvider>
  );
}
