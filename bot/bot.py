#!/usr/bin/env python3
"""
Artist Intelligence — Free Lookup Bot v2
Upgrades: inline buttons, subscribe flow, email capture, cleaner output.
"""

import os
import json
import time
import logging
from datetime import datetime

import requests
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    ContextTypes, filters, ConversationHandler, CallbackQueryHandler
)

# ─── Config ────────────────────────────────────────────────────────────────────

BOT_TOKEN = "8460901939:AAGTUts0JTRt328aHjSfNJQjw9g5IEIMZr4"
BOT_DIR = os.path.dirname(os.path.abspath(__file__))
LASTFM_API_KEY = os.getenv("LASTFM_API_KEY", "2684ede9b552689e73757de16403d766")
CACHE_TTL_SECONDS = 600
LEADS_FILE = os.path.join(BOT_DIR, "leads.json")
STATS_FILE = os.path.join(BOT_DIR, "stats.json")
ADMIN_IDS = [5393795759]  # Landen — add more Telegram IDs here

# ─── Conversation states ─────────────────────────────────────────────────────
(STATE_IDLE, STATE_EMAIL) = range(2)

# ─── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    format="%(asctime)s %(levelname)s %(message)s",
    level=logging.INFO,
    handlers=[
        logging.FileHandler(os.path.join(BOT_DIR, "bot.log"), encoding="utf-8"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)

# ─── Cache ───────────────────────────────────────────────────────────────────
cache = {}

def cache_get(key):
    entry = cache.get(key)
    if entry and (time.time() - entry["ts"]) < CACHE_TTL_SECONDS:
        return entry["data"]
    return None

def cache_set(key, data):
    cache[key] = {"data": data, "ts": time.time()}

# ─── Leads ────────────────────────────────────────────────────────────────────
def load_leads():
    if os.path.exists(LEADS_FILE):
        try:
            with open(LEADS_FILE, encoding="utf-8") as f:
                return json.load(f)
        except:
            return []
    return []

def save_lead(email: str, source: str = "bot"):
    leads = load_leads()
    # deduplicate by email
    if any(l.get("email","").lower() == email.lower() for l in leads):
        return False
    leads.append({
        "email": email,
        "source": source,
        "timestamp": datetime.now().isoformat(),
    })
    with open(LEADS_FILE, "w", encoding="utf-8") as f:
        json.dump(leads, f, indent=2)
    log.info(f"Lead saved: {email}")
    # bump stats
    increment_stat("leads_captured")
    return True

# ─── Stats ─────────────────────────────────────────────────────────────────────
stats = {"total_lookups": 0, "leads_captured": 0, "top_artists": {}}

def load_stats():
    global stats
    if os.path.exists(STATS_FILE):
        try:
            with open(STATS_FILE, encoding="utf-8") as f:
                stats = json.load(f)
        except:
            pass

def save_stats():
    try:
        with open(STATS_FILE, "w", encoding="utf-8") as f:
            json.dump(stats, f, indent=2)
    except:
        pass

def increment_stat(key, artist_name=None):
    global stats
    load_stats()
    if key == "lookup":
        stats["total_lookups"] = stats.get("total_lookups", 0) + 1
    elif key == "leads_captured":
        stats["leads_captured"] = stats.get("leads_captured", 0) + 1
    if artist_name:
        top = stats.get("top_artists", {})
        artist_key = artist_name.lower().strip()
        top[artist_key] = top.get(artist_key, 0) + 1
        stats["top_artists"] = top
    save_stats()

def get_stats_display():
    load_stats()
    total = stats.get("total_lookups", 0)
    leads = stats.get("leads_captured", 0)
    top = stats.get("top_artists", {})
    top_sorted = sorted(top.items(), key=lambda x: x[1], reverse=True)[:10]

    lines = ["📊 *Bot Stats*", "━" * 24]
    lines.append(f"   🔍 Total lookups: *{total}*")
    lines.append(f"   📩 Leads captured: *{leads}*")

    if top_sorted:
        lines.append("\n   🔥 *Top Artists*:")
        for i, (name, count) in enumerate(top_sorted, 1):
            bar = "▓" * min(count, 10)
            lines.append(f"   {i}. {name.title()} — {count} {bar}")
    else:
        lines.append("\n   No top artists yet.")

    return "\n".join(lines)

# ─── Data Fetchers ───────────────────────────────────────────────────────────
def format_number(n):
    if n is None: return "—"
    if n >= 1_000_000: return f"{n/1_000_000:.1f}M"
    if n >= 1_000: return f"{n/1_000:.0f}K"
    return str(n)

def tier_info(ratio):
    if ratio is None: return ("⚪", "Unknown", "—")
    if ratio >= 150: return ("🔴", "Elite", "Elite superfan base — highest repeat behavior.")
    if ratio >= 100: return ("🟡", "High", "Strong repeat — fans are locked in.")
    if ratio >= 60:  return ("🟡", "Solid", "Solid core, growing but not sticky.")
    if ratio >= 30:  return ("🟢", "Growing", "Broad reach, low repeat — breakout changes this.")
    return ("⚪", "Sparse", "Early stage.")

def fetch_artist(artist_name):
    cached = cache_get(artist_name.lower())
    if cached:
        log.info(f"Cache hit: {artist_name}")
        return cached

    log.info(f"Fetching: {artist_name}")

    # Last.fm — core stats
    try:
        lfm_resp = requests.get(
            "https://ws.audioscrobbler.com/2.0/",
            params={"method": "artist.getinfo", "artist": artist_name,
                    "api_key": LASTFM_API_KEY, "format": "json"},
            headers={"User-Agent": "ArtistIntelligenceBot/2.0"},
            timeout=15
        )
        a = lfm_resp.json().get("artist", {})
        stats = a.get("stats", {})
        listeners = int(stats.get("listeners", 0))
        playcount = int(stats.get("playcount", 0))
        ratio = round(playcount / max(listeners, 1), 1)
        tags = [t["name"] for t in a.get("tags", {}).get("tag", [])[:5]]
        sim = [s["name"] for s in a.get("similar", {}).get("artist", [])[:3]]
        bio_summary = a.get("bio", {}).get("summary", "")[:120].replace("<a href=", "").replace("</a>", "").strip()
    except Exception as e:
        log.warning(f"Last.fm error: {e}")
        listeners, playcount, ratio, tags, sim, bio_summary = 0, 0, 0, [], [], ""

    # Last.fm — top tracks
    try:
        tracks_resp = requests.get(
            "https://ws.audioscrobbler.com/2.0/",
            params={"method": "artist.gettoptracks", "artist": artist_name,
                    "api_key": LASTFM_API_KEY, "format": "json", "limit": 5},
            headers={"User-Agent": "ArtistIntelligenceBot/2.0"}
        )
        top_tracks = []
        for t in tracks_resp.json().get("toptracks", {}).get("track", []):
            top_tracks.append({
                "name": t.get("name"),
                "plays": int(t.get("playcount", 0)),
            })
    except:
        top_tracks = []

    # Apple Music / iTunes
    try:
        it_resp = requests.get(
            "https://itunes.apple.com/search",
            params={"term": artist_name, "entity": "musicArtist", "limit": 1},
            timeout=10
        )
        r = it_resp.json().get("results", [{}])[0]
        genre = r.get("primaryGenreName", "—")
        itunes_url = r.get("artistLinkUrl", "")
    except:
        genre, itunes_url = "—", ""

    # MusicBrainz — artist profile + get MBID for Setlist.fm
    mb_country, mb_born, mb_tags, mbid = "—", None, [], None
    try:
        mb_search = requests.get(
            "https://musicbrainz.org/ws/2/artist/",
            params={"query": f"artist:{artist_name}", "fmt": "json", "limit": 1},
            headers={"User-Agent": "ArtistIntelligenceBot/4.0 (contact@artistintelligence.com)"},
            timeout=10
        )
        mb_artists = mb_search.json().get("artists", [])
        if mb_artists:
            mbid = mb_artists[0]["id"]
            time.sleep(1)  # rate limit
            # Get detailed artist data
            mb_detail = requests.get(
                f"https://musicbrainz.org/ws/2/artist/{mbid}",
                params={"inc": "tags+aliases", "fmt": "json"},
                headers={"User-Agent": "ArtistIntelligenceBot/4.0"},
                timeout=10
            )
            detail = mb_detail.json()
            lifespan = detail.get("life-span", {})
            mb_born = lifespan.get("begin", "")
            mb_country = detail.get("country", "—")
            mb_tags = [t["name"] for t in detail.get("tags", [])[:4]]
    except Exception as e:
        log.warning(f"MusicBrainz error: {e}")

    # Setlist.fm — recent shows (disabled - now requires API key)
    recent_shows = []
    # if mbid:
    #     try:
    #         setlist_resp = requests.get(
    #             f"https://api.setlist.fm/rest/1.0/artist/{mbid}/setlists",
    #             headers={"Accept": "application/json", "User-Agent": "ArtistIntelligenceBot/5.0"},
    #             timeout=15
    #         )
    #         setlist_data = setlist_resp.json()
    #         setlists = setlist_data.get("setlist", [])
    #         for s in setlists[:3]:
    #             event_date = s.get("eventDate", "")
    #             venue_info = s.get("venue", {})
    #             venue_name = venue_info.get("name", "")
    #             city_info = venue_info.get("city", {})
    #             city_name = city_info.get("name", "")
    #             if venue_name:
    #                 recent_shows.append({"date": event_date, "venue": venue_name, "city": city_name})
    #     except Exception as e:
    #         log.warning(f"Setlist.fm error: {e}")

    data = {
        "listeners": listeners,
        "playcount": playcount,
        "ratio": ratio,
        "tags": tags,
        "similar": sim,
        "bio": bio_summary,
        "top_tracks": top_tracks,
        "genre": genre,
        "itunes_url": itunes_url,
        "mb_country": mb_country,
        "mb_born": mb_born,
        "mb_tags": mb_tags,
        "recent_shows": recent_shows,
        "fetched_at": datetime.now().isoformat(),
    }
    cache_set(artist_name.lower(), data)
    return data

# ─── Formatter ────────────────────────────────────────────────────────────────
def format_brief_v2(artist_name: str, data: dict) -> str:
    ratio = data.get("ratio", 0)
    tier_icon, tier_label, tier_note = tier_info(ratio)
    ratio_disp = f"{ratio:.0f}x" if ratio else "—"

    lines = []
    push = lines.append

    push(f"🎤 {artist_name.upper()}")
    push(f"Superfan Index · {datetime.now().strftime('%b %d')}\n")

    push("━" * 28)
    push("📡 SUPERFAN INDEX")
    push("━" * 28)
    push(f"   {format_number(data['listeners'])} listeners")
    push(f"   {format_number(data['playcount'])} scrobbles")
    push(f"   {ratio_disp} ratio  {tier_icon} {tier_label}")
    push(f"   {tier_note}")
    push(f"   Genre: {data.get('genre','—')}")

    if data.get("tags"):
        push(f"   Tags: {' · '.join(data['tags'][:4])}")

    tracks = data.get("top_tracks", [])
    if tracks:
        push("\n" + "━" * 28)
        push("🔥 TOP TRACKS")
        push("━" * 28)
        max_plays = tracks[0]["plays"] if tracks else 1
        for i, t in enumerate(tracks[:5], 1):
            bar = "▓" * min(int(t["plays"] / max(max_plays, 1) * 10), 10)
            push(f"   {i}. {t['name']}")
            push(f"      {format_number(t['plays'])} plays {bar}")

    sim = data.get("similar", [])
    if sim:
        push(f"\n   Fans also follow: {' · '.join(sim)}")

    # MusicBrainz profile
    mb_country = data.get("mb_country", "—")
    mb_born = data.get("mb_born", "")
    mb_tags = data.get("mb_tags", [])
    if mb_country and mb_country != "—":
        # Format country: US -> 🇺🇸 USA, GB -> 🇬🇧 UK, etc.
        country_flags = {
            "US": "🇺🇸 USA", "GB": "🇬🇧 UK", "CA": "🇨🇦 Canada",
            "AU": "🇦🇺 Australia", "DE": "🇩🇪 Germany", "FR": "🇫🇷 France",
            "JP": "🇯🇵 Japan", "NG": "🇳🇬 Nigeria", "GH": "🇬🇭 Ghana",
            "JM": "🇯🇲 Jamaica", "HT": "🇭🇹 Haiti", "MX": "🇲🇽 Mexico"
        }
        flag = country_flags.get(mb_country, mb_country)
        
        push("\n" + "━" * 28)
        push("🏛 ARTIST PROFILE")
        push("━" * 28)
        push(f"   {flag}")
        if mb_born:
            push(f"   Born: {mb_born}")
        if mb_tags:
            push(f"   MB Tags: {' · '.join(mb_tags)}")

    push("\n" + "━" * 28)
    push("Source: Last.fm · Apple Music · MusicBrainz")
    # Recent shows section commented out - Setlist.fm now requires API key
    push("Landen's Artist Intelligence · @artistintelligencee")

    # Recent shows from Setlist.fm
    recent_shows = data.get("recent_shows", [])
    if recent_shows:
        push("\n" + "━" * 28)
        push("🎸 RECENT SHOWS")
        push("━" * 28)
        for show in recent_shows:
            date = show.get("date", "")
            venue = show.get("venue", "")
            city = show.get("city", "")
            push(f"   📍 {venue}, {city}")
            if date:
                push(f"      📅 {date}")

    return "\n".join(lines)

def get_subscribe_keyboard():
    keyboard = [
        [InlineKeyboardButton("📊 Get Full Monthly Brief", callback_data="subscribe")],
        [InlineKeyboardButton("🔍 Look Up Another Artist", callback_data="another")],
    ]
    return InlineKeyboardMarkup(keyboard)

def get_email_keyboard():
    keyboard = [
        [InlineKeyboardButton("❌ Cancel", callback_data="cancel_email")],
    ]
    return InlineKeyboardMarkup(keyboard)

def get_leads_display():
    leads = load_leads()
    if not leads:
        return (
            "📭 *No leads yet.*\n\n"
            "Leads appear when someone taps 'Get Monthly Brief' and drops their email."
        )
    lines = [f"📋 *{len(leads)} Lead{'s' if len(leads) != 1 else ''}*\n"]
    for i, l in enumerate(leads, 1):
        ts = l.get("timestamp", "")[:10]
        src = l.get("source", "")
        email = l.get("email", "")
        lines.append(f"{i}. {email}  ·  {ts}  ·  {src}")
    lines.append("\n_Reply with an artist name to pitch them._")
    return "\n".join(lines)

# ─── Telegram Handlers ────────────────────────────────────────────────────────
WELCOME = """
🎤 *Landen's Artist Intelligence*

Type any artist name to get their *Superfan Index* instantly — listeners, scrobbles, ratio, top tracks.

_Your streaming data, decoded._

─────────────
📊 *Monthly Brief* — Full intelligence with tour intel, trends, fanbase breakdown.
🔍 *Quick Lookup* — Just drop any artist name.
📩 *Subscribe* — DM /subscribe to get started.

─────────────
@artistintelligencee · linktr.ee/artistintelligence"""

APP_KEYBOARD = ReplyKeyboardMarkup(
    [
        ["🔍 Look Up Artist"],
        ["📊 Get Monthly Brief"],
        ["ℹ️ About", "⚙️ Help"],
    ],
    resize_keyboard=True,
    input_field_placeholder="Type an artist name..."
)

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        WELCOME, parse_mode="Markdown",
        reply_markup=APP_KEYBOARD
    )

