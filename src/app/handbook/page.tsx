const systems = [
  {
    name: "Power",
    desc: "Solar + battery, off-grid. Be mindful at night — after dark you're drawing from the battery.",
    detail: "Inverter: Selectronic SP PRO SPMC482 · 7.5 kW / 48 V",
    extra: "Live status at select.live",
    tag: "Run heavy loads by day",
  },
  {
    name: "Generator",
    desc: "A Generac Guardian 8 kVA on LPG auto-starts when the battery runs low — mostly on dull winter mornings.",
    detail: "Fuel: same LPG bottles as the house",
    tag: "Backup only",
  },
  {
    name: "Water",
    desc: "Tank water from spring & rain, filtered and safe to drink. Two ~11,000 L tanks; the stream is the drought backup.",
    detail: "Drinking filter: Puretec Hybrid G6 UV",
    tag: "Safe to drink",
  },
  {
    name: "Gas",
    desc: "Heats the hot water and most of the house. Bottles sit right of the pool, behind the wooden barrier.",
    detail: "Bank: 4 × 45 kg + 1 reserve, auto-changeover",
    tag: "Hot water · heating",
  },
  {
    name: "Wastewater",
    desc: "Aerated treatment system — treated effluent irrigates the mound. Go easy on bleach and harsh chemicals.",
    detail: "Serviced quarterly · council-inspected",
    tag: "Reclaimed effluent",
  },
  {
    name: "Internet",
    desc: "Starlink. Not guaranteed — bring a backup plan if you need to be online. Please don't reset the modem.",
    detail: "Network: Starlink1 · Password: Starlink1",
    tag: "Best-effort",
  },
];

const guestFacts = [
  {
    title: "Wi-Fi",
    body: "Network: Starlink1 · Password: Starlink1",
    note: "Reliability isn't guaranteed. Don't press reset — power-cycle instead.",
  },
  {
    title: "Power etiquette",
    big: "Run heavy loads by day",
    body: "Dishwasher & dryer while the sun's up. Turn off fans, lights and appliances you're not using. Don't stack the oven, kettle and heaters at once.",
  },
  {
    title: "Bi-fold doors",
    body: "Open them for airflow; pull the insect screens across gently. They're delicate — ease them in and out.",
  },
  {
    title: "Hot water dropped out?",
    body: "Almost always a gas bottle that needs changing over — bottles are right of the pool, behind the wooden barrier.",
  },
  {
    title: "Rubbish",
    body: "Bins are behind the mud room. Overflow → Kangaroo Valley Tip, 205 Bendeela Rd, Sat–Mon 9am–1pm.",
  },
  {
    title: "Wildlife",
    body: "Respect everything that lives here. Be snake-aware in long grass and around warm rocks near water.",
  },
];

const troubleshooting = [
  {
    q: "No hot water",
    a: "Almost always a gas bottle needing changeover. Bottles are right of the pool behind the wooden barrier. On the wall between the two bottles is a directional valve — the arrow shows the bottle in use (likely empty). Turn the empty bottle's green valve clockwise to close it, swing the directional valve to the full bottle, then open that bottle's green valve anti-clockwise. Let the office know so a refill can be ordered.",
  },
  {
    q: "Power drops out",
    a: "Find the fuse box; make sure switches are on. Reset breakers by flicking them off then on. Don't overload circuits — heat-generating appliances (kettles, toasters, heaters) at once will trip it. Spread them out.",
  },
  {
    q: "Oven not working",
    a: "Check for a master / wall switch. Check the clock is set and not flashing — many ovens won't run otherwise. Make sure the door is closed properly. Check the oven switch at the fuse box; try resetting it.",
  },
  {
    q: "Fridge not cooling",
    a: "Don't overstack it — it kills airflow. Keep the vents clear. Make sure the door isn't obstructed and closes fully.",
  },
  {
    q: "Dishwasher",
    a: "Filters are cleaned regularly by the maintenance team. If it's not working, check the filter and clear debris. Rinse plates, cutlery and glasses before loading.",
  },
  {
    q: "Internet / Wi-Fi",
    a: "Password is Starlink1. Do NOT press reset on the modem. Power-cycle: modem off, wait 10 seconds, back on. Give it up to 10 minutes to reboot. Starlink isn't guaranteed — have a backup plan if you need to be online.",
  },
  {
    q: "BBQ gas not flowing",
    a: "Check the bottle valve is open (turn the handle at the top). Out of gas? A 'swap n go' bottle will be reimbursed with a receipt.",
  },
];

