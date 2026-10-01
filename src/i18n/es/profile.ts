export const profile = {
  page: {
    title: "Perfil",
    description: "Vea su historial y mantenga su cuenta actualizada.",
    accountAndSecurity: "Cuenta y seguridad",
  },
  avatar: {
    title: "Foto de perfil",
    newAlt: "Nueva foto de perfil",
    alt: "Foto de perfil",
    resizeHint: (size: number) => `La imagen se reduce a ${size} px en su navegador antes de cargarla, por lo que las fotos tomadas directamente desde la cámara de su teléfono funcionan bien.`,
    readFailed: "No se pudo leer la imagen. Prueba con uno diferente.",
    noCanvas: "No hay superficie de dibujo disponible",
    compressFailed: "No se pudo comprimir la imagen",
    processing: "Procesando imagen…",
    uploading: "Subiendo…",
    upload: "Subir",
  },
  username: {
    title: "Nombre de usuario",
    newUsername: "Nuevo nombre de usuario",
    code: "Código de seis dígitos",
    save: "Guardar nombre de usuario",
    saving: "Guardando…",
  },
  passkey: {
    title: "ID de rostro/contraseña",
    description: "Configure Face ID en su iPhone o una clave de acceso en este dispositivo para iniciar sesión más rápido.",
  },
  deleteAccount: {
    title: "Eliminar cuenta",
    description: "Los torneos finalizados se mantienen de forma anónima. Los torneos activos deben cerrarse, eliminarse o entregarse primero.",
    codePlaceholder: "Código de seis dígitos",
    submit: "Eliminar cuenta",
    deleting: "Eliminando…",
  },
  errors: {
    invalidUsername: "Nombre de usuario no válido",
    wrongCodeForUsername: "Ingrese su código correcto de seis dígitos para cambiar su nombre de usuario",
    usernameTaken: "Ese nombre de usuario ya está en uso.",
    chooseImage: "Elige una imagen primero",
    imageFormat: "La imagen debe ser JPG, PNG o WebP y no superar los 2 MB.",
    wrongCodeForDelete: "Ingrese su código correcto de seis dígitos para eliminar su cuenta",
    activeTournaments: "Cierra, elimina o entrega tus torneos activos antes de eliminar tu cuenta",
  },
  messages: {
    usernameUpdated: "Nombre de usuario actualizado",
    avatarUpdated: "Foto de perfil actualizada",
  },
  menu: {
    greeting: (username: string) => `Hola, ${username}`,
    choose: "Elige lo que quieras jugar.",
    profile: "Perfil",
    friends: "Amigos",
    career: {
      kicker: "TU EQUIPO",
      title: "Carrera de gerente",
      description: "Elige tu once inicial, compra cartas y gana partidos tácticos contra tus amigos.",
      action: "Carrera de gerente abierto",
    },
    tournaments: {
      kicker: "CON AMIGOS",
      title: "Torneos",
      description: "Crea, únete y sigue tus torneos de FIFA y NHL.",
      action: "Ver torneos",
    },
    fantasy: {
      kicker: "PARTIDOS REALES",
      title: "Fantasy",
      description: "Elige jugadores reales de las cinco grandes ligas y suma puntos con sus partidos reales.",
      action: "Abrir Fantasy",
    },
    historyTitle: "Dos modos, una historia",
    historyText: "Los resultados y las recompensas se guardan en su perfil.",
    historyLink: "Ver estadísticas y recompensas",
  },
  modeMenu: {
    back: "← Menú",
  },
  confirmDialog: {
    title: "¿Estás seguro?",
    no: "No",
    yes: "si",
  },
  audio: {
    turnOff: "Apaga la música",
    play: "Reproducir música de torneo",
    label: "musica de torneo",
  },
};

export type ProfileDict = typeof profile;
