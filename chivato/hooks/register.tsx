import { atom, read, update } from 'claude-code'
import type { Register, SessionRateLimit, TurnUsage } from 'claude-code'

import type { Agente, Medida } from '../types'

// El chivato: en directo, cuánto llevas de tu límite, cuánto ocupa la conversación
// y qué gasta cada agente con qué modelo.

const PANE = 'chivato-consumo'
const TITULO = 'El chivato · consumo'

const medida = atom({ plugin: 'chivato', key: 'medida' } as const, null)
const principal = atom({ plugin: 'chivato', key: 'principal' } as const, { nombre: 'Principal', modelo: '', tokens: 0 })
const agentes = atom({ plugin: 'chivato', key: 'agentes' } as const, {})

const corto = (modelo: string) => {
  const m = modelo.toLowerCase().match(/opus|sonnet|haiku|fable/)

  return m ? m[0] : modelo.replace(/^claude-/, '').slice(0, 10)
}

const total = (u: TurnUsage) =>
  u.input_tokens + u.output_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.', ',')} M` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`

const barra = (pct: number, ancho = 12) => {
  const lleno = Math.max(0, Math.min(ancho, Math.round((pct / 100) * ancho)))

  return '█'.repeat(lleno) + '░'.repeat(ancho - lleno)
}

const colorDe = (pct: number) => (pct >= 85 ? 'error' : pct >= 60 ? 'warning' : 'success')

const NOMBRE_LIMITE: Record<string, string> = { five_hour: 'Límite 5 h', seven_day: 'Semana', spend_limit: 'Gasto' }

const cuando = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const dia = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][d.getDay()]
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')

  return `se renueva ${dia} ${hh}:${mm}`
}

const guardarMedida = (limites: SessionRateLimit[], tokens: number | undefined, ventana: number, usd?: number): Medida => ({
  limites: limites.map(l => ({ tipo: l.kind, pct: l.percentUsed, renueva: l.resetsAt })),
  contextoTokens: tokens ?? 0,
  contextoVentana: ventana,
  usd,
})

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'chivato', description: 'Abre el chivato: tu límite, el contexto y el gasto de cada agente' })
    await $.command.register({ name: 'mods', description: 'Qué mods tienes puestos y cómo se usan' })
    void $.ui.open({ id: PANE, title: TITULO })

    return next(e)
  })

  // Cada vez que cambian el límite, el contexto o el coste.
  on('session.measure', async ($, e, next) => {
    await update($, medida, () => guardarMedida(e.rateLimits, e.context.tokens, e.context.window, e.cost?.usd))

    return next(e)
  })

  // Cuando Claude lanza un subagente, apuntamos su nombre y su modelo.
  on('agent.spawn', async ($, e, next) => {
    const r = await next(e)
    if (r.deny === undefined && r.agentId) {
      const id = r.agentId
      const nombre = (e.subagentType && e.subagentType !== 'general-purpose' ? e.subagentType.replace(/^.*:/, '') : '') || e.description || 'agente'
      await update($, agentes, lista => ({ ...lista, [id]: { nombre: nombre.slice(0, 18), modelo: corto(r.model), tokens: lista[id]?.tokens ?? 0 } }))
    }

    return r
  }).catch(($, e, next) => next(e)) // si el panel falla, el agente arranca igual

  // Al terminar cada turno, sumamos lo que ha gastado quien lo hizo.
  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    const u = e.usage
    if (!u) return r

    if (e.agentId === undefined) {
      await update($, principal, p => ({ ...p, modelo: corto(u.model), tokens: p.tokens + total(u) }))
    } else {
      const id = e.agentId
      await update($, agentes, lista => {
        const a: Agente = lista[id] ?? { nombre: 'agente', modelo: corto(u.model), tokens: 0 }

        return { ...lista, [id]: { ...a, modelo: corto(u.model), tokens: a.tokens + total(u) } }
      })
    }

    return r
  })

  on('command.run', { command: 'chivato' }, async $ => {
    const { isPlaced } = await $.ui.open({ id: PANE, title: TITULO })

    return { text: isPlaced ? '📊 Chivato abierto.' : '📊 Chivato listo: ábrelo desde la lista de paneles.' }
  })

  on('command.run', { command: 'mods' }, () => ({
    text: [
      '🧩 Tus mods:',
      '🐕 El sabueso: busca tus archivos con Haiku, que gasta mucho menos. /sabueso para ver cuántas búsquedas lleva.',
      '🔥 El termo: te avisa antes de que la caché se enfríe y de cuánto relee tu próximo mensaje. /termo para ver el estado.',
      '📊 El chivato: tu límite, el contexto y lo que gasta cada agente, en directo. /chivato para abrirlo.',
    ].join('\n'),
  }))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const m = await read($, medida)
    const p = await read($, principal)
    const lista = Object.values(await read($, agentes))
    const filas: Agente[] = [p, ...lista].filter(a => a === p || a.tokens > 0)
    const maximo = Math.max(1, ...filas.map(a => a.tokens))
    const ctxPct = m && m.contextoVentana > 0 ? (m.contextoTokens / m.contextoVentana) * 100 : 0

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text bold>TU LÍMITE</Text>
          {(!m || m.limites.length === 0) && <Text dimColor>Aparece tras el primer mensaje (solo con suscripción Pro o Max).</Text>}
          {m?.limites.map(l => (
            <Box gap={1}>
              <Text>{(NOMBRE_LIMITE[l.tipo] ?? l.tipo).padEnd(11)}</Text>
              <Text color={colorDe(l.pct)}>{barra(l.pct)}</Text>
              <Text bold>{`${Math.round(l.pct)} %`}</Text>
              <Text dimColor>{cuando(l.renueva)}</Text>
            </Box>
          ))}
        </Box>

        <Box flexDirection="column">
          <Text bold>CONTEXTO</Text>
          <Box gap={1}>
            <Text color={colorDe(ctxPct)}>{barra(ctxPct)}</Text>
            <Text>{m ? `${fmt(m.contextoTokens)} de ${fmt(m.contextoVentana)}` : '—'}</Text>
          </Box>
        </Box>

        <Box flexDirection="column">
          <Text bold>QUIÉN GASTA</Text>
          {filas.map(a => (
            <Box gap={1}>
              <Text>{a.nombre.padEnd(12)}</Text>
              <Text color={a.modelo === 'haiku' ? 'success' : a.modelo === 'opus' ? 'claude' : 'suggestion'}>{(a.modelo || '·').padEnd(7)}</Text>
              <Text color="claude">{barra((a.tokens / maximo) * 100, 10)}</Text>
              <Text>{fmt(a.tokens)}</Text>
            </Box>
          ))}
          <Text dimColor>Tokens que ha movido cada uno en esta sesión.</Text>
        </Box>

        {m?.usd !== undefined && (
          <Box flexDirection="column">
            <Text dimColor>{`Si pagaras por uso (API o créditos extra): ${m.usd.toFixed(2).replace('.', ',')} $`}</Text>
            <Text dimColor>Con tu cuota de Pro o Max no lo pagas: tu cuota sale mucho más barata.</Text>
          </Box>
        )}
      </Box>
    )
  })
}
