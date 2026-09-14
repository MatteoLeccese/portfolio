<!-- scripts/prepare-fonts.md -->
# Preparación de los ficheros de Montserrat

Documentación, **no un script ejecutable**: el procedimiento requiere `python3` + `fonttools`, que
ni CI ni el Dockerfile instalan, y una descarga puntual desde Google Fonts. Se ejecuta a mano, en
local, y **sólo** cuando se sube la versión de la fuente. Los ficheros resultantes se commitean.

La tipografía del sitio es **Montserrat**, elegida por el propietario del sitio, y se usa en **toda
la página** —cuerpo de texto y titulares—, no sólo en los títulos. No hay una segunda familia.

`next/font/local` **no subsetea nada**: sirve el fichero que se le dé. El Montserrat variable
completo pesa 745 KB en TTF, así que lo que se sirve al navegador tiene que ser un subset
preparado de antemano. De ahí este documento.

El proyecto **no usa `next/font/google`**: eso haría que cada build (CI y Vercel) dependiera de la
red y de que Google responda, y de todos modos acaba auto-alojando el fichero. Se descarga una vez,
a mano, y se versiona. El coste es este procedimiento manual.

---

## 1. Qué hay ahora en el repositorio

Todo vive en `src/lib/assets/fonts/`. Propiedades verificadas con `fontTools` sobre los ficheros
reales, no copiadas de ninguna ficha de Google:

| Fichero | Tamaño | md5 |
|---|---|---|
| `Montserrat-Variable-latin.woff2` | 37 956 B | `311d352d93230ece04b34eaa8ad10d08` |
| `Montserrat-Variable.ttf` | 744 936 B | `ef2306ad45ba56fcc5c30ea7d9f0ddab` |
| `OFL.txt` | 4 400 B | `2fdec60339ef243dcaca42a0c7bce717` |

| Dato | `…-latin.woff2` | `…-Variable.ttf` |
|---|---|---|
| Formato | WOFF2 | TrueType (`0x00010000`) |
| Versión (nameID 5) | `Version 9.000` | `Version 9.000` |
| Eje variable | `wght` 100 – 900 | `wght` 100 – 900 |
| Instancia por defecto | `wght` = 100 | `wght` = 100 |
| Glifos | 322 | 2 747 |
| Puntos de código en `cmap` | 232 (subset `latin` de Google) | 1 312 |
| `unitsPerEm` | 1000 | 1000 |
| `ascent` / `descent` / `lineGap` | 968 / −251 / 0 | 968 / −251 / 0 |

Cubre inglés y español completo (á é í ó ú ü ñ ¿ ¡), el euro y la puntuación tipográfica, que es lo
que el sitio necesita.

> **Aviso sobre el nombre de la familia.** El `name table` declara `Montserrat Thin` en el nameID 1,
> porque en las builds variables de Google la instancia por defecto es `wght=100`. Es normal y no
> indica que el fichero esté mal: con `next/font/local` el nombre de la familia lo genera Next a
> partir de la llamada de `src/lib/fonts.ts`, no del fichero. La única consecuencia real está en el
> apartado 5 (métricas del fallback).

---

## 2. De dónde salió exactamente cada fichero

Descarga puntual autorizada por el propietario del sitio. Es la **única** vez que el proyecto toca
la red para esto: ni el build ni CI vuelven a hacerlo.

### 2.1 El `.woff2` que se sirve

1. Pedir el CSS de Google Fonts, **con un User-Agent moderno** (con uno antiguo Google devuelve TTF
   en vez de WOFF2):

   ```bash
   curl -s -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36" \
     "https://fonts.googleapis.com/css2?family=Montserrat:wght@100..900&display=swap"
   ```