async def help_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🎤 *Commands:*\n\n"
        "• Any artist name — get Superfan Index\n"
        "• /subscribe — get monthly briefs\n"
        "• /about — learn more\n"
        "• /leads — admin only\n"
        "• /stats — admin only\n\n"
        "Try: *Osamason*, *Slayr*, *Nine Vicious*",
        parse_mode="Markdown"
    )

ABOUT = """
🎤 *Landen's Artist Intelligence*

We decode streaming data for indie artists who want to stop guessing and start winning.

📊 Monthly briefs include:
• Superfan Index (listeners × scrobbles ratio)
• Top tracks with play counts
• Tour intel + countdown
• Fanbase trends
• Plain takeaways

💰 $150-300/mo based on ratio
One free month to start.

@artistintelligencee · linktr.ee/artistintelligence"""

async def about_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(ABOUT, parse_mode="Markdown")

async def subscribe_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "📊 *Monthly Brief — One Free Month*\n\n"
        "Drop your email and I'll send you a full artist intelligence brief "
        "— streaming trends, tour intel, fanbase breakdown, and a monthly wrap.\n\n"
        "No commitment. Just better data.\n\n"
        "Type your email below:",
        parse_mode="Markdown",
        reply_markup=get_email_keyboard()
    )
    return STATE_EMAIL

