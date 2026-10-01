export const profile = {
  page: {
    title: "Profil",
    description: "Consultez votre historique et gardez votre compte à jour.",
    accountAndSecurity: "Compte et sécurité",
  },
  avatar: {
    title: "Photo de profil",
    newAlt: "Nouvelle photo de profil",
    alt: "Photo de profil",
    resizeHint: (size: number) => `L'image est réduite à ${size} px dans votre navigateur avant d'être téléchargée, de sorte que les photos directement depuis l'appareil photo de votre téléphone fonctionnent correctement.`,
    readFailed: "Impossible de lire l'image. Essayez-en un autre.",
    noCanvas: "Aucune surface de dessin disponible",
    compressFailed: "Impossible de compresser l'image",
    processing: "Traitement des images…",
    uploading: "Téléchargement…",
    upload: "Télécharger",
  },
  username: {
    title: "Nom d'utilisateur",
    newUsername: "Nouveau nom d'utilisateur",
    code: "Code à six chiffres",
    save: "Enregistrer le nom d'utilisateur",
    saving: "Sauvegarde…",
  },
  passkey: {
    title: "Identification faciale/clé d'accès",
    description: "Configurez Face ID sur votre iPhone ou un mot de passe sur cet appareil pour une connexion plus rapide.",
  },
  deleteAccount: {
    title: "Supprimer le compte",
    description: "Les tournois terminés sont conservés de manière anonyme. Les tournois actifs doivent d'abord être clôturés, supprimés ou remis.",
    codePlaceholder: "Code à six chiffres",
    submit: "Supprimer le compte",
    deleting: "Suppression…",
  },
  errors: {
    invalidUsername: "Nom d'utilisateur invalide",
    wrongCodeForUsername: "Entrez votre code correct à six chiffres pour modifier votre nom d'utilisateur",
    usernameTaken: "Ce nom d'utilisateur est déjà pris",
    chooseImage: "Choisissez d'abord une image",
    imageFormat: "L'image doit être au format JPG, PNG ou WebP et ne pas dépasser 2 Mo.",
    wrongCodeForDelete: "Entrez votre code correct à six chiffres pour supprimer votre compte",
    activeTournaments: "Fermez, supprimez ou remettez vos tournois actifs avant de supprimer votre compte",
  },
  messages: {
    usernameUpdated: "Nom d'utilisateur mis à jour",
    avatarUpdated: "Photo de profil mise à jour",
  },
  menu: {
    greeting: (username: string) => `Bonjour, ${username}`,
    choose: "Choisissez ce que vous voulez jouer.",
    profile: "Profil",
    friends: "Amis",
    career: {
      kicker: "VOTRE ÉQUIPE",
      title: "Carrière de gestionnaire",
      description: "Choisissez votre onze de départ, achetez des cartes et gagnez des matchs tactiques contre vos amis.",
      action: "Carrière de gestionnaire ouvert",
    },
    tournaments: {
      kicker: "AVEC DES AMIS",
      title: "Tournois",
      description: "Créez, rejoignez et suivez vos tournois FIFA et NHL.",
      action: "Voir les tournois",
    },
    fantasy: {
      kicker: "VRAIS MATCHS",
      title: "Fantasy",
      description: "Choisis de vrais joueurs des cinq grands championnats et marque des points grâce à leurs vrais matchs.",
      action: "Ouvrir Fantasy",
    },
    historyTitle: "Deux modes, une histoire",
    historyText: "Les résultats et les récompenses sont enregistrés dans votre profil.",
    historyLink: "Voir les statistiques et les récompenses",
  },
  modeMenu: {
    back: "← Menu",
  },
  confirmDialog: {
    title: "Etes-vous sûr ?",
    no: "Non",
    yes: "Oui",
  },
  audio: {
    turnOff: "Éteignez la musique",
    play: "Jouer de la musique de tournoi",
    label: "Musique de tournoi",
  },
};

export type ProfileDict = typeof profile;
