export const profile = {
  page: {
    title: "Profile",
    description: "See your history and keep your account up to date.",
    accountAndSecurity: "Account and security",
  },
  avatar: {
    title: "Profile picture",
    newAlt: "New profile picture",
    alt: "Profile picture",
    resizeHint: (size: number) => `The image is scaled down to ${size} px in your browser before uploading, so photos straight from your phone camera work fine.`,
    readFailed: "Couldn't read the image. Try a different one.",
    noCanvas: "No drawing surface available",
    compressFailed: "Couldn't compress the image",
    processing: "Processing image…",
    uploading: "Uploading…",
    upload: "Upload",
  },
  username: {
    title: "Username",
    newUsername: "New username",
    code: "Six-digit code",
    save: "Save username",
    saving: "Saving…",
  },
  passkey: {
    title: "Face ID / passkey",
    description: "Set up Face ID on your iPhone or a passkey on this device for faster login.",
  },
  deleteAccount: {
    title: "Delete account",
    description: "Finished tournaments are kept anonymously. Active tournaments must be closed, deleted or handed over first.",
    codePlaceholder: "Six-digit code",
    submit: "Delete account",
    deleting: "Deleting…",
  },
  errors: {
    invalidUsername: "Invalid username",
    wrongCodeForUsername: "Enter your correct six-digit code to change your username",
    usernameTaken: "That username is already taken",
    chooseImage: "Choose an image first",
    imageFormat: "The image must be JPG, PNG or WebP and no larger than 2 MB",
    wrongCodeForDelete: "Enter your correct six-digit code to delete your account",
    activeTournaments: "Close, delete or hand over your active tournaments before deleting your account",
  },
  messages: {
    usernameUpdated: "Username updated",
    avatarUpdated: "Profile picture updated",
  },
  menu: {
    greeting: (username: string) => `Hi, ${username}`,
    choose: "Pick what you want to play.",
    profile: "Profile",
    friends: "Friends",
    career: {
      kicker: "YOUR TEAM",
      title: "Manager Career",
      description: "Pick your starting eleven, buy cards and win tactical matches against your friends.",
      action: "Open Manager Career",
    },
    tournaments: {
      kicker: "WITH FRIENDS",
      title: "Tournaments",
      description: "Create, join and follow your FIFA and NHL tournaments.",
      action: "See tournaments",
    },
    fantasy: {
      kicker: "REAL MATCHES",
      title: "Fantasy",
      description: "Pick real players from the top five leagues and score points from their real matches.",
      action: "Open Fantasy",
    },
    historyTitle: "Two modes, one story",
    historyText: "Results and rewards are saved to your profile.",
    historyLink: "See stats and rewards",
  },
  modeMenu: {
    back: "← Menu",
  },
  confirmDialog: {
    title: "Are you sure?",
    no: "No",
    yes: "Yes",
  },
  audio: {
    turnOff: "Turn off the music",
    play: "Play tournament music",
    label: "Tournament music",
  },
};

export type ProfileDict = typeof profile;
