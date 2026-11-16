# Mods de ahorro para Claude Code

Tres mods para que tu límite de Claude Code te dure más. No te dan más límite: te ayudan a gastarlo mejor.

| Mod | Qué hace | Comando |
|---|---|---|
| 🐕 **El sabueso** | Cuando Claude tiene que buscar archivos, funciones o textos en tu proyecto, se lo encarga a un buscador que corre en Haiku, el modelo pequeño. Opus se queda para pensar. | `/sabueso` (cuántas búsquedas lleva) |
| 🔥 **El termo** | La caché guarda tu conversación unos minutos. Si se enfría, tu siguiente mensaje vuelve a enviarla entera. El termo te avisa un minuto antes y te dice cuántos tokens relee. | `/termo` (estado), `/termo 5` o `/termo 60` (minutos), `/termo freno` |
| 📊 **El chivato** | Un panel en directo con tu límite (5 horas y semana), el contexto y lo que gasta cada agente y con qué modelo. | `/chivato` (abre el panel), `/mods` (lista los tres) |

## Lo que ahorra de verdad (medido)

Misma búsqueda, en sesiones nuevas de Claude Code, con y sin el sabueso (coste a precio de API; con Pro o Max no lo pagas, pero tu límite se gasta en la misma proporción):

- Búsquedas que obligan a dar vueltas por el proyecto: **la mitad** (−47 % y −57 %).
- Búsquedas directas, que se resuelven con una sola búsqueda: igual o algo más (+7 % y +25 %), porque delegar tiene su coste.
- En total, en 4 pruebas: **−30 %**. Es una muestra pequeña: tómalo como una señal, no como una promesa.

El termo y el chivato no ahorran por sí solos: avisan y enseñan. El ahorro llega si les haces caso (escribir antes de que se enfríe la caché, o `/clear` o `/compact` cuando cambias de tema).

## Qué necesitas

- **Claude Code actualizado** (los mods llegaron en la versión 2.1.287). Compruébalo con `claude --version` y actualiza si hace falta.
- Funciona en la terminal y en la pestaña Code de la app de escritorio de Claude.

## Cómo instalarlos

En una sesión de Claude Code en la terminal, escribe uno a uno:

```
/plugin install sabueso --marketplace Radusoyu/mods-ahorro-claude-code
/plugin install termo --marketplace Radusoyu/mods-ahorro-claude-code
/plugin install chivato --marketplace Radusoyu/mods-ahorro-claude-code
```

La primera vez te pregunta si quieres añadir el marketplace: responde `y`. Después elige dónde instalarlo (con Enter se instala para tu usuario, en todas tus sesiones).

Desde la línea de comandos, sin abrir Claude Code:

```
claude plugin install sabueso --marketplace Radusoyu/mods-ahorro-claude-code
claude plugin install termo --marketplace Radusoyu/mods-ahorro-claude-code
claude plugin install chivato --marketplace Radusoyu/mods-ahorro-claude-code
```

En la app de escritorio (donde `/plugin` no funciona): pulsa **+** junto a la caja de texto, luego **Plugins**, **Add marketplace** con `Radusoyu/mods-ahorro-claude-code`, y después **Add plugin** para cada uno.

Para comprobar que están puestos, escribe `/mods`.
