// src/domains/legal/content/cookies.ts
import type { LegalDocument } from "../types";

/**
 * The cookie policy, in both languages. `{domain}` and `{ownerEmail}` are resolved at
 * render time by resolveSitePlaceholders(). The section marked `block: "cookie-table"`
 * renders COOKIE_REGISTRY at that point.
 */
export const cookiePolicy: LegalDocument = {
  slug: "cookies",
  title: { en: "Cookie Policy", es: "Política de Cookies" },
  updatedAt: "2026-09-11",
  intro: {
    en: [
      "This policy explains which cookies {domain} uses, what each one is for, and how you can control them. It is short because this site uses very few cookies.",
      "In plain terms: this site sets exactly one cookie, it only appears if you click the light/dark theme switch, and it stores nothing but the word \"light\" or \"dark\".",
    ],
    es: [
      "Esta política explica qué cookies utiliza {domain}, para qué sirve cada una y cómo puedes controlarlas. Es breve porque este sitio usa muy pocas cookies.",
      "Dicho de forma directa: este sitio instala exactamente una cookie, sólo aparece si pulsas el conmutador de tema claro/oscuro, y no guarda más que la palabra «light» o «dark».",
    ],
  },
  sections: [
    {
      id: "what-are-cookies",
      heading: { en: "1. What cookies are", es: "1. Qué son las cookies" },
      body: {
        en: [
          "A cookie is a small text file that a website asks your browser to store on your device. On later visits the browser sends it back, which lets the site recognise a setting you chose earlier.",
          "Cookies are often associated with advertising and tracking, but the technology itself is neutral: a cookie can just as easily hold a single word describing a colour scheme, which is exactly what happens here.",
        ],
        es: [
          "Una cookie es un pequeño archivo de texto que un sitio web pide a tu navegador que guarde en tu dispositivo. En visitas posteriores el navegador lo devuelve, lo que permite al sitio reconocer una preferencia que elegiste antes.",
          "Las cookies se asocian a menudo con la publicidad y el seguimiento, pero la tecnología en sí es neutra: una cookie puede contener simplemente una palabra que describe un esquema de color, que es exactamente lo que ocurre aquí.",
        ],
      },
    },
    {
      id: "cookies-we-use",
      heading: { en: "2. The cookie this site uses", es: "2. La cookie que usa este sitio" },
      block: "cookie-table",
      body: {
        en: [
          "This website sets one cookie, and only if you act. If you never touch the theme switch, no cookie is ever created and nothing is stored on your device.",
          "The cookie is a first-party cookie: it is set by this domain, it is never sent to any other website, and no third party can read it. It carries the attributes Path=/, SameSite=Lax and, over HTTPS, Secure. It is deliberately not HttpOnly, because the page itself has to read it before the first paint in order to apply your theme without a flash of the wrong colours.",
        ],
        es: [
          "Este sitio web instala una cookie, y sólo si actúas. Si nunca tocas el conmutador de tema, no se crea ninguna cookie y no se almacena nada en tu dispositivo.",
          "Es una cookie de primera parte: la establece este dominio, nunca se envía a ningún otro sitio web y ningún tercero puede leerla. Lleva los atributos Path=/, SameSite=Lax y, sobre HTTPS, Secure. Deliberadamente no es HttpOnly, porque la propia página necesita leerla antes del primer pintado para aplicar tu tema sin un parpadeo con los colores equivocados.",
        ],
      },
    },
    {
      id: "no-banner",
      heading: { en: "3. Why there is no cookie banner", es: "3. Por qué no hay banner de cookies" },
      body: {
        en: [
          "European rules on cookies (Article 5(3) of the ePrivacy Directive) require prior consent before storing information on your device, with an exception for storage that is strictly necessary to provide a service you explicitly asked for.",
          "A cookie that remembers a display preference you set yourself falls within that exception. It is created only by your own action, it holds no personal data, it cannot identify you, and it is not used for analytics, profiling or advertising. Asking for consent to store the word \"dark\" after you clicked a button labelled \"dark\" would add friction without protecting anything.",
          "You are still entitled to be informed, which is the purpose of this page. If this site ever adds analytics, embedded third-party content or any cookie that is not set by your own deliberate action, a proper consent mechanism will be added before that happens, and this policy will be updated first.",
        ],
        es: [
          "La normativa europea sobre cookies (artículo 5.3 de la Directiva ePrivacy, y en España el artículo 22.2 de la LSSI) exige consentimiento previo antes de almacenar información en tu dispositivo, con una excepción para el almacenamiento estrictamente necesario para prestar un servicio que hayas solicitado expresamente.",
          "Una cookie que recuerda una preferencia de visualización que tú mismo has fijado entra dentro de esa excepción. Se crea únicamente por tu propia acción, no contiene datos personales, no permite identificarte y no se usa para analítica, elaboración de perfiles ni publicidad. Pedirte permiso para guardar la palabra «dark» después de que hayas pulsado un botón que dice «oscuro» añadiría fricción sin proteger nada.",
          "Aun así tienes derecho a estar informado, y ése es el propósito de esta página. Si en algún momento este sitio incorpora analítica, contenido incrustado de terceros o cualquier cookie que no proceda de una acción deliberada tuya, se añadirá un mecanismo de consentimiento adecuado antes de hacerlo, y esta política se actualizará primero.",
        ],
      },
    },
    {
      id: "what-we-dont-use",
      heading: { en: "4. What this site does not use", es: "4. Qué no utiliza este sitio" },
      body: {
        en: [
          "To be explicit about the absence of things people reasonably worry about, this website does not use:",
        ],
        es: [
          "Para ser explícito sobre la ausencia de aquello que razonablemente preocupa, este sitio web no utiliza:",
        ],
      },
      bullets: {
        en: [
          "No analytics or measurement tools of any kind.",
          "No advertising, retargeting or conversion pixels.",
          "No social media tracking widgets or share buttons that phone home.",
          "No embedded third-party videos, maps or comment systems.",
          "No cross-site tracking, fingerprinting or profiling.",
          "No cookies that are set before you interact with the page.",
        ],
        es: [
          "Ninguna herramienta de analítica o medición.",
          "Ningún píxel de publicidad, retargeting o conversión.",
          "Ningún widget de seguimiento de redes sociales ni botones de compartir que envíen datos.",
          "Ningún vídeo, mapa o sistema de comentarios incrustado de terceros.",
          "Ningún seguimiento entre sitios, huella digital (fingerprinting) ni elaboración de perfiles.",
          "Ninguna cookie que se instale antes de que interactúes con la página.",
        ],
      },
    },
    {
      id: "other-storage",
      heading: { en: "5. Other storage technologies", es: "5. Otras tecnologías de almacenamiento" },
      body: {
        en: [
          "This site does not use localStorage, sessionStorage, IndexedDB or similar browser storage. The theme preference is kept in the cookie described above and nowhere else.",
          "Separately from cookies, the server that hosts this site keeps standard technical logs of incoming requests, which include the IP address, the time of the request, the page requested and the browser user agent. These logs are a normal part of running a web server, are used only to keep the site available and secure, and are not combined with the theme cookie. They are covered in the Privacy Policy.",
        ],
        es: [
          "Este sitio no utiliza localStorage, sessionStorage, IndexedDB ni almacenamiento similar del navegador. La preferencia de tema se guarda en la cookie descrita más arriba y en ningún otro sitio.",
          "Al margen de las cookies, el servidor que aloja este sitio conserva registros técnicos habituales de las peticiones recibidas, que incluyen la dirección IP, la hora de la petición, la página solicitada y el agente de usuario del navegador. Estos registros forman parte normal del funcionamiento de un servidor web, se usan únicamente para mantener el sitio disponible y seguro, y no se combinan con la cookie de tema. Se explican en la Política de Privacidad.",
        ],
      },
    },
    {
      id: "how-to-control",
      heading: {
        en: "6. How to control or delete cookies",
        es: "6. Cómo controlar o eliminar las cookies",
      },
      body: {
        en: [
          "The simplest way to change the theme preference is the theme switch itself: choosing the other theme overwrites the cookie immediately.",
          "You can also delete the cookie, or block cookies entirely, from your browser settings. Every major browser offers this under a section named Privacy, Cookies or Site data, and all of them let you inspect and remove the cookies stored by a single site.",
          "Blocking or deleting this cookie has no negative effect on the site. The only consequence is that the page will open in the light theme, which is its default, until you choose otherwise again.",
        ],
        es: [
          "La forma más sencilla de cambiar la preferencia de tema es el propio conmutador: al elegir el otro tema, la cookie se sobrescribe de inmediato.",
          "También puedes eliminar la cookie, o bloquear las cookies por completo, desde la configuración de tu navegador. Todos los navegadores principales ofrecen esta opción en un apartado llamado Privacidad, Cookies o Datos de sitios, y todos permiten inspeccionar y borrar las cookies almacenadas por un sitio concreto.",
          "Bloquear o borrar esta cookie no tiene ningún efecto negativo sobre el sitio. La única consecuencia es que la página se abrirá con el tema claro, que es el predeterminado, hasta que vuelvas a elegir otro.",
        ],
      },
    },
    {
      id: "changes",
      heading: { en: "7. Changes to this policy", es: "7. Cambios en esta política" },
      body: {
        en: [
          "If the set of cookies used by this site changes, this page is updated at the same time as the change, and the date at the top is revised. The list of cookies in this policy is checked against the site's actual behaviour by an automated test, so the table above is not a description of intentions but of what the site really does.",
        ],
        es: [
          "Si cambia el conjunto de cookies que utiliza este sitio, esta página se actualiza en el mismo momento que el cambio y se revisa la fecha que aparece arriba. La lista de cookies de esta política se contrasta con el comportamiento real del sitio mediante una prueba automatizada, de modo que la tabla anterior no describe intenciones sino lo que el sitio hace de verdad.",
        ],
      },
    },
    {
      id: "contact",
      heading: { en: "8. Contact", es: "8. Contacto" },
      body: {
        en: [
          "If you have any question about this policy, write to {ownerEmail} and I will answer personally.",
        ],
        es: [
          "Si tienes cualquier duda sobre esta política, escribe a {ownerEmail} y te responderé personalmente.",
        ],
      },
    },
  ],
};
