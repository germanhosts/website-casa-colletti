"""Fetch the Hospitable iCal export and write booking/availability.json.

The iCal URL is read from the environment variable ICAL_URL (a GitHub secret),
so it never appears in the public repository.
Only booked nights are written, no guest names or other details.
"""
import datetime as dt
import json
import os
import re
import sys
import urllib.request

OUT = os.path.join(os.path.dirname(__file__), "..", "booking", "availability.json")
HORIZON_DAYS = 730  # two years ahead


def parse_date(value):
    m = re.match(r"(\d{4})(\d{2})(\d{2})", value)
    return dt.date(int(m.group(1)), int(m.group(2)), int(m.group(3)))


def booked_nights(ics_text, today):
    # unfold folded lines (RFC 5545)
    text = re.sub(r"\r?\n[ \t]", "", ics_text)
    nights = set()
    for block in text.split("BEGIN:VEVENT")[1:]:
        start = re.search(r"^DTSTART[^:\n]*:(\S+)", block, re.M)
        end = re.search(r"^DTEND[^:\n]*:(\S+)", block, re.M)
        if not start:
            continue
        s = parse_date(start.group(1))
        e = parse_date(end.group(1)) if end else s + dt.timedelta(days=1)
        if e <= s:
            e = s + dt.timedelta(days=1)
        d = max(s, today)
        limit = min(e, today + dt.timedelta(days=HORIZON_DAYS))
        while d < limit:  # DTEND is the departure day, which stays free
            nights.add(d.isoformat())
            d += dt.timedelta(days=1)
    return sorted(nights)


def main():
    url = os.environ.get("ICAL_URL", "").strip()
    if not url:
        sys.exit("ICAL_URL secret is missing")
    req = urllib.request.Request(url, headers={"User-Agent": "casa-colletti-availability"})
    with urllib.request.urlopen(req, timeout=30) as r:
        ics = r.read().decode("utf-8", "replace")
    if "BEGIN:VCALENDAR" not in ics:
        sys.exit("Response is not an iCal calendar, keeping the old file")
    today = dt.date.today()
    data = {"updated": dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
            "booked": booked_nights(ics, today)}
    old = None
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as f:
            old = json.load(f)
    if old and old.get("booked") == data["booked"]:
        print("No change in availability")
        return
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1)
    print("Updated:", len(data["booked"]), "booked nights")


if __name__ == "__main__":
    main()
