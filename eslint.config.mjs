// eslint.config.mjs
import stylistic from "@stylistic/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

/*
 * Colour vocabulary the gradient-stop patterns require after `from-`, `via-` and `to-`.
 */
const TW_COLORS = [
  "inherit",
  "current",
  "transparent",
  "black",
  "white",
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "primary",
  "secondary",
  "accent",
  "muted",
  "background",
  "foreground",
  "card",
  "popover",
  "border",
  "input",
  "ring",
  "brand",
  "danger",
].join("|");

/*
 * Matches every form of gradient: the CSS gradient functions, the Tailwind gradient,
 * background-clip and edge-mask utilities, the shimmer utilities and `<linearGradient>`.
 * The leading lookbehind lets prefixed variants match too (`dark:bg-clip-text`,
 * `md:bg-linear-to-r`).
 */
const GRADIENT_RE = new RegExp(
  "(?<![-\\w])(" +
    "bg-(gradient|linear|radial|conic)" +
    "|bg-clip-text" +
    "|mask-[tblrxy]-(from|to)-" +
    "|shimmer(-[a-z]+)?(?![-\\w])" +
    `|(from|via|to)-(${TW_COLORS})(?![a-z])` +
    "|(linear|radial|conic)-gradient\\(" +
    "|background-clip:\\s*text" +
    "|--tw-gradient-" +
    "|<linearGradient" +
    ")",
);

/* Matches the `transition-all` utility as a standalone class. */
const TRANSITION_ALL_RE = new RegExp("(?<![-\\w])transition-all(?![-\\w])");

const GRADIENT_MSG =
  "Prohibido: este proyecto no usa gradientes. Ver documentation/conventions/no-gradients.md";
const TRANSITION_MSG =
  "Prohibido `transition-all`: se declara cada propiedad que anima.";
