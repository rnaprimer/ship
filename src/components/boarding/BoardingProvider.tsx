"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type BoardingState = { code: string | null; setCode: (code: string | null) => void };

const BoardingContext = createContext<BoardingState | null>(null);

/**
 * Holds the validated boarding code in memory only, between /board and
 * /board/username. It is never written to storage or a URL. A reload drops
 * it, and the player re-enters the code (nothing was consumed yet).
 */
export function BoardingProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState<string | null>(null);
  return <BoardingContext.Provider value={{ code, setCode }}>{children}</BoardingContext.Provider>;
}

export function useBoarding(): BoardingState {
  const ctx = useContext(BoardingContext);
  if (!ctx) throw new Error("useBoarding must be used inside <BoardingProvider>");
  return ctx;
}
