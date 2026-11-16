declare module 'claude-code' {
  interface PluginState {
    termo: {
      /** Cuándo terminó la última respuesta de la conversación principal (ms), o null. */
      ultimo: number | null
      /** Tokens que relee el próximo mensaje (el contexto actual). */
      tokens: number
      /** Minutos que dura la caché: 5 o 60. */
      ttlMin: number
      /** Si ya ha avisado de que queda 1 minuto. */
      avisado: boolean
      /** Si frena el primer mensaje con la caché fría. */
      freno: boolean
      /** Si ya ha frenado una vez desde que se enfrió. */
      frenado: boolean
    }
  }
}
