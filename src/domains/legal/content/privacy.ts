// src/domains/legal/content/privacy.ts
import { USE_RESEND_EMAIL_FORM } from "@/domains/core/config/site";
import type { LocalizedList } from "@/domains/core/types";
import type { LegalDocument } from "../types";

/**
 * The privacy policy, in both languages. `{domain}` and `{ownerEmail}` are resolved at
 * render time by resolveSitePlaceholders().
 *
 * The document has one version per contact path. Both carry the same eleven sections with
 * the same ids and the same headings, so the numbers the prose cross-references hold
 * either way; only the paragraphs that describe the contact section differ. The version
 * built for the form describes the form, the email delivery provider and the anti-abuse
 * rate limiter. The version built for the `mailto:` link describes a message that reaches
 * this site at no point.
 */

/** The policy that describes the contact path `useContactForm` selects. */
export function buildPrivacyPolicy (useContactForm: boolean): LegalDocument {

  /** The paragraphs of the path this document describes. */
  const path = (withForm: LocalizedList, withMailLink: LocalizedList): LocalizedList =>
    useContactForm ? withForm : withMailLink;

  return {
    slug: "privacy",
    title: { en: "Privacy Policy", es: "Política de Privacidad" },
    updatedAt: "2026-09-15",
    intro: path(
      {
        en: [
          "This policy explains what personal data {domain} collects, why it is collected, who else sees it and what rights you have over it.",
          "This is a personal portfolio, not a business platform. There are no user accounts, no newsletter, no analytics and no advertising. The only moment personal data is collected is when you deliberately send a message through the contact form.",
        ],
        es: [
          "Esta política explica qué datos personales recoge {domain}, por qué se recogen, quién más los ve y qué derechos tienes sobre ellos.",
          "Esto es un portfolio personal, no una plataforma comercial. No hay cuentas de usuario, ni boletín, ni analítica, ni publicidad. El único momento en que se recogen datos personales es cuando envías deliberadamente un mensaje a través del formulario de contacto.",
        ],
      },
      {
        en: [
          "This policy explains what personal data {domain} collects, why it is collected, who else sees it and what rights you have over it.",
          "This is a personal portfolio, not a business platform. There are no user accounts, no newsletter, no analytics and no advertising. The contact section publishes my email address instead of a form, so nothing you write to me is typed into this site or travels through it: your message goes from your email provider to mine.",
        ],
        es: [
          "Esta política explica qué datos personales recoge {domain}, por qué se recogen, quién más los ve y qué derechos tienes sobre ellos.",
          "Esto es un portfolio personal, no una plataforma comercial. No hay cuentas de usuario, ni boletín, ni analítica, ni publicidad. La sección de contacto publica mi dirección de correo en lugar de un formulario, así que nada de lo que me escribas se teclea en este sitio ni pasa por él: tu mensaje va de tu proveedor de correo al mío.",
        ],
      },
    ),
    sections: [
      {
        id: "controller",
        heading: {
          en: "1. Who is responsible for your data",
          es: "1. Quién es responsable de tus datos",
        },
        body: {
          en: [
            "The data controller is Matteo Leccese, an individual acting in a personal capacity, based in Zulia, Venezuela.",
            "You can reach me directly at {ownerEmail} for anything related to this policy, including any request to exercise the rights described in section 7.",
          ],
          es: [
            "El responsable del tratamiento es Matteo Leccese, persona física que actúa a título personal, con residencia en Zulia, Venezuela.",
            "Puedes contactarme directamente en {ownerEmail} para cualquier asunto relacionado con esta política, incluida cualquier solicitud para ejercer los derechos descritos en el apartado 7.",
          ],
        },
      },
      {
        id: "what-we-collect",
        heading: { en: "2. What data is collected", es: "2. Qué datos se recogen" },
        body: path(
          {
            en: [
              "Contact form. When you send a message you provide your name, your email address and the content of the message. The message field is free text, so it contains whatever you decide to write there. Please do not include sensitive information such as health data, government identifiers or financial details in it: nothing on this site requires them.",
              "Anti-abuse data. When the form is submitted, the IP address the request came from and the time of submission are processed to enforce a rate limit. This prevents the form from being used to send automated spam. The IP address is never stored as it arrives: it is combined with a secret kept on the server and hashed, and only that hash and a submission counter are held in memory. This data is used for that purpose only and is not linked to the content of your message.",
              "Server logs. The hosting provider records standard technical information about every request: IP address, timestamp, requested path, HTTP status and browser user agent. This is an inherent part of operating a web server and applies to every visitor, whether or not they use the form.",
              "Theme cookie. The site stores your light or dark theme choice in a cookie. Its value is the single word \"light\" or \"dark\". It contains no identifier and cannot be used to recognise you as a person. It is described in detail in the Cookie Policy.",
            ],
            es: [
              "Formulario de contacto. Cuando envías un mensaje facilitas tu nombre, tu dirección de correo electrónico y el contenido del mensaje. El campo de mensaje es texto libre, así que contiene aquello que decidas escribir. Por favor, no incluyas en él información sensible como datos de salud, identificadores oficiales o datos financieros: nada en este sitio los necesita.",
              "Datos antiabuso. Al enviar el formulario se trata la dirección IP desde la que llega la petición y la hora del envío, con el fin de aplicar un límite de frecuencia. Esto evita que el formulario se utilice para enviar spam automatizado. La dirección IP nunca se almacena tal como llega: se combina con un secreto guardado en el servidor y se le aplica una función hash, y sólo ese hash y un contador de envíos permanecen en memoria. Estos datos se usan sólo para esa finalidad y no se vinculan al contenido de tu mensaje.",
              "Registros del servidor. El proveedor de alojamiento registra información técnica habitual de cada petición: dirección IP, marca de tiempo, ruta solicitada, código de respuesta HTTP y agente de usuario del navegador. Forma parte inherente del funcionamiento de un servidor web y se aplica a todos los visitantes, usen o no el formulario.",
              "Cookie de tema. El sitio guarda tu elección de tema claro u oscuro en una cookie. Su valor es únicamente la palabra «light» o «dark». No contiene ningún identificador y no permite reconocerte como persona. Se describe en detalle en la Política de Cookies.",
            ],
          },
          {
            en: [
              "Messages you write to me. The contact section publishes my address as a link. Following it opens the mail client on your own device, where you write the message and your own email provider sends it. Nothing is typed into this site, no field is submitted to it and it keeps no copy: what I receive is an ordinary email, and the personal data in it is whatever you chose to put there. Please do not include sensitive information such as health data, government identifiers or financial details: nothing here requires them.",
              "Server logs. The hosting provider records standard technical information about every request: IP address, timestamp, requested path, HTTP status and browser user agent. This is an inherent part of operating a web server and applies to every visitor.",
              "Theme cookie. The site stores your light or dark theme choice in a cookie. Its value is the single word \"light\" or \"dark\". It contains no identifier and cannot be used to recognise you as a person. It is described in detail in the Cookie Policy.",
            ],
            es: [
              "Los mensajes que me escribes. La sección de contacto publica mi dirección como enlace. Al seguirlo se abre el cliente de correo de tu propio dispositivo, donde redactas el mensaje y lo envía tu propio proveedor de correo. Aquí no se teclea nada, no se envía ningún campo a este sitio y éste no guarda copia alguna: lo que recibo es un correo corriente, y los datos personales que contenga son los que hayas decidido poner. Por favor, no incluyas información sensible como datos de salud, identificadores oficiales o datos financieros: nada aquí los necesita.",
              "Registros del servidor. El proveedor de alojamiento registra información técnica habitual de cada petición: dirección IP, marca de tiempo, ruta solicitada, código de respuesta HTTP y agente de usuario del navegador. Forma parte inherente del funcionamiento de un servidor web y se aplica a todos los visitantes.",
              "Cookie de tema. El sitio guarda tu elección de tema claro u oscuro en una cookie. Su valor es únicamente la palabra «light» o «dark». No contiene ningún identificador y no permite reconocerte como persona. Se describe en detalle en la Política de Cookies.",
            ],
          },
        ),
      },
      {
        id: "why",
        heading: {
          en: "3. Why it is collected, and on what legal basis",
          es: "3. Por qué se recogen y con qué base legal",
        },
        body: path(
          {
            en: [
              "The data from the contact form is used for exactly one thing: to read your message and reply to it. It is not used to build a mailing list, it is not added to any marketing database and it is never sold or shared for commercial purposes.",
              "Where your message concerns a professional opportunity, a collaboration or a project enquiry, the legal basis is Article 6(1)(b) of the GDPR: processing necessary to take steps at your request prior to entering into a contract. For any other message, the basis is Article 6(1)(f), my legitimate interest in answering someone who has deliberately chosen to contact me.",
              "Consent is deliberately not used as the legal basis here. If it were, withdrawing consent would oblige me to stop processing the very message you sent in order to get an answer, which would not serve you. This is also why the form has no consent checkbox: what the law requires at this point is that you are informed, which is what this policy does.",
              "Anti-abuse data and server logs are processed under Article 6(1)(f), the legitimate interest in keeping the site available, functional and free from automated abuse.",
            ],
            es: [
              "Los datos del formulario de contacto se usan para una sola cosa: leer tu mensaje y responderte. No se utilizan para crear una lista de correo, no se añaden a ninguna base de datos de marketing y nunca se venden ni se ceden con fines comerciales.",
              "Cuando tu mensaje se refiere a una oportunidad profesional, una colaboración o una consulta sobre un proyecto, la base legal es el artículo 6.1.b del RGPD: tratamiento necesario para la aplicación de medidas precontractuales adoptadas a petición tuya. Para cualquier otro mensaje, la base es el artículo 6.1.f, mi interés legítimo en responder a quien ha decidido deliberadamente escribirme.",
              "No se utiliza el consentimiento como base legal, y es una decisión deliberada. Si lo fuera, retirarlo me obligaría a dejar de tratar el mismo mensaje que enviaste precisamente para obtener una respuesta, lo que no te beneficiaría. Ésa es también la razón de que el formulario no lleve una casilla de consentimiento: lo que la norma exige en este punto es que estés informado, que es lo que hace esta política.",
              "Los datos antiabuso y los registros del servidor se tratan al amparo del artículo 6.1.f, el interés legítimo en mantener el sitio disponible, funcional y libre de abuso automatizado.",
            ],
          },
          {
            en: [
              "Because the contact section collects nothing, the only personal data I hold about you is what you chose to put in an email you sent me. I use it for exactly one thing: to read your message and reply to it. It is not used to build a mailing list, it is not added to any marketing database and it is never sold or shared for commercial purposes.",
              "Where your message concerns a professional opportunity, a collaboration or a project enquiry, the legal basis is Article 6(1)(b) of the GDPR: processing necessary to take steps at your request prior to entering into a contract. For any other message, the basis is Article 6(1)(f), my legitimate interest in answering someone who has deliberately chosen to contact me.",
              "Consent is deliberately not used as the legal basis here. If it were, withdrawing consent would oblige me to stop processing the very message you sent in order to get an answer, which would not serve you. What the law requires at this point is that you are informed, which is what this policy does.",
              "Server logs are processed under Article 6(1)(f), the legitimate interest in keeping the site available and functional.",
            ],
            es: [
              "Como la sección de contacto no recoge nada, los únicos datos personales que conservo sobre ti son los que decidiste poner en un correo que me enviaste. Los uso para una sola cosa: leer tu mensaje y responderte. No se utilizan para crear una lista de correo, no se añaden a ninguna base de datos de marketing y nunca se venden ni se ceden con fines comerciales.",
              "Cuando tu mensaje se refiere a una oportunidad profesional, una colaboración o una consulta sobre un proyecto, la base legal es el artículo 6.1.b del RGPD: tratamiento necesario para la aplicación de medidas precontractuales adoptadas a petición tuya. Para cualquier otro mensaje, la base es el artículo 6.1.f, mi interés legítimo en responder a quien ha decidido deliberadamente escribirme.",
              "No se utiliza el consentimiento como base legal, y es una decisión deliberada. Si lo fuera, retirarlo me obligaría a dejar de tratar el mismo mensaje que enviaste precisamente para obtener una respuesta, lo que no te beneficiaría. Lo que la norma exige en este punto es que estés informado, que es lo que hace esta política.",
              "Los registros del servidor se tratan al amparo del artículo 6.1.f, el interés legítimo en mantener el sitio disponible y funcional.",
            ],
          },
        ),
      },
      {
        id: "recipients",
        heading: { en: "4. Who else sees your data", es: "4. Quién más ve tus datos" },
        body: path(
          {
            en: [
              "Your message is delivered by Resend, an email delivery provider that processes your name, email address and message solely in order to transmit the email to my inbox, acting on my instructions as a processor.",
              "Once delivered, the message sits in my email inbox, which is hosted by Google.",
              "The site itself is served by Vercel, which processes the technical log data described in section 2.",
              "No other party receives your data. There are no analytics providers, no advertising networks and no data brokers involved, because this site uses none of those.",
            ],
            es: [
              "Tu mensaje se entrega mediante Resend, un proveedor de envío de correo que trata tu nombre, tu dirección de correo y tu mensaje con la única finalidad de transmitir el email a mi buzón, actuando como encargado del tratamiento siguiendo mis instrucciones.",
              "Una vez entregado, el mensaje permanece en mi buzón de correo, alojado por Google.",
              "El sitio en sí lo sirve Vercel, que trata los datos técnicos de registro descritos en el apartado 2.",
              "Ningún otro tercero recibe tus datos. No intervienen proveedores de analítica, redes publicitarias ni intermediarios de datos, porque este sitio no utiliza ninguno de ellos.",
            ],
          },
          {
            en: [
              "No provider of mine stands between you and me. This site sends nothing on your behalf and holds no credentials to do so: your message leaves through the email provider you use and arrives at mine, exactly as any other email you write.",
              "Once delivered, the message sits in my email inbox, which is hosted by Google.",
              "The site itself is served by Vercel, which processes the technical log data described in section 2.",
              "No other party receives your data. There are no analytics providers, no advertising networks and no data brokers involved, because this site uses none of those.",
            ],
            es: [
              "Ningún proveedor mío se interpone entre tú y yo. Este sitio no envía nada en tu nombre ni guarda credenciales para hacerlo: tu mensaje sale por el proveedor de correo que utilices y llega al mío, igual que cualquier otro correo que escribas.",
              "Una vez entregado, el mensaje permanece en mi buzón de correo, alojado por Google.",
              "El sitio en sí lo sirve Vercel, que trata los datos técnicos de registro descritos en el apartado 2.",
              "Ningún otro tercero recibe tus datos. No intervienen proveedores de analítica, redes publicitarias ni intermediarios de datos, porque este sitio no utiliza ninguno de ellos.",
            ],
          },
        ),
      },
      {
        id: "transfers",
        heading: { en: "5. International transfers", es: "5. Transferencias internacionales" },
        body: path(
          {
            en: [
              "I am based in Venezuela, and the email delivery and hosting providers used by this site operate infrastructure in the United States. If you write from the European Economic Area, your data will therefore be transferred outside the EEA to countries that have not received an adequacy decision from the European Commission.",
              "These transfers rely on the safeguards offered by those providers, typically the European Commission's Standard Contractual Clauses incorporated into their data processing terms. If you would like to know exactly which provider handles your message before you send it, ask me by email first and I will tell you.",
            ],
            es: [
              "Resido en Venezuela, y los proveedores de envío de correo y de alojamiento que utiliza este sitio operan infraestructura en Estados Unidos. Si escribes desde el Espacio Económico Europeo, tus datos se transferirán por tanto fuera del EEE, a países que no cuentan con una decisión de adecuación de la Comisión Europea.",
              "Estas transferencias se amparan en las garantías ofrecidas por esos proveedores, habitualmente las Cláusulas Contractuales Tipo de la Comisión Europea incorporadas a sus condiciones de tratamiento de datos. Si antes de escribir quieres saber qué proveedor concreto gestionará tu mensaje, pregúntamelo por correo y te lo indicaré.",
            ],
          },
          {
            en: [
              "I am based in Venezuela, and the hosting provider that serves this site and the provider that holds my inbox both operate infrastructure in the United States. If you write from the European Economic Area, the message you send me and the technical log data of your visit are therefore handled outside the EEA, in countries that have not received an adequacy decision from the European Commission.",
              "These transfers rely on the safeguards offered by those providers, typically the European Commission's Standard Contractual Clauses incorporated into their data processing terms. The route your message takes before it leaves your side is your own provider's, and it is governed by that provider's policy rather than by this one.",
            ],
            es: [
              "Resido en Venezuela, y tanto el proveedor de alojamiento que sirve este sitio como el que aloja mi buzón operan infraestructura en Estados Unidos. Si escribes desde el Espacio Económico Europeo, el mensaje que me envíes y los datos técnicos de registro de tu visita se tratan por tanto fuera del EEE, en países que no cuentan con una decisión de adecuación de la Comisión Europea.",
              "Estas transferencias se amparan en las garantías ofrecidas por esos proveedores, habitualmente las Cláusulas Contractuales Tipo de la Comisión Europea incorporadas a sus condiciones de tratamiento de datos. El camino que recorre tu mensaje antes de salir de tu lado es el de tu propio proveedor, y se rige por la política de ese proveedor y no por ésta.",
            ],
          },
        ),
      },
      {
        id: "retention",
        heading: { en: "6. How long it is kept", es: "6. Cuánto tiempo se conservan" },
        body: path(
          {
            en: [
              "Messages that lead to an ongoing conversation, a collaboration or a professional relationship are kept for as long as that relationship is active, and for a reasonable period afterwards for reference.",
              "Messages that do not lead anywhere are deleted within 12 months of the last exchange.",
              "Anti-abuse records, which are the hashed IP address and a counter and nothing else, live in the memory of the process handling the request, cover a one-hour window and disappear when the server restarts. They are not written to any database.",
              "Server logs are retained according to the hosting provider's standard retention period, which is a matter of weeks rather than years.",
              "The theme cookie expires one year after it is set, or sooner if you delete it or change your theme.",
            ],
            es: [
              "Los mensajes que dan lugar a una conversación continuada, una colaboración o una relación profesional se conservan mientras esa relación siga activa, y durante un período razonable posterior a efectos de referencia.",
              "Los mensajes que no derivan en nada se eliminan en un plazo de 12 meses desde el último intercambio.",
              "Los registros antiabuso, que son la dirección IP con hash y un contador y nada más, viven en la memoria del proceso que atiende la petición, se limitan a una ventana de una hora y desaparecen al reiniciarse el servidor. No se escriben en ninguna base de datos.",
              "Los registros del servidor se conservan según el período de retención estándar del proveedor de alojamiento, que se mide en semanas y no en años.",
              "La cookie de tema caduca un año después de fijarse, o antes si la eliminas o cambias de tema.",
            ],
          },
          {
            en: [
              "Messages that lead to an ongoing conversation, a collaboration or a professional relationship are kept for as long as that relationship is active, and for a reasonable period afterwards for reference.",
              "Messages that do not lead anywhere are deleted within 12 months of the last exchange.",
              "Server logs are retained according to the hosting provider's standard retention period, which is a matter of weeks rather than years.",
              "The theme cookie expires one year after it is set, or sooner if you delete it or change your theme.",
            ],
            es: [
              "Los mensajes que dan lugar a una conversación continuada, una colaboración o una relación profesional se conservan mientras esa relación siga activa, y durante un período razonable posterior a efectos de referencia.",
              "Los mensajes que no derivan en nada se eliminan en un plazo de 12 meses desde el último intercambio.",
              "Los registros del servidor se conservan según el período de retención estándar del proveedor de alojamiento, que se mide en semanas y no en años.",
              "La cookie de tema caduca un año después de fijarse, o antes si la eliminas o cambias de tema.",
            ],
          },
        ),
      },
      {
        id: "rights",
        heading: { en: "7. Your rights", es: "7. Tus derechos" },
        body: {
          en: [
            "If the GDPR applies to you, you have the right to request access to the personal data I hold about you, to have inaccurate data corrected, to have your data erased, to restrict how it is processed, to receive it in a portable format, and to object to processing carried out on the basis of legitimate interest.",
            "In practice, for this site, most requests amount to \"delete the message I sent you\", and I will do that on request. Write to {ownerEmail} and I will respond within one month, as the GDPR requires. I may ask you to confirm the email address you used, so that I delete the right message and not somebody else's.",
            "If you believe your data has been handled improperly, you have the right to lodge a complaint with the data protection authority of the country where you live or work (for example, in Spain the Agencia Española de Protección de Datos, www.aepd.es).",
          ],
          es: [
            "Si el RGPD te resulta aplicable, tienes derecho a solicitar el acceso a los datos personales que conservo sobre ti, a que se rectifiquen los datos inexactos, a que se supriman, a limitar su tratamiento, a recibirlos en un formato portátil y a oponerte al tratamiento basado en el interés legítimo.",
            "En la práctica, en este sitio, la mayoría de las solicitudes se reducen a «elimina el mensaje que te envié», y lo haré cuando me lo pidas. Escribe a {ownerEmail} y responderé en el plazo de un mes, como exige el RGPD. Es posible que te pida que confirmes la dirección de correo que utilizaste, para eliminar el mensaje correcto y no el de otra persona.",
            "Si consideras que tus datos se han tratado indebidamente, tienes derecho a presentar una reclamación ante la autoridad de protección de datos del país donde residas o trabajes (por ejemplo, en España la Agencia Española de Protección de Datos, www.aepd.es).",
          ],
        },
      },
      {
        id: "security",
        heading: { en: "8. Security", es: "8. Seguridad" },
        body: path(
          {
            en: [
              "The site is served exclusively over HTTPS, so anything you type into the contact form is encrypted in transit.",
              "The credentials used to send email are held server-side and are never exposed to the browser. The form is submitted to a server action that validates its input on the server, not only in the browser, and applies a rate limit.",
              "No copy of your message is stored in any database owned by this site: it is transmitted by email and lives in my inbox. Fewer copies means less to protect and less to lose.",
            ],
            es: [
              "El sitio se sirve exclusivamente sobre HTTPS, de modo que todo lo que escribas en el formulario de contacto viaja cifrado.",
              "Las credenciales utilizadas para enviar el correo se guardan en el servidor y nunca se exponen al navegador. El formulario se envía a una server action que valida los datos en el servidor, no sólo en el navegador, y aplica un límite de frecuencia.",
              "No se guarda ninguna copia de tu mensaje en ninguna base de datos propia de este sitio: se transmite por correo electrónico y reside en mi buzón. Menos copias significa menos que proteger y menos que perder.",
            ],
          },
          {
            en: [
              "The site is served exclusively over HTTPS, so what you read here cannot be altered or read by anyone in between.",
              "There is no field to fill in, no submission for this site to receive and no credential stored here for sending email on your behalf. Your message is composed and sent by your own mail client, and it is protected in transit by whatever your email provider and mine agree on.",
              "No copy of your message is stored in any database owned by this site: it lives in your sent folder and in my inbox. Fewer copies means less to protect and less to lose.",
            ],
            es: [
              "El sitio se sirve exclusivamente sobre HTTPS, de modo que lo que lees aquí no puede alterarlo ni leerlo nadie por el camino.",
              "No hay ningún campo que rellenar, ningún envío que este sitio reciba ni ninguna credencial guardada aquí para mandar correo en tu nombre. Tu mensaje lo redacta y lo envía tu propio cliente de correo, y viaja protegido por lo que acuerden tu proveedor y el mío.",
              "No se guarda ninguna copia de tu mensaje en ninguna base de datos propia de este sitio: reside en tu carpeta de enviados y en mi buzón. Menos copias significa menos que proteger y menos que perder.",
            ],
          },
        ),
      },
      {
        id: "children",
        heading: { en: "9. Children", es: "9. Menores" },
        body: {
          en: [
            "This site is a professional portfolio aimed at an adult audience, in particular recruiters, clients and other developers. It is not directed at children and does not knowingly collect data from them.",
          ],
          es: [
            "Este sitio es un portfolio profesional dirigido a un público adulto, en particular a personal de selección, clientes y otros desarrolladores. No se dirige a menores ni recoge conscientemente datos de ellos.",
          ],
        },
      },
      {
        id: "changes",
        heading: { en: "10. Changes to this policy", es: "10. Cambios en esta política" },
        body: path(
          {
            en: [
              "If the way this site handles data changes, this page is updated and the date at the top is revised. Because the site is small and its processing is minimal, changes should be rare; any material change would come from adding a genuinely new feature, such as analytics, and that would be reflected here before it went live.",
            ],
            es: [
              "Si cambia la forma en que este sitio trata los datos, esta página se actualiza y se revisa la fecha que aparece arriba. Dado que el sitio es pequeño y su tratamiento es mínimo, los cambios deberían ser poco frecuentes; cualquier cambio sustancial vendría de incorporar una funcionalidad realmente nueva, como analítica, y quedaría reflejado aquí antes de entrar en funcionamiento.",
            ],
          },
          {
            en: [
              "If the way this site handles data changes, this page is updated and the date at the top is revised. Because the site is small and its processing is minimal, changes should be rare; any material change would come from adding a genuinely new feature, such as a contact form or analytics, and that would be reflected here before it went live.",
            ],
            es: [
              "Si cambia la forma en que este sitio trata los datos, esta página se actualiza y se revisa la fecha que aparece arriba. Dado que el sitio es pequeño y su tratamiento es mínimo, los cambios deberían ser poco frecuentes; cualquier cambio sustancial vendría de incorporar una funcionalidad realmente nueva, como un formulario de contacto o analítica, y quedaría reflejado aquí antes de entrar en funcionamiento.",
            ],
          },
        ),
      },
      {
        id: "contact",
        heading: { en: "11. Contact", es: "11. Contacto" },
        body: {
          en: [
            "For any question about this policy or about how your data is handled, write to {ownerEmail}.",
          ],
          es: [
            "Para cualquier duda sobre esta política o sobre el tratamiento de tus datos, escribe a {ownerEmail}.",
          ],
        },
      },
    ],
  };
}

/** The policy this build renders, chosen by NEXT_PUBLIC_USE_RESEND_EMAIL_FORM. */
export const privacyPolicy: LegalDocument = buildPrivacyPolicy(USE_RESEND_EMAIL_FORM);
