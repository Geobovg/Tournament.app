function ordinal(n: number) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th"}`;
}

export const seasons = {
  division: (division: number) => `Division ${division}`,
  outcome: { promoted: "Promoted", relegated: "Relegated", stayed: "Stayed up" },
  table: { club: "CLUB", played: "P", wins: "W", draws: "D", losses: "L", goalDifference: "GD", points: "PTS" },
  fixture: {
    round: (round: number) => `R${round}`,
    live: "LIVE",
    view: "View",
  },
  play: {
    starting: "Starting the match …",
    continue: (opponent: string) => `Continue the match vs ${opponent} →`,
    next: (opponent: string) => `Play next match vs ${opponent} →`,
  },
  ai: {
    eyebrow: (season: number) => `AI SEASON ${season}`,
    matchOf: (match: number, total: number) => `Match ${match} of ${total}`,
    place: (position: number, points: number) => `${ordinal(position)} place · ${points} pts`,
    topThreeUp: "Top 3 go up",
    previous: (position: number, division: number) => `Last season: ${ordinal(position)} in Division ${division} · `,
    tableHeading: "TABLE",
    fullTable: "Full table →",
    legend: "Green: promotion · Red: relegation",
    prizeInfo: "The end-of-season prize grows the higher your division. Promotion also pays a bonus that gets bigger with every division, plus packs from Division 6 and up.",
    yourMatches: "Your matches",
  },
  friend: {
    status: { open: "WAITING TO START", active: "FRIENDS SEASON", completed: "FINISHED" },
    managers: (count: number) => `${count} ${count === 1 ? "manager" : "managers"}`,
    invitedSuffix: " (invited)",
    join: "Join",
    decline: "No thanks",
    start: "Start the season",
    startHint: "Everyone who has joined plays each other once. Anyone who hasn't answered is left out.",
    waitingForStart: "Waiting for the season to start.",
    watchLive: "Watch live",
    play: "Play",
  },
  create: {
    eyebrow: "NEW FRIENDS SEASON",
    title: "Take on your friends",
    intro: "Everyone plays everyone once. The winner gets 100 MB and a Gold Pack, second place 50 MB and third place 25 MB.",
    namePlaceholder: "Season name",
    invite: "INVITE",
    submit: "Create and invite",
    created: "The season is created. Start it once your friends have answered.",
    noFriendsBefore: "Add friends under ",
    friendsLink: "Friends",
    noFriendsAfter: " to start a Friends Season.",
  },
  teaser: {
    eyebrow: (season: string) => `FRIENDS SEASON · ${season}`,
    next: (opponent: string) => `Next: vs ${opponent}`,
    invitation: "INVITATION",
    invitedTo: (season: string) => `You're invited to ${season}`,
    open: "Open →",
  },
  fallback: { unknown: "Unknown", yourClub: "Your club", friend: "Friend" },
  errors: {
    matchAlreadyStarted: "The match has already started",
    noMoreMatches: "The season has no more matches",
    opponentNotFound: "Couldn't find the opponent",
    needEleven: "Pick a starting XI of 11 players in Squad before you play",
    matchNotFound: "Couldn't find the match",
    matchAlreadyPlayed: "The match has already been played",
    bothNeedEleven: "Both managers need a starting XI of 11 players",
    nameRequired: "Give the season a name",
    inviteAtLeastOne: "Invite at least one friend",
    friendsOnly: "You can only invite friends",
    seasonAlreadyStarted: "The season has already started",
  },
};

export type SeasonsDict = typeof seasons;
