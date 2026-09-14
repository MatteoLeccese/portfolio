// eslint.config.mjs
import stylistic from "@stylistic/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

/*
 * Colour vocabulary used by the gradient-stop patterns. Requiring a real colour after
 * `from-`/`via-`/`to-` is what keeps anchors like `back-to-top` from tripping the rule.
 */
const TW_COLORS = [
  "inherit", "current", "transparent", "black", "white",
  "slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber", "yellow",
  "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet",
  "purple", "fuchsia", "pink", "rose",
  "primary", "secondary", "accent", "muted", "background", "foreground", "card",
  "popover", "border", "input", "ring", "brand", "danger",
].join("|");

/*
 * Hard rule number one: ZERO gradients, of any kind. The leading lookbehind catches
 * prefixed variants (`dark:bg-clip-text`, `md:bg-linear-to-r`). `mask-[tblrxy]-(from|to)-`
 * is in because Tailwind v4 edge masks emit a real linear-gradient. `shimmer-*` covers the
 * four opt-in utilities shipped by shadcn/tailwind.css.
 */
const GRADIENT_RE = new RegExp(
  "(?<![-\\w])("
  + "bg-(gradient|linear|radial|conic)"
  + "|bg-clip-text"
  + "|mask-[tblrxy]-(from|to)-"
  + "|shimmer(-[a-z]+)?(?![-\\w])"
  + `|(from|via|to)-(${TW_COLORS})(?![a-z])`
  + "|(linear|radial|conic)-gradient\\("
  + "|background-clip:\\s*text"
  + "|--tw-gradient-"
  + "|<linearGradient"
  + ")",
);

/* Hard rule number two: no `transition-all`. Only declared properties animate. */
const TRANSITION_ALL_RE = new RegExp("(?<![-\\w])transition-all(?![-\\w])");