export default function HandbookPage() {
  return (
    <div className="bg-paper text-steel min-h-screen">
      {/* Hero */}
      <header className="relative bg-steel text-paper py-20 px-4 sm:px-8 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-forest via-transparent to-iron/30" />
        <div className="relative max-w-[1180px] mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6 stroke-galv fill-none"
              strokeWidth={1.5}
            >
              <path d="M2 20h20M4 20V9l8-5 8 5v11M9 20v-6h6v6" />
            </svg>
            <span className="font-narrow font-bold uppercase tracking-[0.18em] text-sm text-paper">
              Protohouse No. V
            </span>
            <span className="font-narrow uppercase tracking-[0.28em] text-xs text-galv-dim">
              Upper Kangaroo River · NSW
            </span>
          </div>
          <h1 className="font-narrow font-bold uppercase text-5xl sm:text-7xl lg:text-8xl tracking-tight leading-none mt-4">
            <span className="block text-sm tracking-[0.5em] font-semibold text-galv mb-2">The</span>
            Hangar
          </h1>
          <p className="font-serif italic text-lg sm:text-xl text-paper/90 max-w-md mt-4">
            A steel-and-glass pavilion on the escarpment. Fully off-grid, entirely itself — here&apos;s how it runs.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-6 font-narrow uppercase tracking-wider text-xs text-paper/80 border-t border-paper/20 pt-4 max-w-2xl">
            <span><b className="text-iron-lt">4</b> bedrooms · sleeps 8</span>
            <span><b className="text-iron-lt">46.33</b> ha rainforest</span>
            <span><b className="text-iron-lt">15 kW</b> solar · <b className="text-iron-lt">26 kWh</b> battery</span>
            <span>38E Scotts Road</span>
          </div>
        </div>
      </header>

      {/* Intro */}
      <section className="bg-sand py-16 px-4 sm:px-8">
        <div className="max-w-[1180px] mx-auto">
          <span className="font-narrow uppercase tracking-[0.28em] text-xs font-semibold text-galv-dim">
            The house
          </span>
          <h2 className="font-narrow font-bold uppercase text-3xl sm:text-4xl mt-2 text-steel">
            Off-grid by design
          </h2>
          <p className="font-serif text-lg sm:text-xl leading-relaxed text-forest max-w-2xl mt-4">
            Everything here is deliberate — the black corrugated steel, the soaring glass hangar end, the way it sits light on the hillside. It makes its own power, catches its own water, and answers to the weather more than the grid. Treat it gently and it runs beautifully.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-px mt-8 bg-line border border-line">
            {[
              { n: "15", u: "kW", l: "Solar array" },
              { n: "26.1", u: "kWh", l: "Battery storage" },
              { n: "7.5", u: "kW", l: "Inverter limit" },
              { n: "22,000", u: "L", l: "Rain + spring water" },
              { n: "4×45", u: "kg", l: "LPG + 1 reserve" },
            ].map((s) => (
              <div key={s.l} className="bg-sand p-5">
                <div className="font-narrow font-bold text-2xl text-steel">
                  {s.n}<span className="text-sm text-galv-dim ml-1">{s.u}</span>
                </div>
                <div className="font-narrow uppercase tracking-wider text-[0.68rem] text-galv-dim mt-1">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Systems */}
      <section className="bg-steel text-paper py-16 px-4 sm:px-8">
        <div className="max-w-[1180px] mx-auto">
          <span className="font-narrow uppercase tracking-[0.28em] text-xs font-semibold text-iron-lt">
            How it runs
          </span>
          <h2 className="font-narrow font-bold uppercase text-3xl sm:text-4xl mt-2 text-paper">
            The systems
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px mt-8 bg-line border border-line">
            {systems.map((sys) => (
              <div key={sys.name} className="bg-steel-2 p-6">
                <h3 className="font-narrow uppercase tracking-wider text-base font-bold text-paper flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-iron" />
                  {sys.name}
                </h3>
                <p className="text-sm text-paper/72">{sys.desc}</p>
                {sys.detail && (
                  <p className="text-sm text-paper/60 mt-2 font-narrow tracking-wide">{sys.detail}</p>
                )}
                {sys.extra && (
                  <p className="text-sm text-paper/60 mt-1 font-narrow tracking-wide">{sys.extra}</p>
                )}
                {sys.tag && (
                  <span className="font-narrow uppercase tracking-wider text-[0.62rem] border border-line text-galv-dim px-2 py-1 mt-3 inline-block rounded">
                    {sys.tag}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hangar Door Feature */}
      <section className="bg-forest text-paper py-16 px-4 sm:px-8">
        <div className="max-w-[1180px] mx-auto">
          <span className="font-narrow uppercase tracking-[0.28em] text-xs font-semibold text-iron-lt">
            The signature
          </span>
          <h2 className="font-narrow font-bold uppercase text-4xl sm:text-5xl mt-2 text-paper">
            The Hangar Door
          </h2>
          <p className="text-paper/85 max-w-2xl mt-4 text-lg">
            The great glass end of the house opens like an aircraft hangar — the moment the place is named for. It&apos;s spectacular, and it&apos;s powerful, so it&apos;s treated with respect.
          </p>
          <p className="text-paper/85 max-w-2xl mt-2 text-lg">
            Adults only. There are no motion detectors or sensors: the single safety feature is that you must <em>hold</em> the button to open or close it. Nothing automatic, nothing clever — just your hand on the button and your eyes on the door.
          </p>
          <div className="border border-iron bg-iron/10 p-6 mt-6 max-w-2xl">
            <b className="font-narrow uppercase tracking-wider text-sm text-iron-lt">
              Before you operate it
            </b>
            <ul className="mt-3 ml-5 space-y-1 text-paper/85 text-sm">
              <li>Open the curtains fully first.</li>
              <li>Check nothing is in the door&apos;s path.</li>
              <li>Hold the button the whole time — release to stop.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Guest Quick Facts */}
      <section className="bg-paper py-16 px-4 sm:px-8">
        <div className="max-w-[1180px] mx-auto">
          <span className="font-narrow uppercase tracking-[0.28em] text-xs font-semibold text-galv-dim">
            For your stay
          </span>
          <h2 className="font-narrow font-bold uppercase text-3xl sm:text-4xl mt-2 text-steel">
            Good to know
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {guestFacts.map((fact) => (
              <div key={fact.title} className="border-t-2 border-steel pt-4">
                <h4 className="font-narrow uppercase tracking-wider text-sm font-bold text-steel mb-2">
                  {fact.title}
                </h4>
                {fact.big && (
                  <p className="font-narrow font-bold text-lg text-steel mb-2">{fact.big}</p>
                )}
                <p className="text-sm text-steel/70">{fact.body}</p>
                {fact.note && (
                  <p className="text-sm text-steel/60 mt-2 italic">{fact.note}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="bg-steel text-paper py-16 px-4 sm:px-8">
        <div className="max-w-[1180px] mx-auto">
          <span className="font-narrow uppercase tracking-[0.28em] text-xs font-semibold text-iron-lt">
            When something&apos;s off
          </span>
          <h2 className="font-narrow font-bold uppercase text-3xl sm:text-4xl mt-2 text-paper">
            Troubleshooting
          </h2>
          <div className="mt-8 space-y-2">
            {troubleshooting.map((item) => (
              <details
                key={item.q}
                className="border border-line bg-steel-2 rounded"
              >
                <summary className="cursor-pointer p-4 font-narrow uppercase tracking-wider text-sm font-semibold text-paper list-none flex justify-between items-center">
                  {item.q}
                  <span className="text-iron text-xl">+</span>
                </summary>
                <div className="px-4 pb-4 text-paper/78 text-sm leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer / Contacts */}
      <footer className="bg-forest text-paper py-12 px-4 sm:px-8">
        <div className="max-w-[1180px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <h4 className="font-narrow uppercase tracking-wider text-xs text-iron-lt mb-3">
                The property
              </h4>
              <p className="text-sm text-paper/80 mb-1">The Hangar (Protohouse No. V)</p>
              <p className="text-sm text-paper/80 mb-1">38E Scotts Road</p>
              <p className="text-sm text-paper/80 mb-1">Upper Kangaroo River, NSW 2577</p>
              <p className="text-sm text-paper/80">~396 m² · 46.33 ha</p>
            </div>
            <div>
              <h4 className="font-narrow uppercase tracking-wider text-xs text-iron-lt mb-3">
                Locals
              </h4>
              <p className="text-sm text-paper/80 mb-1">Sebastian — machinery, building, grounds</p>
              <p className="text-sm text-paper/80 mb-1">Chris — handyman (~30 min)</p>
              <p className="text-sm text-paper/80">Cleaners — book before & after, ~$200/clean</p>
            </div>
            <div>
              <h4 className="font-narrow uppercase tracking-wider text-xs text-iron-lt mb-3">
                Essentials
              </h4>
              <p className="text-sm text-paper/80 mb-1">KV Tip — 205 Bendeela Rd, Sat–Mon 9–1</p>
              <p className="text-sm text-paper/80 mb-1">Bins — behind the mud room, out Wed for Thu</p>
              <p className="text-sm text-paper/80">Bushfire — join the local WhatsApp group</p>
            </div>
            <div>
              <h4 className="font-narrow uppercase tracking-wider text-xs text-iron-lt mb-3">
                Live status
              </h4>
              <p className="text-sm text-paper/80 mb-1">Power → select.live</p>
              <p className="text-sm text-paper/80 mb-1">Generator → Generac Mobile Link</p>
              <p className="text-sm text-paper/80">Snake-aware in long grass & near warm rocks</p>
            </div>
          </div>
          <div className="h-px bg-paper/18 my-8" />
          <p className="text-xs text-paper/50">
            House handbook compiled from the owner walk-through, the welcome booklet and an equipment audit.
            <b className="text-paper/75"> Keep it with the house and update the dates as you service things.</b>
          </p>
        </div>
      </footer>
    </div>
  );
}
