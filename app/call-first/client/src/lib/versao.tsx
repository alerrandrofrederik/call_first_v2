import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * As consultas do analytics ficam em cache por 1h, com os parâmetros na chave.
 * "versao" entra como parâmetro das consultas que mudam quando um lead é
 * marcado como contatado: incrementar força a releitura.
 */
interface VersaoCtx {
  versao: number;
  incrementar: () => void;
}

const Ctx = createContext<VersaoCtx>({ versao: 0, incrementar: () => undefined });

export function VersaoProvider({ children }: { children: ReactNode }) {
  const [versao, setVersao] = useState(() => Math.floor(Date.now() / 1000) % 1_000_000);
  const incrementar = useCallback(() => setVersao((v) => v + 1), []);
  const value = useMemo(() => ({ versao, incrementar }), [versao, incrementar]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useVersao() {
  return useContext(Ctx);
}
