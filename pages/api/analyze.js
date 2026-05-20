const WCL_TOKEN_URL = 'https://www.warcraftlogs.com/oauth/token';
const WCL_API_URL = 'https://www.warcraftlogs.com/api/v2/client';

// The War Within consumable spell IDs — update these when new patches release
const CONSUMABLES = {
  flasks: [
    431929, // Flask of Tempered Mastery
    431930, // Flask of Tempered Versatility
    431931, // Flask of Tempered Aggression
    431932, // Flask of Tempered Swiftness
    432112, // Flask of Alchemical Chaos
  ],
  food: [
    457301, // Well Fed (feasts)
    430704, // Grand Banquet of the Kaluak
    431769, // Sushi-Go-Round
    432819, // Hearty Feast
  ],
  runes: [
    403096, // Crystallized Augmentation Rune
  ],
  potions: [
    431416, // Tempered Potion
    432021, // Potion of Unwavering Focus
    431419, // Algari Mana Potion
  ],
};

const ALL_IDS = Object.values(CONSUMABLES).flat();

async function getToken() {
  const credentials = Buffer.from(
    `${process.env.WCL_CLIENT_ID}:${process.env.WCL_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch(WCL_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error('Failed to authenticate with Warcraft Logs');
  const data = await res.json();
  return data.access_token;
}

async function queryWCL(token, query, variables = {}) {
  const res = await fetch(WCL_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0].message);
  return data;
}

function extractCode(url) {
  const match = url.match(/reports\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { logUrl } = req.body;
  if (!logUrl) return res.status(400).json({ error: 'Log URL is required' });

  const code = extractCode(logUrl);
  if (!code) return res.status(400).json({ error: 'Invalid Warcraft Logs URL' });

  try {
    const token = await getToken();

    const { data } = await queryWCL(token, `
      query GetReport($code: String!) {
        reportData {
          report(code: $code) {
            title
            fights(killType: Kills) {
              id
              name
            }
            masterData {
              actors(type: "Player") {
                id
                name
                subType
              }
            }
            buffs: table(dataType: Buffs, startTime: 0, endTime: 9999999999)
          }
        }
      }
    `, { code });

    const report = data.reportData.report;

    if (!report.masterData.actors.length) {
      return res.status(400).json({ error: 'No players found in this log' });
    }

    const playerMap = {};
    report.masterData.actors.forEach(actor => {
      playerMap[actor.name] = {
        name: actor.name,
        class: actor.subType,
        flask: false,
        food: false,
        rune: false,
        potion: false,
      };
    });

    const auras = report.buffs?.data?.auras || [];
    auras.forEach(aura => {
      if (!ALL_IDS.includes(aura.guid)) return;

      const category =
        CONSUMABLES.flasks.includes(aura.guid) ? 'flask' :
        CONSUMABLES.food.includes(aura.guid)   ? 'food'  :
        CONSUMABLES.runes.includes(aura.guid)  ? 'rune'  :
        'potion';

      (aura.sources || []).forEach(source => {
        if (playerMap[source.name]) {
          playerMap[source.name][category] = true;
        }
      });
    });

    return res.json({
      title: report.title,
      killCount: (report.fights || []).length,
      players: Object.values(playerMap),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed to analyze log' });
  }
}