async def cancel_email_callback(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    await query.edit_message_text("Cancelled. Type any artist name to look them up 🎤")
    return ConversationHandler.END

async def leads_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    sender_id = update.message.from_user.id
    if sender_id not in ADMIN_IDS:
        await update.message.reply_text("This command is for the admin only.")
        return
    await update.message.reply_text(get_leads_display(), parse_mode="Markdown")

async def stats_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    sender_id = update.message.from_user.id
    if sender_id not in ADMIN_IDS:
        await update.message.reply_text("This command is for the admin only.")
        return
    await update.message.reply_text(get_stats_display(), parse_mode="Markdown")

async def email_received(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    email = update.message.text.strip().lower()

    # Basic validation
    if "@" not in email or "." not in email.split("@")[1]:
        await update.message.reply_text("That doesn't look like a valid email. Try again:")
        return STATE_EMAIL

    saved = save_lead(email, source="bot_subscribe")
    if saved:
        msg = (
            "✅ *You're in.*\n\n"
            "One free month of full artist intelligence briefs — "
            "streaming data, tour intel, fanbase analysis, monthly wrap.\n\n"
            "I'll be in touch when your brief is ready. "
            "Drop any artist name to explore in the meantime 🎤"
        )
    else:
        msg = (
            "📩 You're already on the list.\n\n"
            "Drop any artist name to explore in the meantime 🎤"
        )

    await update.message.reply_text(msg, parse_mode="Markdown")
    return ConversationHandler.END

async def lookup(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    artist = update.message.text.strip()
    if not artist or artist.startswith("/"):
        return

    log.info(f"Lookup: {artist}")
    increment_stat("lookup", artist_name=artist)
    typing_msg = await update.message.reply_text("🎤 Looking up...")

    try:
        data = fetch_artist(artist)
    except Exception as e:
        log.error(f"Fetch error: {e}")
        await typing_msg.edit_text(
            f"Couldn't find '{artist}'. Try a different spelling.",
        )
        return

    if data["listeners"] == 0 and data["playcount"] == 0:
        await typing_msg.edit_text(
            f"No data found for '{artist}'. Check the spelling or try another artist."
        )
        return

    brief = format_brief_v2(artist, data)

    # Build subscribe keyboard
    ratio = data.get("ratio", 0)
    if ratio >= 150:
        tier_txt = "🔴 Elite artist — $300/mo tier"
    elif ratio >= 80:
        tier_txt = "🟡 High engagement — $200/mo tier"
    else:
        tier_txt = "🟢 Discovery — $150/mo tier"

    keyboard = [
        [InlineKeyboardButton(f"📊 Get Full Monthly Brief ({tier_txt})", callback_data="subscribe")],
        [InlineKeyboardButton("🔍 Look Up Another Artist", callback_data="another")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await typing_msg.edit_text(
        brief + "\n\n_Upgrade to a full monthly brief below_",
        parse_mode="Markdown",
        reply_markup=reply_markup
    )

async def button_callback(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    data = query.data

    if data == "subscribe":
        await query.edit_message_text(
            "📊 *Monthly Brief — One Free Month*\n\n"
            "Drop your email and I'll send you a full artist intelligence brief "
            "— streaming trends, tour intel, fanbase breakdown, and a monthly wrap.\n\n"
            "No commitment. Just better data.\n\n"
            "Type your email below:",
            parse_mode="Markdown",
            reply_markup=get_email_keyboard()
        )
        return STATE_EMAIL

    elif data == "another":
        await query.edit_message_text(
            "🔍 Type any artist name to look them up 🎤"
        )
        return ConversationHandler.END

    elif data == "cancel_email":
        await query.edit_message_text("Cancelled. Type any artist name to look them up 🎤")
        return ConversationHandler.END

async def unknown(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip().lower() if update.message.text else ""

    # App menu buttons
    if text == "🔍 look up artist":
        await update.message.reply_text(
            "🎤 *Type any artist name* to look them up.\n\nTry: *Osamason*, *Slayr*, *Nine Vicious*",
            parse_mode="Markdown"
        )
    elif text == "📊 get monthly brief" or text == "get monthly brief":
        await subscribe_cmd(update, ctx)
    elif text == "ℹ️ about" or text == "about":
        await about_cmd(update, ctx)
    elif text == "⚙️ help" or text == "help":
        await help_cmd(update, ctx)
    elif text.startswith("/"):
        return  # skip commands
    else:
        await lookup(update, ctx)

# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    log.info("Artist Intelligence bot v4 starting...")
    load_stats()

    app = (
        Application.builder()
        .token(BOT_TOKEN)
        .read_timeout(30)
        .write_timeout(30)
        .build()
    )

    # Conversation handler for subscribe flow (email capture)
    sub_conv = ConversationHandler(
        entry_points=[CommandHandler("subscribe", subscribe_cmd)],
        states={
            STATE_EMAIL: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, email_received),
                CallbackQueryHandler(cancel_email_callback, pattern="cancel_email"),
            ],
        },
        fallbacks=[],
    )

    app.add_handler(sub_conv)
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(CommandHandler("subscribe", subscribe_cmd))
    app.add_handler(CommandHandler("about", about_cmd))
    app.add_handler(CommandHandler("leads", leads_cmd))
    app.add_handler(CommandHandler("stats", stats_cmd))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, lookup))

    log.info("Bot running. Press Ctrl+C to stop.")
    app.run_polling(drop_pending_updates=True)

if __name__ == "__main__":
    main()