2. En la respuesta hay un bloque por subset. Coger el `src: url(...)` del bloque comentado
   `/* latin */` —no el de `latin-ext`, ni `cyrillic`, ni `vietnamese`— y descargar esa URL a
   `src/lib/assets/fonts/Montserrat-Variable-latin.woff2`.

   La URL de `fonts.gstatic.com` lleva un hash que cambia con cada versión de la fuente, así que
   **no se fija aquí**: hay que leerla del CSS en el momento de regenerar. `latin-ext` añadiría
   peso para caracteres que este sitio no usa.

### 2.2 El `.ttf` y la licencia

Del repositorio oficial `google/fonts`, directorio `ofl/montserrat/`:

| Origen | Destino |
|---|---|
| `ofl/montserrat/Montserrat[wght].ttf` | `src/lib/assets/fonts/Montserrat-Variable.ttf` |
| `ofl/montserrat/OFL.txt` | `src/lib/assets/fonts/OFL.txt` |

El `OFL.txt` se copia **literal**: el texto de una licencia no se reescribe ni se resume.

---

## 3. Regenerar o volver a subsetear

Requiere `python3` y `fonttools` (`pip install fonttools brotli`).

Si el subset que sirve Google deja de valer (por ejemplo, si hiciera falta algún carácter que no
trae), se genera uno propio a partir del TTF variable, que ya está en el repositorio y **no hace
falta volver a descargar**:

```bash
pyftsubset src/lib/assets/fonts/Montserrat-Variable.ttf \
  --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD" \
  --layout-features="kern,liga,calt,tnum" \
  --flavor=woff2 \
  --output-file=src/lib/assets/fonts/Montserrat-Variable-latin.woff2
```

Dos avisos sobre esto:

- El subset `latin` de Google **no es byte a byte** lo que produce esta lista de `--unicodes`. Al
  regenerarlo el fichero cambiará de tamaño y de md5 aunque la versión de la fuente sea la misma.
  Es normal y no es un error.
- `pyftsubset` conserva el eje `wght` mientras no se le pase `--instancer` ni `--drop-tables=fvar`.
  Si el fichero resultante deja de ser variable, la web pierde todos los pesos menos uno.

Después, **siempre**:

1. `npm run test` — `src/lib/fonts.test.ts` lee los ficheros reales del disco y comprueba firma de
   formato, presupuesto de peso (110 KB, el de §11), techo del subset latino (60 KB) y presencia de
   `OFL.txt`.
2. Renombrar el fichero **sólo** si se cambia también la ruta en `src/lib/fonts.ts`: el nombre
   `Montserrat-Variable-latin.woff2` está escrito en tres sitios (el `src` del `localFont`, el test
   y este documento).

---

## 4. Para qué está el `.ttf`

**satori**, el renderizador que hay detrás de `next/og`, **no sabe leer WOFF2**: hay que pasarle un
búfer TTF o OTF. Por eso `Montserrat-Variable.ttf` está en el repositorio aunque **nunca se sirva al
navegador** y no lo referencie `src/lib/fonts.ts`. Lo leerá con `readFile` la imagen OG de §11.4.

Es el juego completo (2 747 glifos) y variable. Si alguna vez molesta su peso en el bundle de
servidor, se puede instanciar a un peso fijo —sigue sin descargar nada— con:

```bash
fonttools varLib.instancer src/lib/assets/fonts/Montserrat-Variable.ttf wght=600 \
  -o src/lib/assets/fonts/Montserrat-SemiBold.ttf
```

No se ha hecho todavía: §11 aún no está escrita y no se sabe qué pesos necesitará la tarjeta.

---

## 5. Métricas y fallback sin CLS

`src/lib/fonts.ts` declara `adjustFontFallback: "Arial"`. Para una fuente **local** Next no usa
ninguna tabla precalculada: pasa el fichero por `fontkit` y calcula el `@font-face` de respaldo a
partir de sus métricas reales, así que los números se recalculan solos al cambiar de fuente.

Métricas del fichero committeado (coinciden exactamente con la tabla capsize de Next):

| | valor |
|---|---|
| `ascent` | 968 |
| `descent` | −251 |
| `lineGap` | 0 |
| `unitsPerEm` | 1000 |
| `xWidthAvg` | 503 (0,503 em) |

