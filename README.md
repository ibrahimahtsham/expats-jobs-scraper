# Expat Jobs Scraper

Two Tampermonkey userscripts I put together to pull job listings off
expatriates.com and match them against my own CV instead of manually
scrolling through hundreds of posts.

Not affiliated with expatriates.com in any way. Not sure if scraping
like this is something they're fine with, so use your own judgement
if you decide to run these.

## What's in here

- `tampermonkey-expats-jobs.user.js` - run this on
  https://www.expatriates.com/classifieds/jobs/ to pull every listing
  across all pages (title, url, location, image) into one JSON file.
- `tampermonkey-expat-detail-scraper.user.js` - takes that JSON, then
  visits each individual job page one by one and scrapes the full
  description, contact info (email/WhatsApp), and posting details.
- `expat-jobs-all-pages.json` - the raw data I pulled when I ran this
  myself. This is just a snapshot from that date, not live data. If
  you're trying to use this for your own search, don't rely on this
  file, rerun the scripts yourself to get current listings.

## The flow

1. Run the first script on the jobs listing page. It'll give you a
   "Download all pages JSON" button, click it, that pulls every
   listing across all pages into one file.
2. Take that file and filter it down against your own CV/skills
   however you want (manually, or feed it to an AI, whatever works).
   You want a smaller filtered list before moving to step 3, since
   step 3 visits every URL one by one and that gets slow/heavy fast
   if you run it on everything.
3. Run the second script. It has a panel where you upload your
   filtered JSON, it'll then visit each job's page automatically and
   scrape the full description, email, WhatsApp number, etc. Give it
   a bit of time to work through the list, it waits a few seconds
   between each page so it doesn't hammer the site.
4. From there, you've got full details on just the jobs worth your
   time. Compare those against your CV properly and go from there.

## How to install a userscript

1. Install the Tampermonkey browser extension.
2. Open the `.user.js` file, copy the contents.
3. In Tampermonkey, create a new script and paste it in, save.
4. Visit the matching page (jobs listing page for the first script,
   any job detail page for the second) and the script will activate.

## Notes

- Everything runs client-side in your own browser, nothing gets sent
  anywhere else.
- The detail scraper waits between page loads on purpose, don't
  remove that, it's there to not hit the site too aggressively.
- If the site's HTML structure changes, the selectors in these
  scripts will probably break and need updating.
