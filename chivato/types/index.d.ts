export type Limite = { tipo: string; pct: number; renueva?: string }

export type Medida = {
  limites: Limite[]
  contextoTokens: number
  contextoVentana: number
  usd?: number
}

export type Agente = { nombre: string; modelo: string; tokens: number }

declare module 'claude-code' {
  interface PluginState {
    chivato: {
      medida: Medida | null
      principal: Agente
      agentes: Record<string, Agente>
    }
  }
}
