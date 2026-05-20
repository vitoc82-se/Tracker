import os
import re
import base64
import aiohttp
import discord
from discord import app_commands

# The War Within consumable spell IDs — update when new patches release
CONSUMABLES = {
    'flasks':  [431929, 431930, 431931, 431932, 432112],
    'food':    [457301, 430704, 431769, 432819],
    'runes':   [403096],
    'potions': [431416, 432021, 431419],
}
ALL_IDS = {id for ids in CONSUMABLES.values() for id in ids}

WCL_TOKEN_URL = 'https://www.warcraftlogs.com/oauth/token'
WCL_API_URL   = 'https://www.warcraftlogs.com/api/v2/client'


async def get_wcl_token(session: aiohttp.ClientSession) -> str:
    creds = base64.b64encode(
        f"{os.environ['WCL_CLIENT_ID']}:{os.environ['WCL_CLIENT_SECRET']}".encode()
    ).decode()
    async with session.post(
        WCL_TOKEN_URL,
        headers={'Authorization': f'Basic {creds}'},
        data={'grant_type': 'client_credentials'},
    ) as resp:
        data = await resp.json()
        return data['access_token']


async def query_wcl(session: aiohttp.ClientSession, token: str, query: str, variables: dict) -> dict:
    async with session.post(
        WCL_API_URL,
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        json={'query': query, 'variables': variables},
    ) as resp:
        return await resp.json()


def extract_code(url: str):
    match = re.search(r'reports/([a-zA-Z0-9]+)', url)
    return match.group(1) if match else None


intents = discord.Intents.default()
client  = discord.Client(intents=intents)
tree    = app_commands.CommandTree(client)


@tree.command(name='checkpots', description='Check consumable usage from a Warcraft Logs report')
@app_commands.describe(log_url='The full Warcraft Logs report URL')
async def checkpots(interaction: discord.Interaction, log_url: str):
    await interaction.response.defer(thinking=True)

    code = extract_code(log_url)
    if not code:
        await interaction.followup.send('Invalid Warcraft Logs URL. Please paste the full report link.')
        return

    async with aiohttp.ClientSession() as session:
        try:
            token  = await get_wcl_token(session)
            result = await query_wcl(session, token, '''
                query GetReport($code: String!) {
                  reportData {
                    report(code: $code) {
                      title
                      fights(killType: Kills) { id }
                      masterData {
                        actors(type: "Player") { id name subType }
                      }
                      buffs: table(dataType: Buffs, startTime: 0, endTime: 9999999999)
                    }
                  }
                }
            ''', {'code': code})

            report = result['data']['reportData']['report']
            actors = report['masterData']['actors']

            if not actors:
                await interaction.followup.send('No players found in this log.')
                return

            player_map = {
                a['name']: {'name': a['name'], 'flask': False, 'food': False, 'rune': False, 'potion': False}
                for a in actors
            }

            auras = (report.get('buffs') or {}).get('data', {}).get('auras', [])
            for aura in auras:
                if aura['guid'] not in ALL_IDS:
                    continue
                category = (
                    'flask'  if aura['guid'] in CONSUMABLES['flasks']  else
                    'food'   if aura['guid'] in CONSUMABLES['food']    else
                    'rune'   if aura['guid'] in CONSUMABLES['runes']   else
                    'potion'
                )
                for source in aura.get('sources', []):
                    if source['name'] in player_map:
                        player_map[source['name']][category] = True

            kill_count = len(report['fights'])
            players    = list(player_map.values())

            lines = [f"**{report['title']}** — {kill_count} kill{'s' if kill_count != 1 else ''}"]
            lines.append('```')
            lines.append(f"{'Player':<20} {'Flask':<7} {'Food':<7} {'Rune':<7} Potion")
            lines.append('─' * 52)

            missing_list = []
            for p in players:
                row = (
                    f"{p['name']:<20} "
                    f"{'✓' if p['flask'] else '✗':<7}"
                    f"{'✓' if p['food']  else '✗':<7}"
                    f"{'✓' if p['rune']  else '✗':<7}"
                    f"{'✓' if p['potion'] else '✗'}"
                )
                lines.append(row)
                lacking = [k for k in ('flask', 'food', 'rune', 'potion') if not p[k]]
                if lacking:
                    missing_list.append(f"{p['name']}: {', '.join(lacking)}")

            lines.append('```')
            if missing_list:
                lines.append('**Slackers:**')
                lines += [f'• {m}' for m in missing_list]

            msg = '\n'.join(lines)
            if len(msg) > 1990:
                msg = msg[:1987] + '...'

            await interaction.followup.send(msg)

        except Exception as e:
            await interaction.followup.send(f'Error: {e}')


@client.event
async def on_ready():
    await tree.sync()
    print(f'Logged in as {client.user} — slash commands synced')


client.run(os.environ['DISCORD_BOT_TOKEN'])
