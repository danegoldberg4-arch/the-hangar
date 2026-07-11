interface SeedItem {
  name: string;
  category: string;
  description: string;
  intervalDays: number;
  intervalLabel: string;
  parts: string;
  notes: string;
  assignedTo: string;
}

export const seedItems: SeedItem[] = [
  {
    name: "UV water lamp",
    category: "water",
    description:
      "Replace the UV lamp in the Puretec Hybrid G6 UV filtration system. Reset timer after fitting (hold power button ~15s).",
    intervalDays: 365,
    intervalLabel: "Every 12 months",
    parts: '[{"name":"UV Lamp","partNumber":"RL6"}]',
    notes: "Silence beeping by holding power button until 'delay' shows (7 day grace). Order lamp + cartridges together.",
    assignedTo: "Owner",
  },
  {
    name: "UV filter cartridges",
    category: "water",
    description:
      "Replace sediment and carbon filter cartridges in the Puretec Hybrid G6 system.",
    intervalDays: 365,
    intervalLabel: "6-12 months (owner note: once a year)",
    parts: '[{"name":"Sediment Filter","partNumber":"PL05MP1"},{"name":"Carbon Filter","partNumber":"DP10MP1"}]',
    notes: "Order together with UV lamp (RL6) to save on shipping.",
    assignedTo: "Owner",
  },
  {
    name: "UV quartz sleeve",
    category: "water",
    description:
      "Inspect and replace the quartz sleeve if cloudy or cracked. Wipe with alcohol before fitting.",
    intervalDays: 0,
    intervalLabel: "As needed",
    parts: '[{"name":"Quartz Sleeve","partNumber":"RQS6"}]',
    notes: "Only replace if cloudy/cracked. Wipe with alcohol first.",
    assignedTo: "Owner",
  },
  {
    name: "Pool cartridge filter",
    category: "pool",
    description:
      "Hose the pool cartridge filter. Deep-soak a few times a year. Baseline is the 'START' mark, clean at 'CLEAN' mark.",
    intervalDays: 30,
    intervalLabel: "At CLEAN mark (monthly check)",
    parts: "[]",
    notes: "AstralPool XC-Series. Deep-soak with cartridge cleaner a few times a year.",
    assignedTo: "Owner / Guest",
  },
  {
    name: "AWTS (sewage) service",
    category: "wastewater",
    description:
      "Mandatory quarterly service by a licensed technician. Council inspections apply.",
    intervalDays: 90,
    intervalLabel: "Every 3 months",
    parts: "[]",
    notes: "Mandatory — licensed technician required. Council inspections apply.",
    assignedTo: "Licensed technician",
  },
  {
    name: "Water tanks",
    category: "water",
    description:
      "Empty debris from tanks, keep feed pipes clear. Check level in drought and switch to stream if needed.",
    intervalDays: 365,
    intervalLabel: "Yearly",
    parts: "[]",
    notes: "Two ~11,000 L tanks. Stream is the drought backup.",
    assignedTo: "Owner / Sebastian",
  },
  {
    name: "Generator service",
    category: "generator",
    description:
      "Service the Generac Guardian 8 kVA (LPG) per manufacturer schedule.",
    intervalDays: 180,
    intervalLabel: "Per schedule (confirm interval)",
    parts: "[]",
    notes: "Generac Guardian 8 kVA on LPG. Auto-starts when battery runs low. Confirm provider & interval.",
    assignedTo: "Generac dealer / technician",
  },
  {
    name: "Gas bottle check",
    category: "gas",
    description:
      "Check gas bottle levels. Order a refill the moment the changeover flips to reserve — not when empty.",
    intervalDays: 30,
    intervalLabel: "Each visit",
    parts: "[]",
    notes: "4 x 45 kg + 1 reserve, auto-changeover. Bottles are right of the pool, behind the wooden barrier.",
    assignedTo: "Owner",
  },
  {
    name: "Rainforest / grounds",
    category: "grounds",
    description:
      "Clear vegetation and maintain grounds. Sebastian recommended for machinery + building work.",
    intervalDays: 180,
    intervalLabel: "Every 6 months",
    parts: "[]",
    notes: "Sebastian is local, close by. Recommended for machinery + building work.",
    assignedTo: "Sebastian",
  },
  {
    name: "Starlink dish check",
    category: "internet",
    description:
      "Check Starlink dish for obstructions, debris, and firmware updates. Power-cycle if needed (do NOT press reset).",
    intervalDays: 90,
    intervalLabel: "Every 3 months",
    parts: "[]",
    notes: "Do NOT press reset on the modem. Power-cycle: off, wait 10 seconds, back on. Give up to 10 minutes to reboot.",
    assignedTo: "Owner",
  },
];