Y esto es lo que Next emite con ellas para el respaldo `local(Arial)`:

```
size-adjust: 110.19%;  ascent-override: 87.85%;  descent-override: 22.78%;  line-gap-override: 0.00%;
```

**Matiz conocido:** `fontkit` mide los anchos de la instancia por defecto del fichero, que aquí es
`wght=100` (apartado 1). Para el cuerpo de texto, que se pinta a 400, el `size-adjust` ideal sería
`113.90%`. La diferencia es de ~3 % de ancho medio y no hay opción en `next/font/local` para
afinarla; corregirla exigiría `adjustFontFallback: false` y un `@font-face` de respaldo escrito a
mano en `globals.css`. No compensa.

---

## 6. Licencia

Montserrat se distribuye bajo la **SIL Open Font License 1.1**, que **exige distribuir el texto de
la licencia junto a los ficheros de fuente**.

`src/lib/assets/fonts/OFL.txt` es esa copia, literal, tomada de `ofl/montserrat/` en `google/fonts`.
**Debe viajar siempre con los `.woff2`/`.ttf`**: no se borra, no se mueve a otro directorio y no se
sustituye por un enlace. `src/lib/fonts.test.ts` falla si desaparece o si deja de contener el texto
de la OFL 1.1.

La OFL no obliga a mostrar la licencia en la interfaz del sitio, sólo a distribuirla con los
ficheros, que es lo que hace el repositorio.

---

## 7. Contratos con el código

| Contrato | Valor |
|---|---|
| Export de `src/lib/fonts.ts` | `sans` (nombre de rol, neutro ante cambios de tipografía) |
| Variable CSS que declara | `--font-montserrat` |
| Quien monta la clase | `src/app/layout.tsx`: `<html className={sans.variable}>` |
| Quien la consume | `src/app/globals.css`: `--font-sans: var(--font-montserrat, ui-sans-serif), …` |
| Rango de pesos declarado | `100 900` (el eje real del fichero) |
| `display` | `swap` |

Son **tres** eslabones, no dos, y el del medio es el que se olvida. El `import { sans }` de
`layout.tsx` es lo que mete este módulo en el grafo compilado: sin él `next/font/local` ni se
ejecuta —no hay `@font-face`, no hay `.woff2` en `.next/static/media/` y `--font-montserrat` no
la declara nadie— y aun así `npm run build` sale en verde. Cuando la fase 2 reescriba el layout
tiene que conservar el import y la clase.

Ninguna de las dos roturas lanza un error, así que hay dos redes:

- `src/lib/fonts.test.ts`, bloque `font wiring`. Lee los tres ficheros como texto y saca el nombre
  de la variable de `fonts.ts` en vez de codificarlo, así que sobrevive al próximo cambio de
  tipografía y sigue detectando la deriva.
- El fallback **dentro** del `var()`. Si `--font-montserrat` no existiera, la sustitución falla y
  con ella se invalida el valor entero de `--font-sans`, lista de reserva incluida: `<body>`
  heredaría el `font-family` inicial, que en todo navegador es una serif. Con el segundo argumento
  la rotura degrada a la pila del sistema, que es lo que esta tabla promete.

Comprobación manual de un vistazo tras cualquier cambio de fuente:

```bash
npm run build && find .next -iname "*.woff2"
```

---

## 8. Resumen de ficheros

| Fichero | Estado | Para qué |
|---|---|---|
| `src/lib/assets/fonts/Montserrat-Variable-latin.woff2` | **presente** (37 956 B) | lo único que se sirve al navegador, vía `next/font/local` |
| `src/lib/assets/fonts/Montserrat-Variable.ttf` | **presente** (744 936 B) | satori (`next/og`), §11.4; nunca se sirve |
| `src/lib/assets/fonts/OFL.txt` | **presente** (4 400 B) | obligación legal de la SIL OFL 1.1 |
