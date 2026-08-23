import type { LegalContent } from "@/lib/legal";

export const es: LegalContent = {
  translationNote:
    "Esta traducción se ofrece por comodidad. En caso de discrepancia, prevalece la versión en inglés.",

  privacy: {
    title: "Política de privacidad",
    lastUpdated: "Última actualización: 22 de agosto de 2026",
    blocks: [
      {
        type: "p",
        text: 'Chavrusa Link («nosotros», «nuestro») opera chavrusalink.com (el «Servicio»), que ayuda a las personas a encontrar un compañero de estudio (chavrusa) para el estudio de la Torá. Esta política de privacidad explica qué información recopilamos, cómo la usamos y qué opciones tienes.',
      },
      {
        type: "p",
        text: "Al usar el Servicio, aceptas la recopilación y el uso de la información tal como se describe aquí.",
      },

      { type: "h2", text: "1. Información que recopilamos" },
      {
        type: "p",
        text: '**Información de la cuenta.** Al registrarte recopilamos tu dirección de correo electrónico y, si usas «Continuar con Google», información básica de tu cuenta de Google (nombre, correo, foto de perfil).',
      },
      {
        type: "p",
        text: "**Información del perfil.** Nombre, idiomas que hablas, temas de interés, nivel de aprendizaje, ciudad o vecindario, preferencia a distancia o en persona, y disponibilidad general.",
      },
      {
        type: "p",
        text: "**Número de teléfono.** Recopilamos y verificamos tu número de teléfono mediante un código SMS (a través de nuestro proveedor, Twilio) antes de que tu perfil sea visible para otros usuarios. Es una medida de seguridad para reducir las cuentas falsas.",
      },
      {
        type: "p",
        text: "**Datos de contacto para la conexión.** Número de WhatsApp, número de teléfono o enlace de Zoom que elijas añadir, compartidos únicamente con un compañero de estudio conectado contigo y solo después de que ambos confirméis una sesión.",
      },
      {
        type: "p",
        text: "**Información de uso.** Solicitudes de conexión que envías o recibes, conexiones, sesiones programadas, y los reportes o bloqueos que realizas.",
      },
      {
        type: "p",
        text: "**No recopilamos:** ubicación GPS precisa (solo la ciudad o el vecindario que escribes), información de pago (salvo que se añada una función de pago o donación, momento en el que se actualizará esta política), ni números de documentos de identidad.",
      },

      { type: "h2", text: "2. Cómo usamos tu información" },
      {
        type: "ul",
        items: [
          "Para crear y gestionar tu cuenta y tu perfil",
          "Para permitirte explorar, buscar y conectar con otros usuarios según intereses compartidos",
          "Para verificar tu número de teléfono y reducir cuentas falsas o abusivas",
          "Para facilitar la programación de una sesión de estudio y el intercambio de datos de contacto una vez confirmada",
          "Para responder a reportes, aplicar bloqueos y mantener una comunidad segura",
          "Para enviarte correos relacionados con la cuenta (confirmaciones, restablecimiento de contraseña) a través de nuestro proveedor, Resend",
          "Para enviarte códigos de verificación por SMS a través de nuestro proveedor, Twilio",
        ],
      },
      {
        type: "p",
        text: "No vendemos tu información personal y no usamos tus datos con fines publicitarios.",
      },

      { type: "h2", text: "3. Quién puede ver tu información" },
      {
        type: "ul",
        items: [
          "Tu nombre, idiomas, temas, nivel, ciudad y disponibilidad son visibles para otros usuarios registrados mientras exploran, **solo una vez que tu número de teléfono esté verificado**.",
          "Tus datos de contacto (WhatsApp, teléfono o Zoom) se comparten **únicamente** con un usuario conectado contigo, y **solo después** de que ambos confirméis una sesión de estudio.",
          "Los reportes que envías solo son visibles para los administradores de Chavrusa Link, nunca para la persona reportada.",
        ],
      },

      { type: "h2", text: "4. Servicios de terceros" },
      {
        type: "p",
        text: "Contamos con los siguientes proveedores para operar el Servicio. Cada uno tiene su propia política de privacidad que rige cómo tratan los datos en nuestro nombre:",
      },
      {
        type: "ul",
        items: [
          "**Supabase** — aloja nuestra base de datos y gestiona la autenticación y el inicio de sesión",
          "**Twilio** — envía los códigos de verificación por SMS",
          "**Resend** — envía los correos relacionados con la cuenta",
          '**Google** — proporciona el inicio de sesión opcional «Continuar con Google»',
          "**Vercel** — aloja nuestro sitio web",
        ],
      },

      { type: "h2", text: "5. Conservación de datos" },
      {
        type: "p",
        text: "Conservamos la información de tu cuenta y tu perfil mientras tu cuenta esté activa. Si eliminas tu cuenta, borraremos la información de tu perfil en un plazo de 30 días, salvo cuando estemos obligados a conservar registros (por ejemplo, para investigar un reporte de seguridad).",
      },

      { type: "h2", text: "6. Tus opciones y derechos" },
      {
        type: "ul",
        items: [
          "Puedes editar o eliminar la mayor parte de la información de tu perfil en cualquier momento desde la configuración de tu cuenta.",
          "Puedes bloquear a otro usuario, lo que le impide ver tu perfil o contactarte.",
          "Puedes reportar a un usuario para que nuestro equipo lo revise.",
          "Puedes solicitar una copia de tus datos o la eliminación de tu cuenta contactándonos (ver abajo).",
        ],
      },
      {
        type: "p",
        text: "Si te encuentras en la UE o el Reino Unido, tienes derechos adicionales conforme al RGPD, incluidos los de acceder, rectificar, suprimir o portar tus datos, y oponerte a determinados tratamientos. Si resides en California, tienes derechos conforme a la CCPA, incluido el de saber qué información personal se recopila y solicitar su eliminación.",
      },

      { type: "h2", text: "7. Privacidad de menores" },
      {
        type: "p",
        text: "El Servicio no está dirigido a menores de 18 años y no recopilamos conscientemente información de personas menores de 18 años. Si crees que un menor ha creado una cuenta, contáctanos para que podamos eliminarla.",
      },

      { type: "h2", text: "8. Seguridad de los datos" },
      {
        type: "p",
        text: "Aplicamos medidas conformes a los estándares del sector (incluidas conexiones cifradas y controles de acceso a través de nuestros proveedores) para proteger tu información. Ningún método de transmisión o almacenamiento es 100 % seguro, y no podemos garantizar una seguridad absoluta.",
      },

      { type: "h2", text: "9. Usuarios internacionales" },
      {
        type: "p",
        text: "Dado que Chavrusa Link admite varios idiomas y puede ser utilizado por personas de distintos países, tu información puede ser tratada en países distintos al tuyo, incluido Estados Unidos, por los proveedores indicados arriba.",
      },

      { type: "h2", text: "10. Cambios en esta política" },
      {
        type: "p",
        text: 'Podemos actualizar esta política de privacidad de vez en cuando. Publicaremos aquí la versión actualizada con una nueva fecha de «Última actualización». Seguir usando el Servicio tras los cambios implica que aceptas la política actualizada.',
      },

      { type: "h2", text: "11. Contacto" },
      {
        type: "p",
        text: "Si tienes preguntas sobre esta política de privacidad o quieres ejercer tus derechos, escríbenos a: **info@chavrusalink.com**",
      },
    ],
  },

  terms: {
    title: "Términos del servicio",
    lastUpdated: "Última actualización: 22 de agosto de 2026",
    blocks: [
      {
        type: "p",
        text: 'Te damos la bienvenida a Chavrusa Link. Estos términos del servicio (los «Términos») rigen tu uso de chavrusalink.com (el «Servicio»), operado por Chavrusa Link. Al crear una cuenta o usar el Servicio, aceptas estos Términos.',
      },

      { type: "h2", text: "1. Qué es Chavrusa Link" },
      {
        type: "p",
        text: "Chavrusa Link es una plataforma que ayuda a las personas a encontrar un compañero de estudio (chavrusa) para el estudio de la Torá. Ofrecemos herramientas para crear un perfil, explorar otros usuarios, enviar solicitudes de conexión, programar sesiones e intercambiar datos de contacto con un compañero conectado. **No organizamos, supervisamos ni asumimos responsabilidad por ninguna sesión de estudio, encuentro o interacción entre usuarios** — estos ocurren enteramente entre tú y la otra persona, en tus propios términos y bajo tu propio riesgo.",
      },

      { type: "h2", text: "2. Requisitos" },
      {
        type: "p",
        text: "Debes tener al menos 18 años para usar el Servicio. Al crear una cuenta, confirmas que cumples este requisito.",
      },

      { type: "h2", text: "3. Tu cuenta" },
      {
        type: "ul",
        items: [
          "Eres responsable de la exactitud de la información de tu perfil.",
          "Debes verificar tu número de teléfono antes de que tu perfil sea visible para otros usuarios. Facilitar un número falso o no autorizado constituye una violación de estos Términos.",
          "Eres responsable de mantener seguras tus credenciales y de toda la actividad realizada desde tu cuenta.",
          "No puedes crear una cuenta en nombre de otra persona, ni crear varias cuentas para eludir un bloqueo o una suspensión.",
        ],
      },

      { type: "h2", text: "4. Conducta del usuario" },
      { type: "p", text: "Te comprometes a no:" },
      {
        type: "ul",
        items: [
          "Suplantar a otra persona ni falsear tu identidad, edad o afiliación",
          "Acosar, amenazar o maltratar a otros usuarios",
          "Usar el Servicio para captación comercial, spam o publicidad no relacionada",
          "Intentar eludir la verificación telefónica, los bloqueos u otras funciones de seguridad",
          "Usar el Servicio con cualquier fin ilícito",
        ],
      },
      {
        type: "p",
        text: "Podemos suspender o cancelar tu cuenta si incumples estos Términos, incluso a partir de un reporte de usuario que consideremos creíble.",
      },

      { type: "h2", text: "5. Encuentros con otros usuarios" },
      {
        type: "p",
        text: "Chavrusa Link te pone en contacto con otros usuarios, pero **todos los encuentros, presenciales o a distancia, son exclusivamente entre los usuarios implicados.** No realizamos verificación de antecedentes, no comprobamos identidades más allá del número de teléfono, ni garantizamos la conducta, la seguridad o las intenciones de ningún usuario. Eres el único responsable de aplicar tu propio criterio, incluyendo:",
      },
      {
        type: "ul",
        items: [
          "Quedar en un lugar público y seguro para las primeras sesiones presenciales",
          "Verificar la identidad de la persona con la que te reúnes, si eso te importa",
          "Reportar a cualquier usuario que se comporte de forma inadecuada, mediante la función de reporte del sitio",
        ],
      },
      {
        type: "p",
        text: "**Recomendamos encarecidamente actuar con precaución al quedar en persona con alguien conocido por internet, como harías en cualquier plataforma que conecte a desconocidos.**",
      },

      { type: "h2", text: "6. Reportes y bloqueos" },
      {
        type: "p",
        text: "Puedes reportar a un usuario o bloquearlo para que no pueda contactarte ni ver tu perfil. Revisamos los reportes y podemos tomar medidas como advertir, suspender o expulsar permanentemente a un usuario, a nuestra discreción. No estamos obligados a comunicar el resultado de un reporte a quien lo presentó.",
      },

      { type: "h2", text: "7. Contenido que aportas" },
      {
        type: "p",
        text: "Conservas la propiedad de la información que incluyes en tu perfil. Al publicarla, nos concedes una licencia para mostrarla a otros usuarios como parte de la operación del Servicio. Declaras que tienes derecho a publicar todo lo que incluyas en tu perfil.",
      },

      { type: "h2", text: "8. Tarifas, donaciones y funciones de pago" },
      {
        type: "p",
        text: "Actualmente Chavrusa Link es gratuito. Si en el futuro introducimos un nivel de pago o una opción de donación, esos términos se te presentarán en ese momento y este documento se actualizará en consecuencia.",
      },

      { type: "h2", text: "9. Cancelación" },
      {
        type: "p",
        text: "Puedes eliminar tu cuenta en cualquier momento. Podemos suspender o cancelar tu cuenta, con o sin aviso, por incumplir estos Términos o por cualquier conducta que consideremos perjudicial para la comunidad.",
      },

      { type: "h2", text: "10. Exención de garantías" },
      {
        type: "p",
        text: 'EL SERVICIO SE PROPORCIONA «TAL CUAL», SIN GARANTÍAS DE NINGÚN TIPO, EXPRESAS O IMPLÍCITAS. NO GARANTIZAMOS QUE EL SERVICIO SEA ININTERRUMPIDO, LIBRE DE ERRORES O SEGURO, NI QUE CUALQUIER USUARIO QUE CONOZCAS A TRAVÉS DEL SERVICIO SE COMPORTE ADECUADAMENTE.',
      },

      { type: "h2", text: "11. Limitación de responsabilidad" },
      {
        type: "p",
        text: "EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY, CHAVRUSA LINK Y SUS OPERADORES NO SERÁN RESPONSABLES DE NINGÚN DAÑO INDIRECTO, INCIDENTAL, ESPECIAL O CONSECUENTE DERIVADO DE TU USO DEL SERVICIO O DE TUS INTERACCIONES CON OTROS USUARIOS, INCLUIDO CUALQUIER ENCUENTRO PRESENCIAL O A DISTANCIA CONCERTADO A TRAVÉS DEL SERVICIO.",
      },

      { type: "h2", text: "12. Cambios en estos Términos" },
      {
        type: "p",
        text: 'Podemos actualizar estos Términos de vez en cuando. Publicaremos aquí la versión actualizada con una nueva fecha de «Última actualización». Seguir usando el Servicio tras los cambios implica que aceptas los Términos actualizados.',
      },

      { type: "h2", text: "13. Ley aplicable" },
      {
        type: "p",
        text: "Estos Términos se rigen por las leyes del estado de Nueva York, Estados Unidos, sin atender a las normas sobre conflicto de leyes.",
      },

      { type: "h2", text: "14. Contacto" },
      {
        type: "p",
        text: "¿Preguntas sobre estos Términos? Escríbenos a: **info@chavrusalink.com**",
      },
    ],
  },
};