const GRADIENT_MSG = "Prohibido: este proyecto no usa gradientes. Ver documentation/conventions/no-gradients.md";
const TRANSITION_MSG = "Prohibido `transition-all`: se declara cada propiedad que anima.";
const SCROLL_MSG = "Prohibido escuchar `scroll`: usa IntersectionObserver o una animación CSS.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  /* ── Formato: @stylistic en la variante de comillas dobles de code-style.md ──── */
  {
    plugins: { "@stylistic": stylistic },
    rules: {
      "@stylistic/semi": [ "error", "always", { omitLastInOneLineClassBody: true } ],
      "@stylistic/eol-last": [ "error", "always" ],
      "no-dupe-else-if": "error",
      "no-duplicate-imports": "error",
      "@stylistic/no-multiple-empty-lines": [ "error", { max: 2 } ],
      "@stylistic/no-trailing-spaces": [ "error", { skipBlankLines: false } ],
      "@stylistic/quotes": [ "error", "double", { allowTemplateLiterals: "always" } ],
      "@stylistic/arrow-spacing": [ "error", { before: true, after: true } ],
      "@stylistic/array-bracket-spacing": [ "error", "always" ],
      "@stylistic/computed-property-spacing": [ "error", "always" ],
      "@stylistic/no-multi-spaces": "error",
      "@stylistic/semi-spacing": [ "error", { before: false, after: true } ],
      "@stylistic/comma-spacing": [ "error", { before: false, after: true } ],
      "@stylistic/space-in-parens": [ "error", "never" ],
      "@stylistic/key-spacing": [ "error", { beforeColon: false, afterColon: true } ],
      "@stylistic/keyword-spacing": [ "error", { before: true, after: true } ],
      "@stylistic/space-before-function-paren": [ "error", "always" ],
      "@stylistic/block-spacing": [ "error", "always" ],
      "@stylistic/no-whitespace-before-property": "error",
      "@stylistic/wrap-regex": "error",
      "@stylistic/object-property-newline": [ "error", { allowAllPropertiesOnSameLine: true } ],
      "@stylistic/object-curly-spacing": [ "error", "always" ],
      "@stylistic/lines-around-comment": [ "error", { beforeBlockComment: true } ],
      "@stylistic/lines-between-class-members": [ "error", "always" ],
      "@stylistic/indent": [ "error", 2 ],
      "@stylistic/space-infix-ops": "error",
      "@stylistic/function-call-spacing": [ "error", "never" ],
      "@stylistic/type-annotation-spacing": [ "error", { before: false, after: true } ],
      "@stylistic/member-delimiter-style": [ "error", {
        multiline: { delimiter: "semi", requireLast: true },
        singleline: { delimiter: "semi", requireLast: true },
        overrides: {
          interface: {
            multiline: { delimiter: "semi", requireLast: true },
            singleline: { delimiter: "semi", requireLast: true },
          },
        },
      } ],
      "@stylistic/jsx-quotes": [ "error", "prefer-double" ],
      "@stylistic/jsx-curly-brace-presence": [ "error", { props: "ignore", children: "ignore", propElementValues: "always" } ],
      "@stylistic/jsx-curly-spacing": [ "error", "never", { allowMultiline: true, spacing: { objectLiterals: "never" } } ],
      "@stylistic/jsx-equals-spacing": [ "error", "never" ],
      "@stylistic/jsx-pascal-case": "error",
      "@stylistic/jsx-closing-tag-location": "error",
      "@stylistic/jsx-curly-newline": [ "error", { multiline: "consistent", singleline: "consistent" } ],
      "@stylistic/jsx-first-prop-new-line": [ "error", "multiline-multiprop" ],
      "@stylistic/jsx-self-closing-comp": [ "error", { component: true, html: true } ],
      "@stylistic/jsx-tag-spacing": [ "error", { beforeSelfClosing: "always" } ],
      "@stylistic/jsx-wrap-multilines": [ "error", {
        declaration: "parens-new-line",
        assignment: "parens-new-line",
        return: "parens-new-line",
        arrow: "parens-new-line",
        condition: "parens-new-line",
        logical: "parens-new-line",
        prop: "parens-new-line",
        propertyValue: "parens",
      } ],
    },
  },

  /* ── Disciplina de tipos. Alcance AMPLIO: src/, scripts/ y tests/ se escriben con la
     misma disciplina, y `tsc` ya los typechequea a los tres (12.2). ──────────────── */
  {
    files: [ "src/**/*.{ts,tsx}", "scripts/**/*.ts", "tests/**/*.ts" ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/ban-ts-comment": [ "error", { "ts-expect-error": "allow-with-description" } ],
      "@typescript-eslint/consistent-type-imports": [ "error", { prefer: "type-imports" } ],
    },
  },

  /* ── Reglas duras de estilo. UN SOLO bloque no-restricted-syntax en todo el
     proyecto, y acotado a src/ A PROPOSITO: scripts/check-style-rules.ts contiene
     necesariamente los patrones prohibidos y se auto-denunciaria. Ese fichero es el
     guardia, no el sospechoso. ──────────────────────────────────────────────────── */
  {
    files: [ "src/**/*.{ts,tsx}" ],
    rules: {
      "no-restricted-syntax": [ "error",
        { selector: `Literal[value=${GRADIENT_RE}]`, message: GRADIENT_MSG },
        { selector: `TemplateElement[value.raw=${GRADIENT_RE}]`, message: GRADIENT_MSG },
        { selector: `Literal[value=${TRANSITION_ALL_RE}]`, message: TRANSITION_MSG },
        { selector: `TemplateElement[value.raw=${TRANSITION_ALL_RE}]`, message: TRANSITION_MSG },
        {
          selector: `CallExpression[callee.property.name="addEventListener"][arguments.0.value="scroll"]`,
          message: SCROLL_MSG,
        },
      ],
    },
  },

  /* ── Arquitectura: la regla de dependencias unidireccional ──────────────────── */
  {
    files: [ "src/**/*.{ts,tsx}" ],
    plugins: { boundaries },
    settings: {
      "import/resolver": {
        typescript: { alwaysTryTypes: true, project: "./tsconfig.json" },
      },
      "boundaries/include": [ "src/**/*" ],
      "boundaries/elements": [
        { type: "app", pattern: "src/app" },
        { type: "domain", pattern: "src/domains/*/*", capture: [ "domain", "layer" ] },
        // ORDEN: este fichero va ANTES del elemento `ui`, porque el primer patron que casa
        // decide el tipo. Es lo que acota la Excepcion 3 a UN fichero en vez de a todo
        // src/components/**; sin el, la excepcion reemplazaria la politica de la ley 4.
        { type: "social-icon", pattern: "src/components/common/SocialIcon.tsx", mode: "file" },
        { type: "ui", pattern: "src/components" },
        { type: "hooks", pattern: "src/hooks" },
        { type: "lib", pattern: "src/lib" },
        { type: "i18n", pattern: "src/i18n" },
        // Top-level files: proxy.ts and global.d.ts. Without this they have no policy at all.
        { type: "root", pattern: "src/*.ts", mode: "file" },
      ],
    },
    rules: {
      "boundaries/dependencies": [ "error", {
        default: "disallow",
        policies: [
          // Ley 1: `core` no importa a nadie salvo `lib/` y a sí mismo.
          {
            from: { element: { type: "domain", captured: { domain: "core" } } },
            allow: [
              { to: { element: { type: "lib" } } },
              { to: { element: { type: "domain", captured: { domain: "core" } } } },
            ],
          },
          // Ley 6, capas puras + ley 2: nada de hermanos, nada de framework.
          {
            from: { element: { type: "domain", captured: { layer: [ "content", "queries", "types" ] } } },
            allow: [
              { to: { element: { type: "lib" } } },
              { to: { element: { type: "domain", captured: { domain: "core", layer: [ "types", "config", "utils" ] } } } },
              { to: { element: { type: "domain", captured: { domain: "{{from.domain}}", layer: [ "content", "queries", "types" ] } } } },
            ],
          },
          // Ley 6, presentación: `components` ve todo su dominio.
          {
            from: { element: { type: "domain", captured: { layer: "components" } } },
            allow: [
              // `social-icon` va en la lista porque es un componente de src/components/ como
              // cualquier otro: sacarlo del elemento `ui` acota quien puede SALIR de el, no
              // quien puede ENTRAR. ContactChannels y SocialLinks lo renderizan.
              { to: { element: { type: [ "ui", "social-icon", "hooks", "lib", "i18n" ] } } },
              { to: { element: { type: "domain", captured: { domain: "core" } } } },
              { to: { element: { type: "domain", captured: { domain: "{{from.domain}}" } } } },
            ],
          },
          // Ley 6, cliente y E/S: NO pueden importar `content/`.
          {
            from: { element: { type: "domain", captured: { layer: [ "hooks", "services", "actions" ] } } },
            allow: [
              { to: { element: { type: [ "lib", "i18n" ] } } },
              { to: { element: { type: "domain", captured: { domain: "core" } } } },
              {
                to: {
                  element: {
                    type: "domain",
                    captured: { domain: "{{from.domain}}", layer: [ "types", "services", "hooks", "queries" ] },
                  },
                },
              },
            ],
          },
          // Ley 5: `app/` es la única capa de composición; puede con todo.
          {
            from: { element: { type: "app" } },
            allow: [ { to: { element: { type: [ "app", "domain", "ui", "social-icon", "hooks", "lib", "i18n" ] } } } ],
          },
          // Ley 4: la UI genérica no conoce dominios, salvo el kernel. Esta politica ya NO
          // la reemplaza ninguna excepcion: SocialIcon.tsx es su propio elemento.
          {
            from: { element: { type: "ui" } },
            allow: [
              { to: { element: { type: [ "ui", "social-icon", "hooks", "lib", "i18n" ] } } },
              { to: { element: { type: "domain", captured: { domain: "core" } } } },
            ],
          },
          {
            from: { element: { type: "hooks" } },
            allow: [
              { to: { element: { type: [ "hooks", "lib", "i18n" ] } } },
              { to: { element: { type: "domain", captured: { domain: "core" } } } },
            ],
          },
          // Ley 3: `lib/` es la capa más baja.
          {
            from: { element: { type: "lib" } },
            allow: [ { to: { element: { type: "lib" } } } ],
          },
          // `i18n/routing.ts` consume LOCALES de core/config: es la única flecha hacia core.
          {
            from: { element: { type: "i18n" } },
            allow: [
              { to: { element: { type: [ "i18n", "lib" ] } } },
              { to: { element: { type: "domain", captured: { domain: "core" } } } },
            ],
          },
          {
            from: { element: { type: "root" } },
            allow: [
              { to: { element: { type: [ "i18n", "lib" ] } } },
              { to: { element: { type: "domain", captured: { domain: "core" } } } },
            ],
          },

          /* ── Las tres excepciones declaradas de 5.6.1. Van AL FINAL: las politicas se
             evaluan en orden y gana la ultima que casa. Cada una repite el permiso
             general de su capa, porque reemplaza a la politica anterior, no la amplia. */

          // Excepcion 1: `Skill.icon` se tipa con IconSlug, que el arbol canonico coloca
          // en skills/content/icons.ts. Solo tipo: desaparece al compilar.
          {
            from: { element: { type: "domain", captured: { domain: "profile", layer: "types" } } },
            allow: [
              { to: { element: { type: "lib" } } },
              { to: { element: { type: "domain", captured: { domain: "core" } } } },
              { to: { element: { type: "domain", captured: { domain: "profile" } } } },
              { to: { element: { type: "domain", captured: { domain: "skills", layer: "content" } } } },
            ],
          },

          // Excepcion 2: SkillBadge renderiza BrandGlyph, que vive en profile/components.
          // Esta SI queda a nivel de carpeta, y es una decision: skills/components son cuatro
          // ficheros de una sola capa de un solo dominio, y la septima violacion deliberada de
          // 5.8.3 cubre el caso peligroso. Acotarla a SkillBadge.tsx obligaria a declarar otro
          // elemento de fichero y a listarlo como destino en cinco politicas, para cerrar una
          // arista entre hermanos que ya comparten dominio.
          {
            from: { element: { type: "domain", captured: { domain: "skills", layer: "components" } } },
            allow: [
              { to: { element: { type: [ "ui", "social-icon", "hooks", "lib", "i18n" ] } } },
              { to: { element: { type: "domain", captured: { domain: "core" } } } },
              { to: { element: { type: "domain", captured: { domain: "skills" } } } },
              { to: { element: { type: "domain", captured: { domain: "profile", layer: [ "components", "types" ] } } } },
            ],
          },

          // Excepcion 3: SocialIcon enruta marca -> BrandGlyph, "mail" -> lucide.
          // Unica violacion de la ley 4, y acotada a UN FICHERO de verdad: el `from` es el
          // elemento `social-icon`, declarado arriba con mode "file". Con
          // `from: { element: { type: "ui" } }` esta politica reemplazaria a la de la ley 4 y
          // cualquier componente generico podria importar profile sin que el lint dijera nada.
          {
            from: { element: { type: "social-icon" } },
            allow: [
              { to: { element: { type: [ "ui", "social-icon", "hooks", "lib", "i18n" ] } } },
              { to: { element: { type: "domain", captured: { domain: "core" } } } },
              { to: { element: { type: "domain", captured: { domain: "profile", layer: [ "components", "types" ] } } } },
            ],
          },
        ],
      } ],
    },
  },

  /* ── La puerta de imports de src/. La declara §7.11 (motion solo entra por su puerta)
     y §4 le anade el segundo grupo (el paquete `cn` esta descartado, §4.4).
     ORDEN: va ANTES del bloque "Pureza de las capas de datos". Las opciones de una
     regla no se fusionan en flat config, y ese bloque tambien declara
     `no-restricted-imports`: si este quedara detras, las capas puras perderian la
     prohibicion de react/react-dom/server-only. Delante, la capa pura conserva su
     bloque completo (que ya prohibe `motion`) y el resto de src/ queda cubierto por
     este. ────────────────────────────────────────────────────────────────────── */
  {
    files: [ "src/**/*.{ts,tsx}" ],
    ignores: [ "src/components/motion/**" ],
    rules: {
      "no-restricted-imports": [ "error", {
        patterns: [
          {
            group: [ "motion", "motion/*", "framer-motion", "framer-motion/*", "motion-dom", "motion-utils" ],
            message: "Importa m, AnimatePresence y los hooks desde @/components/motion/MotionIsland.",
          },
          {
            // shadcn@4.21.0 genera `import { cn } from "cn"` en cada primitivo y anade el
            // paquete con rango `^`. Las dos cosas estan descartadas (§4.4, §6.7.2 paso 5).
            // Sin esta regla, regenerar un primitivo lo reintroduce en silencio.
            group: [ "cn" ],
            message: "cn() vive en @/lib/utils (clsx + tailwind-merge). El paquete `cn` no es una dependencia de este proyecto.",
          },
        ],
      } ],
    },
  },

  /* ── Pureza de las capas de datos: sin React, sin Next, sin motion ──────────── */
  {
    files: [
      "src/domains/*/content/**",
      "src/domains/*/queries/**",
      "src/domains/*/types/**",
      "src/domains/core/config/**",
      "src/domains/core/utils/**",
    ],
    rules: {
      "no-restricted-imports": [ "error", {
        paths: [
          { name: "react", message: "Capa pura de dominio: prohibido importar React." },
          { name: "react-dom", message: "Capa pura de dominio: prohibido importar React." },
          { name: "server-only", message: "`server-only` mata Vitest en esta capa. La barrera la da boundaries." },
        ],
        patterns: [
          {
            group: [ "next/*", "motion", "motion/*" ],
            message: "Capa pura de dominio: prohibido importar React/Next/motion.",
          },
        ],
      } ],
    },
  },

  /*
   * `.baseline/` no es codigo fuente: son copias de respaldo con `cp` (el proyecto no usa
   * git, asi que sustituyen a `git diff`/`git checkout` en los criterios de aceptacion).
   * Contiene los primitivos de shadcn SIN parchear, que a proposito violan el formato.
   */
  globalIgnores([ ".next/**", "out/**", "build/**", ".baseline/**", "next-env.d.ts" ]),
]);

export default eslintConfig;
