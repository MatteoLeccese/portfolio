// src/domains/experience/content/experience.ts
import type { ExperienceEntry } from "@/domains/experience/types";

export const experience: readonly ExperienceEntry[] = [
  {
    id: "flusso-dynamics-group",
    company: "Flusso Dynamics Group",
    companyUrl: null,
    logo: "/companies/flusso-logo.png",
    role: { en: "Full Stack Developer", es: "Desarrollador Full Stack" },
    startDate: "2026-02",
    endDate: "2026-09",
    summary: {
      en: "Payment infrastructure for currency-exchange platforms: gateway integrations, the core financial backend, and the releases that put both in production.",
      es: "Infraestructura de pagos para plataformas de cambio de divisas: integraciones de pasarelas, el backend financiero central y las publicaciones que llevan ambos a producción.",
    },
    highlights: {
      en: [
        "Integrated new payment gateway providers into currency-exchange platforms — from the provider API through asynchronous callbacks, signature verification and idempotent processing.",
        "Maintained and evolved the core financial backend and its REST APIs, with monetary precision, exchange-rate handling and transaction consistency as hard requirements.",
        "Deployed and ran applications on DigitalOcean: environments, databases, background workers and releases that reach production without downtime.",
        "Planned schema changes and data backfills for a continuously deployed system, keeping every migration reversible and safe to run against live traffic.",
        "Rebuilt and extended the internal administration systems, improving day-to-day workflows, interface responsiveness and the operational control the team actually has.",
        "Raised the engineering bar with automated testing, code review and written documentation, so the codebase stayed maintainable as the product and the team grew.",
      ],
      es: [
        "Integré nuevos proveedores de pasarelas de pago en plataformas de cambio de divisas: desde la API del proveedor hasta los callbacks asíncronos, la verificación de firmas y el procesamiento idempotente.",
        "Mantuve y evolucioné el backend financiero central y sus APIs REST, con la precisión monetaria, el manejo de tasas de cambio y la consistencia transaccional como requisitos innegociables.",
        "Desplegué y operé aplicaciones en DigitalOcean: entornos, bases de datos, procesos en segundo plano y publicaciones que llegan a producción sin tiempo de inactividad.",
        "Planifiqué cambios de esquema y migraciones de datos para un sistema con despliegue continuo, manteniendo cada migración reversible y segura de ejecutar sobre tráfico real.",
        "Reconstruí y amplié los sistemas de gestión administrativa, mejorando los flujos internos del día a día, la respuesta de la interfaz y el control operativo del equipo.",
        "Elevé el estándar de ingeniería con pruebas automatizadas, revisión de código y documentación técnica, manteniendo el código mantenible mientras crecían el producto y el equipo.",
      ],
    },
    stack: [ "NestJS", "Node.js", "Laravel", "PHP", "React", "DigitalOcean" ],
  },
  {
    id: "bitnat",
    company: "Bitnat Redes y Sistemas",
    companyUrl: null,
    logo: "/companies/bitnat-logo.png",
    role: { en: "Full Stack Developer", es: "Desarrollador Full Stack" },
    startDate: "2023-12",
    endDate: "2025-07",
    summary: {
      en: "Architecture, APIs and database performance for high-traffic Laravel applications, plus the documentation and reviews that kept them maintainable.",
      es: "Arquitectura, APIs y rendimiento de base de datos para aplicaciones Laravel de alto tráfico, más la documentación y las revisiones que las mantuvieron mantenibles.",
    },
    highlights: {
      en: [
        "Designed the architecture behind high-traffic applications on Laravel and MySQL, with scalability and long-term maintainability as the driving criteria.",
        "Led the development of the REST APIs connecting frontend clients to backend services: contracts, versioning and consistent error handling.",
        "Built responsive web applications, turning UX designs into working interfaces alongside the design team.",
        "Improved database efficiency by profiling slow queries, restructuring schemas and adding the indexes that actually moved the needle.",
        "Owned technical documentation end to end, from project specifications to user manuals.",
        "Raised code quality through systematic review, enforcing team conventions and catching regressions before they reached release.",
        "Cut frontend load times and improved perceived responsiveness through asset optimization and more efficient rendering logic.",
        "Shipped portable Windows desktop applications built with Python and SQLite, packaged as standalone executables.",
      ],
      es: [
        "Diseñé la arquitectura de aplicaciones de alto tráfico sobre Laravel y MySQL, con la escalabilidad y la mantenibilidad a largo plazo como criterios rectores.",
        "Lideré el desarrollo de las APIs REST que conectaban los clientes frontend con los servicios backend: contratos, versionado y manejo de errores consistente.",
        "Construí aplicaciones web responsivas, convirtiendo los diseños de UX en interfaces funcionales junto al equipo de diseño.",
        "Mejoré la eficiencia de la base de datos analizando consultas lentas, reestructurando esquemas e incorporando los índices que realmente marcaban la diferencia.",
        "Me hice cargo de la documentación técnica completa, desde las especificaciones de proyecto hasta los manuales de usuario.",
        "Elevé la calidad del código mediante revisiones sistemáticas, haciendo cumplir las convenciones del equipo y detectando regresiones antes de que llegaran a producción.",
        "Reduje los tiempos de carga del frontend y mejoré la respuesta percibida mediante la optimización de recursos y una lógica de renderizado más eficiente.",
        "Desarrollé y distribuí aplicaciones de escritorio portables para Windows con Python y SQLite, empaquetadas como ejecutables independientes.",
      ],
    },
    stack: [ "Laravel", "PHP", "MySQL", "Python", "SQLite" ],
  },
  {
    id: "soustitreur",
    company: "SousTitreur.com",
    companyUrl: null,
    logo: "/companies/soustitreur-logo.png",
    role: { en: "Full Stack Developer", es: "Desarrollador Full Stack" },
    startDate: "2023-02",
    endDate: "2023-08",
    summary: {
      en: "React and Redux on the front, Slim on the back, and one REST API keeping several applications consistent with each other.",
      es: "React y Redux por delante, Slim por detrás, y una API REST manteniendo coherentes entre sí varias aplicaciones.",
    },
    highlights: {
      en: [
        "Designed, built and maintained responsive web applications with React.js and Redux on the frontend and PHP Slim for backend services.",
        "Built and maintained a REST API serving several web applications, keeping the data flow consistent across all of them.",
        "Worked with product, design and QA in an agile setting to improve user experience and application performance.",
        "Introduced debugging and profiling practices that surfaced technical issues early and measurably improved reliability.",
      ],
      es: [
        "Diseñé, desarrollé y mantuve aplicaciones web responsivas con React.js y Redux en el frontend y PHP Slim para los servicios de backend.",
        "Construí y mantuve una API REST que daba servicio a varias aplicaciones web, manteniendo un flujo de datos consistente entre todas ellas.",
        "Trabajé con los equipos de producto, diseño y QA bajo metodologías ágiles para mejorar la experiencia de usuario y el rendimiento de las aplicaciones.",
        "Introduje prácticas de depuración y análisis de rendimiento que detectaron problemas técnicos de forma temprana y mejoraron de forma medible la fiabilidad.",
      ],
    },
    stack: [ "React", "Redux", "PHP", "Slim" ],
  },
  {
    id: "servieduca",
    company: "Servieduca",
    companyUrl: null,
    logo: "/companies/servieduca-logo.png",
    role: { en: "Frontend Developer", es: "Desarrollador Frontend" },
    startDate: "2021-10",
    endDate: "2023-02",
    summary: {
      en: "Where it started: Angular and RxJS on the web, React Native on mobile, and the first releases I shipped to a public store.",
      es: "Donde empezó todo: Angular y RxJS en la web, React Native en móvil, y las primeras publicaciones que llevé a una tienda pública.",
    },
    highlights: {
      en: [
        "Built and maintained web applications with Angular and RxJS, focused on performance, responsiveness and scalability inside agile delivery cycles.",
        "Partnered with stakeholders across teams to launch projects, gather insights and refine features over successive iterations.",
        "Built and published mobile applications with React Native, designing the interfaces and handling the Google Play releases.",
        "Optimized application workflows and debugging, finding performance bottlenecks and improving code efficiency and maintainability.",
      ],
      es: [
        "Desarrollé y mantuve aplicaciones web con Angular y RxJS, enfocado en el rendimiento, la responsividad y la escalabilidad dentro de ciclos de entrega ágiles.",
        "Colaboré con las partes interesadas de distintos equipos para lanzar proyectos, recoger información y refinar funcionalidades a lo largo de sucesivas iteraciones.",
        "Construí y publiqué aplicaciones móviles con React Native, diseñando las interfaces y gestionando las publicaciones en Google Play.",
        "Optimicé los flujos de trabajo y la depuración de las aplicaciones, identificando cuellos de botella de rendimiento y mejorando la eficiencia y la mantenibilidad del código.",
      ],
    },
    stack: [ "Angular", "RxJS", "React Native" ],
  },
];
