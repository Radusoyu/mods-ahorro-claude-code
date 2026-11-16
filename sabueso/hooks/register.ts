import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

// El sabueso: lo fácil (buscar) se lo lleva Haiku; lo difícil se queda en tu modelo.
// No cambia el modelo de la conversación principal (eso releería toda la
// conversación sin caché): solo pone a buscar un sabueso que ya nace en Haiku.
// No reescribe ninguna llamada: así el modo automático la revisa una sola vez.

const busquedas = atom({ plugin: 'sabueso', key: 'busquedas' } as const, 0)

const PROMPT = `Eres el sabueso: un buscador rápido y barato.
Tu único trabajo es ENCONTRAR: archivos, carpetas, funciones, textos o configuraciones dentro del proyecto.
- Usa Glob para nombres de archivo y Grep para contenido. Lee solo los trozos necesarios.
- No edites nada y no opines sobre el código.
- Responde corto: la ruta de cada hallazgo con su número de línea y una frase de qué hay ahí.
- Si no lo encuentras, di dónde has mirado.`

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.agent.register({
      name: 'buscador',
      description:
        'Úsalo SIEMPRE que haya que buscar o localizar archivos, carpetas, funciones o textos en el proyecto. Corre en Haiku, que gasta mucho menos límite. Devuelve rutas y líneas.',
      prompt: PROMPT,
      tools: ['Glob', 'Grep', 'Read'],
      model: 'haiku',
    })
    await $.command.register({
      name: 'sabueso',
      description: 'Cuántas búsquedas ha hecho el sabueso con Haiku',
    })

    return next(e)
  })

  // El buscador genérico de serie se retira: las búsquedas pasan por el sabueso.
  on('agent.offer', { agent: 'Explore' }, () => ({ isOffered: false }))

  // Solo cuenta: deja la llamada tal cual.
  on('tool.call', { tool: 'Agent' }, async ($, e, next) => {
    if (e.subagent_type === 'sabueso:buscador') {
      await update($, busquedas, n => n + 1)
      $.ui.status('🐕 sabueso: buscando con Haiku')
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'sabueso' }, async $ => {
    const n = await read($, busquedas)

    return {
      text:
        n === 0
          ? '🐕 El sabueso está listo. Aún no ha buscado nada con Haiku en esta sesión.'
          : `🐕 El sabueso ha hecho ${n} búsqueda${n === 1 ? '' : 's'} con Haiku en esta sesión.`,
    }
  })
}
