import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

// El termo: la caché guarda tu conversación unos minutos. Si se enfría,
// tu siguiente mensaje (aunque sea un «hola») vuelve a enviarla entera y gasta límite.
// El mod no puede leer la caché: la calcula con el reloj y aprende si dura 5 o 60 min.

const ultimo = atom({ plugin: 'termo', key: 'ultimo' } as const, null)
const tokens = atom({ plugin: 'termo', key: 'tokens' } as const, 0)
const ttlMin = atom({ plugin: 'termo', key: 'ttlMin' } as const, 5)
const avisado = atom({ plugin: 'termo', key: 'avisado' } as const, false)
const freno = atom({ plugin: 'termo', key: 'freno' } as const, false)
const frenado = atom({ plugin: 'termo', key: 'frenado' } as const, false)

const MIN = 60_000
const MINIMO_PARA_AVISAR = 20_000 // por debajo, releer no se nota

const fmt = (n: number) => Math.round(n).toLocaleString('es-ES')

export const register: Register = on => {
  let enMarcha = false // hay una respuesta en curso: la caché se está usando
  let inicioTurno = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'termo',
      description: 'Estado de la caché. «/termo 5» o «/termo 60» fija los minutos; «/termo freno» activa o quita el freno',
    })

    $.clock.every(15_000, () => {
      void (async () => {
        const fin = await read($, ultimo)
        if (fin === null || enMarcha) return
        const total = (await read($, ttlMin)) * MIN
        const resto = total - ((await $.clock.now()) - fin)
        const t = await read($, tokens)

        if (resto > 0) {
          const min = Math.floor(resto / MIN)
          $.ui.status(min >= 1 ? `🔥 caché caliente · quedan ${min} min` : '🔥 caché caliente · menos de 1 min')
          if (resto <= MIN && !(await read($, avisado)) && t >= MINIMO_PARA_AVISAR) {
            await update($, avisado, () => true)
            $.ui.toast(`⏰ Termo: la caché se enfría en 1 minuto. Si vas a seguir, escribe ahora.`, { timeoutMs: 15_000 })
          }
        } else {
          $.ui.status(`🧊 caché fría · tu próximo mensaje relee ${fmt(t)} tokens`)
        }
      })()
    })

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      enMarcha = true
      inicioTurno = await $.clock.now()
    }

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.command !== undefined || e.isMeta) return next(e)
    const fin = await read($, ultimo)
    const t = await read($, tokens)
    if (fin === null || t < MINIMO_PARA_AVISAR) return next(e)

    const fria = (await $.clock.now()) - fin > (await read($, ttlMin)) * MIN
    if (!fria) return next(e)

    if ((await read($, freno)) && !(await read($, frenado))) {
      await update($, frenado, () => true)

      return {
        drop: `🧊 Termo: la caché se ha enfriado y este mensaje releería ${fmt(t)} tokens. Si quieres seguir con esta conversación, envíalo otra vez. Si vas a cambiar de tema, /clear empieza de cero y gasta mucho menos.`,
      }
    }

    $.ui.toast(`🧊 Termo: la caché estaba fría. Este mensaje relee ${fmt(t)} tokens.`, { timeoutMs: 10_000 })

    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (e.agentId !== undefined) return r

    enMarcha = false
    const ahora = await $.clock.now()
    const fin = await read($, ultimo)
    const antes = await read($, tokens)

    // Aprende cuánto dura la caché: tras una pausa de entre 5 y 60 min,
    // si el mensaje tuvo que reescribir casi todo, la caché era de 5 min.
    if (fin !== null && e.usage && antes > MINIMO_PARA_AVISAR) {
      const pausa = inicioTurno - fin
      if (pausa > 5.5 * MIN && pausa < 59 * MIN) {
        const reescrito = e.usage.cache_creation_input_tokens + e.usage.input_tokens
        await update($, ttlMin, () => (reescrito > antes * 0.5 ? 5 : 60))
      }
    }

    const uso = await $.session.usage()
    await update($, ultimo, () => ahora)
    await update($, tokens, () => uso.context.tokens ?? 0)
    await update($, avisado, () => false)
    await update($, frenado, () => false)
    $.ui.status(`🔥 caché caliente · quedan ${await read($, ttlMin)} min`)

    return r
  })

  on('command.run', { command: 'termo' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === '5' || arg === '60') {
      await update($, ttlMin, () => Number(arg))

      return { text: `⏰ Termo: la caché dura ${arg} minutos.` }
    }
    if (arg === 'freno') {
      const ahora = await update($, freno, f => !f)

      return {
        text: ahora
          ? '🛑 Freno activado: con la caché fría, el primer mensaje se para y te dice cuánto relee. Si lo envías otra vez, pasa.'
          : '⏰ Freno quitado: solo te aviso.',
      }
    }

    const fin = await read($, ultimo)
    const ttl = await read($, ttlMin)
    const t = await read($, tokens)
    if (fin === null) return { text: `🔥 Termo listo. La caché dura ${ttl} min. Aún no hay conversación que vigilar.` }
    const resto = ttl * MIN - ((await $.clock.now()) - fin)

    return {
      text:
        resto > 0
          ? `🔥 Caché caliente: quedan ${Math.max(1, Math.ceil(resto / MIN))} min de ${ttl}. Tu conversación ocupa ${fmt(t)} tokens.`
          : `🧊 Caché fría: tu próximo mensaje relee ${fmt(t)} tokens. Si cambias de tema, /clear gasta mucho menos.`,
    }
  })
}