const SCROLL_MSG =
  "Prohibido escuchar `scroll`: usa IntersectionObserver o una animación CSS.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  /* ── Formatting: the @stylistic rules, in their double-quote variant ─────────── */
  {
    plugins: { "@stylistic": stylistic },
    rules: {
      "@stylistic/semi": [
        "error",
        "always",
        { omitLastInOneLineClassBody: true },
      ],
      "@stylistic/eol-last": [ "error", "always" ],
      "no-dupe-else-if": "error",
      "no-duplicate-imports": "error",
      "@stylistic/no-multiple-empty-lines": [ "error", { max: 2 } ],
      "@stylistic/no-trailing-spaces": [ "error", { skipBlankLines: false } ],
      "@stylistic/quotes": [
        "error",
        "double",
        { allowTemplateLiterals: "always" },
      ],
      "@stylistic/arrow-spacing": [ "error", { before: true, after: true } ],
      "@stylistic/array-bracket-spacing": [ "error", "always" ],
      "@stylistic/computed-property-spacing": [ "error", "always" ],
      "@stylistic/no-multi-spaces": "error",
      "@stylistic/semi-spacing": [ "error", { before: false, after: true } ],
      "@stylistic/comma-spacing": [ "error", { before: false, after: true } ],
      "@stylistic/space-in-parens": [ "error", "never" ],
      "@stylistic/key-spacing": [
        "error",
        { beforeColon: false, afterColon: true },
      ],
      "@stylistic/keyword-spacing": [ "error", { before: true, after: true } ],
      "@stylistic/space-before-function-paren": [ "error", "always" ],
      "@stylistic/block-spacing": [ "error", "always" ],
      "@stylistic/no-whitespace-before-property": "error",
      "@stylistic/wrap-regex": "error",
      "@stylistic/object-property-newline": [
        "error",
        { allowAllPropertiesOnSameLine: true },
      ],
      "@stylistic/object-curly-spacing": [ "error", "always" ],
      "@stylistic/lines-around-comment": [
        "error",
        { beforeBlockComment: true },
      ],
      "@stylistic/lines-between-class-members": [ "error", "always" ],
      "@stylistic/indent": [ "error", 2 ],
      "@stylistic/space-infix-ops": "error",
      "@stylistic/function-call-spacing": [ "error", "never" ],
      "@stylistic/type-annotation-spacing": [
        "error",
        {
          before: false,
          after: true,
          overrides: { arrow: { before: true, after: true } },
        },
      ],
      "@stylistic/member-delimiter-style": [
        "error",
        {
          multiline: { delimiter: "semi", requireLast: true },
          singleline: { delimiter: "semi", requireLast: true },
          overrides: {
            interface: {
              multiline: { delimiter: "semi", requireLast: true },
              singleline: { delimiter: "semi", requireLast: true },
            },
          },
        },
      ],
      "@stylistic/jsx-quotes": [ "error", "prefer-double" ],
      "@stylistic/jsx-curly-brace-presence": [
        "error",
        { props: "ignore", children: "ignore", propElementValues: "always" },
      ],
      "@stylistic/jsx-curly-spacing": [
        "error",
        "never",
        { allowMultiline: true, spacing: { objectLiterals: "never" } },
      ],
      "@stylistic/jsx-equals-spacing": [ "error", "never" ],
      "@stylistic/jsx-pascal-case": "error",
      "@stylistic/jsx-closing-tag-location": "error",
      "@stylistic/jsx-curly-newline": [
        "error",
        { multiline: "consistent", singleline: "consistent" },
      ],
      "@stylistic/jsx-first-prop-new-line": [ "error", "multiline-multiprop" ],
      "@stylistic/jsx-self-closing-comp": [
        "error",
        { component: true, html: true },
      ],
      "@stylistic/jsx-tag-spacing": [ "error", { beforeSelfClosing: "always" } ],
      "@stylistic/jsx-wrap-multilines": [
        "error",
        {
          declaration: "parens-new-line",
          assignment: "parens-new-line",
          return: "parens-new-line",
          arrow: "parens-new-line",
          condition: "parens-new-line",
          logical: "parens-new-line",
          prop: "parens-new-line",
          propertyValue: "parens",
        },
      ],
    },
  },

  /* ── Type discipline. Applies to src/, scripts/ and tests/ alike. ──────────────── */
  {
    files: [ "src/**/*.{ts,tsx}", "scripts/**/*.ts", "tests/**/*.ts" ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-expect-error": "allow-with-description" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
    },
  },

  /* ── Hard style rules. The project's only no-restricted-syntax block, scoped to
     src/ so that the guard scripts, which must contain the forbidden patterns, are
     not matched by it. ──────────────────────────────────────────────────────────── */
  {
    files: [ "src/**/*.{ts,tsx}" ],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: `Literal[value=${GRADIENT_RE}]`, message: GRADIENT_MSG },
        {
          selector: `TemplateElement[value.raw=${GRADIENT_RE}]`,
          message: GRADIENT_MSG,
        },
        {
          selector: `Literal[value=${TRANSITION_ALL_RE}]`,
          message: TRANSITION_MSG,
        },
        {
          selector: `TemplateElement[value.raw=${TRANSITION_ALL_RE}]`,
          message: TRANSITION_MSG,
        },
        {
          selector: `CallExpression[callee.property.name="addEventListener"][arguments.0.value="scroll"]`,
          message: SCROLL_MSG,
        },
      ],
    },
  },

  /* ── Architecture: the one-way dependency rule ──────────────────────────────── */
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
        {
          type: "domain",
          pattern: "src/domains/*/*",
          capture: [ "domain", "layer" ],
        },
        // Declared before the `ui` element: the first pattern that matches decides the
        // type, so this keeps exception 3 down to a single file.
        {
          type: "social-icon",
          pattern: "src/components/common/SocialIcon.tsx",
          mode: "file",
        },
        { type: "ui", pattern: "src/components" },
        { type: "hooks", pattern: "src/hooks" },
        { type: "lib", pattern: "src/lib" },
        { type: "i18n", pattern: "src/i18n" },
        // Top-level files: proxy.ts and global.d.ts. Without this element no policy covers them.
        { type: "root", pattern: "src/*.ts", mode: "file" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            // `core` imports nothing but `lib/` and itself.
            {
              from: {
                element: { type: "domain", captured: { domain: "core" } },
              },
              allow: [
                { to: { element: { type: "lib" } } },
                {
                  to: {
                    element: { type: "domain", captured: { domain: "core" } },
                  },
                },
              ],
            },
            // Pure layers: no sibling domains, no framework.
            {
              from: {
                element: {
                  type: "domain",
                  captured: { layer: [ "content", "queries", "types" ] },
                },
              },
              allow: [
                { to: { element: { type: "lib" } } },
                {
                  to: {
                    element: {
                      type: "domain",
                      captured: {
                        domain: "core",
                        layer: [ "types", "config", "utils" ],
                      },
                    },
                  },
                },
                {
                  to: {
                    element: {
                      type: "domain",
                      captured: {
                        domain: "{{from.domain}}",
                        layer: [ "content", "queries", "types" ],
                      },
                    },
                  },
                },
              ],
            },
            // Presentation: `components` sees its whole domain.
            {
              from: {
                element: { type: "domain", captured: { layer: "components" } },
              },
              allow: [
                // `social-icon` is listed as a destination like any other src/components/
                // component: ContactChannels and SocialLinks render it.
                {
                  to: {
                    element: {
                      type: [ "ui", "social-icon", "hooks", "lib", "i18n" ],
                    },
                  },
                },
                {
                  to: {
                    element: { type: "domain", captured: { domain: "core" } },
                  },
                },
                {
                  to: {
                    element: {
                      type: "domain",
                      captured: { domain: "{{from.domain}}" },
                    },
                  },
                },
              ],
            },
            // Client and I/O layers: they cannot import `content/`.
            {
              from: {
                element: {
                  type: "domain",
                  captured: { layer: [ "hooks", "services", "actions" ] },
                },
              },
              allow: [
                { to: { element: { type: [ "lib", "i18n" ] } } },
                {
                  to: {
                    element: { type: "domain", captured: { domain: "core" } },
                  },
                },
                {
                  to: {
                    element: {
                      type: "domain",
                      captured: {
                        domain: "{{from.domain}}",
                        layer: [ "types", "services", "hooks", "queries" ],
                      },
                    },
                  },
                },
              ],
            },
            // `app/` is the only composition layer; it may import everything.
            {
              from: { element: { type: "app" } },
              allow: [
                {
                  to: {
                    element: {
                      type: [
                        "app",
                        "domain",
                        "ui",
                        "social-icon",
                        "hooks",
                        "lib",
                        "i18n",
                      ],
                    },
                  },
                },
              ],
            },
            // Generic UI knows no domain except `core`.
            {
              from: { element: { type: "ui" } },
              allow: [
                {
                  to: {
                    element: {
                      type: [ "ui", "social-icon", "hooks", "lib", "i18n" ],
                    },
                  },
                },
                {
                  to: {
                    element: { type: "domain", captured: { domain: "core" } },
                  },
                },
              ],
            },
            {
              from: { element: { type: "hooks" } },
              allow: [
                { to: { element: { type: [ "hooks", "lib", "i18n" ] } } },
                {
                  to: {
                    element: { type: "domain", captured: { domain: "core" } },
                  },
                },
              ],
            },
            // `lib/` is the lowest layer.
            {
              from: { element: { type: "lib" } },
              allow: [ { to: { element: { type: "lib" } } } ],
            },
            // `i18n/routing.ts` reads LOCALES from core/config: the only arrow into core.
            {
              from: { element: { type: "i18n" } },
              allow: [
                { to: { element: { type: [ "i18n", "lib" ] } } },
                {
                  to: {
                    element: { type: "domain", captured: { domain: "core" } },
                  },
                },
              ],
            },
            {
              from: { element: { type: "root" } },
              allow: [
                { to: { element: { type: [ "i18n", "lib" ] } } },
                {
                  to: {
                    element: { type: "domain", captured: { domain: "core" } },
                  },
                },
              ],
            },

            /* ── The three declared exceptions. They come LAST: policies are evaluated in
             order and the last match wins, so each one repeats the general permissions
             of its layer, which it replaces rather than extends. */

            // Exception 1: `Skill.icon` is typed with IconSlug, which lives in
            // skills/content/icons.ts. Type only, so it disappears at compile time.
            {
              from: {
                element: {
                  type: "domain",
                  captured: { domain: "profile", layer: "types" },
                },
              },
              allow: [
                { to: { element: { type: "lib" } } },
                {
                  to: {
                    element: { type: "domain", captured: { domain: "core" } },
                  },
                },
                {
                  to: {
                    element: {
                      type: "domain",
                      captured: { domain: "profile" },
                    },
                  },
                },
                {
                  to: {
                    element: {
                      type: "domain",
                      captured: { domain: "skills", layer: "content" },
                    },
                  },
                },
              ],
            },

            // Exception 2: SkillBadge renders BrandGlyph, which lives in profile/components.
            // Scoped to the folder, not to a single file.
            {
              from: {
                element: {
                  type: "domain",
                  captured: { domain: "skills", layer: "components" },
                },
              },
              allow: [
                {
                  to: {
                    element: {
                      type: [ "ui", "social-icon", "hooks", "lib", "i18n" ],
                    },
                  },
                },
                {
                  to: {
                    element: { type: "domain", captured: { domain: "core" } },
                  },
                },
                {
                  to: {
                    element: { type: "domain", captured: { domain: "skills" } },
                  },
                },
                {
                  to: {
                    element: {
                      type: "domain",
                      captured: {
                        domain: "profile",
                        layer: [ "components", "types" ],
                      },
                    },
                  },
                },
              ],
            },

            // Exception 3: SocialIcon routes a brand slug to BrandGlyph and "mail" to lucide.
            // The `from` is the `social-icon` element declared above with mode "file", which
            // holds the exception to that one file.
            {
              from: { element: { type: "social-icon" } },
              allow: [
                {
                  to: {
                    element: {
                      type: [ "ui", "social-icon", "hooks", "lib", "i18n" ],
                    },
                  },
                },
                {
                  to: {
                    element: { type: "domain", captured: { domain: "core" } },
                  },
                },
                {
                  to: {
                    element: {
                      type: "domain",
                      captured: {
                        domain: "profile",
                        layer: [ "components", "types" ],
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  },

  /* ── The import gate of src/: `motion` enters only through MotionIsland, and the
     `cn` package is not a dependency. Declared BEFORE the "pure data layers" block:
     rule options do not merge in flat config, and that block declares
     `no-restricted-imports` too, so the later declaration wins for the files it
     matches. ────────────────────────────────────────────────────────────────────── */
  {
    files: [ "src/**/*.{ts,tsx}" ],
    ignores: [ "src/components/motion/**" ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              // The patterns are anchored with a leading "/". `group` uses gitignore
              // semantics, where a pattern without a slash matches any path segment and
              // would also ban `@/lib/motion/*`. The leading slash pins the match to the
              // start of the specifier, so only the npm package matches.
              group: [
                "/motion",
                "/motion/*",
                "/framer-motion",
                "/framer-motion/*",
                "/motion-dom",
                "/motion-utils",
              ],
              message:
                "Importa m, AnimatePresence y los hooks desde @/components/motion/MotionIsland.",
            },
            {
              // shadcn@4.21.0 writes `import { cn } from "cn"` into every primitive it
              // generates and adds the package with a `^` range. Neither is used here.
              group: [ "cn" ],
              message:
                "cn() vive en @/lib/utils (clsx + tailwind-merge). El paquete `cn` no es una dependencia de este proyecto.",
            },
          ],
        },
      ],
    },
  },

  /* ── Purity of the data layers: no React, no Next, no motion ────────────────── */
  {
    files: [
      "src/domains/*/content/**",
      "src/domains/*/queries/**",
      "src/domains/*/types/**",
      "src/domains/core/config/**",
      "src/domains/core/utils/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react",
              message: "Capa pura de dominio: prohibido importar React.",
            },
            {
              name: "react-dom",
              message: "Capa pura de dominio: prohibido importar React.",
            },
            {
              name: "server-only",
              message:
                "`server-only` mata Vitest en esta capa. La barrera la da boundaries.",
            },
          ],
          patterns: [
            {
              group: [ "next/*", "motion", "motion/*" ],
              message:
                "Capa pura de dominio: prohibido importar React/Next/motion.",
            },
          ],
        },
      ],
    },
  },

  /*
   * Paths that are not source code. `.baseline/` holds backup copies made with `cp`,
   * including unpatched shadcn primitives that do not satisfy the formatting rules.
   */
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    ".baseline/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
