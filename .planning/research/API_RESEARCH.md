# API & Integration Research — The Hangar

## Summary

| System | Device | API Available? | Approach | Phase |
|--------|--------|---------------|----------|-------|
| Power (Solar/Battery) | Selectronic SP PRO SPMC482 | **No official API** | Web portal scraping (select.live) | 1 |
| Generator | Generac Guardian 8 kVA | **No public API** | Mobile Link app API interception | 2 |
| Internet | Starlink Dishy | **Local gRPC only** (192.168.100.1:9200) | Local relay (RPi) → cloud push | 2 |
| Water | 2x ~11,000L tanks | **No sensor** | Hardware: ultrasonic + ESP32 | 3 |
| Gas | 4x 45kg LPG + reserve | **No sensor** | Hardware: changeover sensor or Generac Fuel Monitor | 3 |
| Maintenance | N/A | **No external API** | Internal CRUD + cron + email | 1 |

## Detailed Findings

### 1. Selectronic SP PRO (select.live)

- **Portal:** https://select.live (login-based)
- **API Access:** Officially **NO** for all three monitoring devices (Select.live, Select.live 2, Ubi 3)
- **Original Select.live:** Discontinued, replaced by Select.live 2 (order code 005469)
- **Select.live 2 features:** Advanced dashboard, CSV/Excel export, email + SMS alerts, custom alerts, generator runtime data
- **Ubi 3 features:** Same as Select.live 2 + advanced remote monitoring
- **Data available:** Solar PV production, battery SoC, load profiling, event logs, historical data
- **SP LINK software:** Can do remote data download from the portal

**Approach:**
1. Check what the web portal's XHR/fetch calls look like behind login — likely JSON endpoints we can call programmatically
2. If that fails, use CSV export automation (Select.live 2 supports it)
3. Fallback: manual data entry or email alert parsing (Select.live sends email alerts)

**Need to verify:** Which monitoring device does The Hangar have? (Select.live original or Select.live 2?)

### 2. Generac Mobile Link

- **Portal:** https://app.mobilelinkgen.com (JavaScript SPA)
- **Mobile app:** iOS + Android
- **No public API documented**
- **Features:** Real-time status, run time, exercise schedules, text/email/push notifications
- **Fuel Monitor accessory:** Tank level readings (integrates with Mobile Link)
- **Cellular accessory:** Monitoring during outages (auto carrier switching)

**Approach:**
1. Intercept the SPA's API calls (likely REST/JSON behind the SPA)
2. Login programmatically and poll status endpoint
3. Alternatively, parse email/text notifications (Mobile Link sends alerts)
4. Generac also offers propane monitoring — could cover gas bottle levels

### 3. Starlink

- **Local gRPC API:** 192.168.100.1:9200 (accessible only from house network)
- **Tools:** starlink-grpc-tools (Python, 691 stars, actively maintained, Docker image available)
- **Data available:** Status, alerts, obstruction map, ping drop/latency, usage stats, firmware version
- **Key limitation:** Only accessible from within the house LAN — NOT cloud-accessible
- **Polling:** Can loop at any interval (recommend 60s for status)

**Approach:**
1. Deploy a lightweight relay on a Raspberry Pi at the house
2. Relay polls dish gRPC every 60s and pushes to cloud API endpoint
3. Cloud app stores data and displays on dashboard
4. If Starlink drops, relay buffers data and pushes when connection returns
5. Alternative: Use Starlink's account API (if any exists) — needs investigation

### 4. Water Tank Levels

- **No existing sensor**
- **Hardware needed:** Ultrasonic distance sensor (JSN-SR04T or similar) + ESP32
- **Approach:** ESP32 reads tank level → WiFi POST to cloud API endpoint
- **Two tanks:** Need 2x sensor setups, or one multi-port sensor
- **Alternative:** Float switches for simple high/low alerts (cheaper, less data)

### 5. Gas Bottle Status

- **No existing sensor on bottles**
- **Auto-changeover valve exists** (flips to reserve when primary empties)
- **Options:**
  1. **Generac Fuel Monitor** — if the generator LPG tank is the same system, could monitor fuel level
  2. **Smart changeover valve** — replace with one that has status output (e.g., Gaslow gauge with IoT)
  3. **Pressure sensor** — measure bottle pressure to estimate level (less accurate for LPG)
  4. **Simple approach:** Detect when changeover flips (magnetic sensor on valve) → alert "order refill"
- **Approach for v1:** Simple alert when changeover flips (magnetic reed switch + ESP32)

## Architecture Implications

### Phase 1 — Maintenance System (No hardware/API dependencies)
- CRUD for maintenance items
- Email reminders via cron
- Digital logbook
- Status dashboard
- All data from the house handbook, stored in PostgreSQL

### Phase 2 — Monitoring Dashboard (Software-only integrations)
- Selectronic: web portal scraping or JSON endpoint interception
- Generac: Mobile Link API interception
- Starlink: needs local relay (Raspberry Pi at house)
- Dashboard shows live/last-known status with staleness indicators

### Phase 3 — Hardware Sensors (Physical installations)
- Water tank ultrasonic sensors + ESP32
- Gas bottle changeover sensor + ESP32
- Pool: smart relay for pump scheduling
- Full smart home integration (Home Assistant optional)

---
*Last updated: 2026-07-11*
