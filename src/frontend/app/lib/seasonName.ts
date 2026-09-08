// Hacker-flavoured random season name generator.
// Powers the "shuffle" dice button wherever a season is named: the seasons page, and the
// first-season field when a league is created (onboarding + profile).

const ADJECTIVES = [
  "Shadow", "Phantom", "Stealth", "Rogue", "Cipher", "Crypto", "Binary",
  "Quantum", "Zero-Day", "Kernel", "Firewall", "Daemon", "Rootkit", "Brute",
  "Covert", "Silent", "Dark", "Iron", "Neon", "Obsidian", "Recursive",
  "Volatile", "Encrypted", "Forbidden", "Overclocked", "Reckless",
];

const NOUNS = [
  "Protocol", "Exploit", "Payload", "Fortress", "Breach", "Vector", "Epoch",
  "Overflow", "Heist", "Siege", "Recon", "Ops", "Cipher", "Blitz",
  "Takedown", "Lockdown", "Uprising", "Showdown", "Gambit", "Offensive",
  "Onslaught", "Incursion", "Mandate", "Endgame", "Override",
];

export function generateSeasonName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
}
