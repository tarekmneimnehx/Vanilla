# Showing your Instagram feed on the site

The homepage has a **"Follow along"** section that displays your Instagram
posts. Right now it shows six of your existing photos as a placeholder. To make
it pull your **real posts automatically** (new posts appear on the site within
minutes of you posting them), connect a free feed widget — no coding, no server.

Instagram no longer lets a plain website read a feed directly, so you use a
widget service that does the Instagram connection for you and gives you one
snippet to paste. This is the normal, supported way for a static site.

## One-time setup (about 10 minutes)

1. **Pick a widget service** (any of these work; free tiers are fine):
   - **Behold.so** — https://behold.so (clean, generous free tier)
   - **SnapWidget** — https://snapwidget.com
   - **Elfsight** — https://elfsight.com/instagram-feed-instagram-widget/
   
   > Tip: for a live feed, most services want your Instagram to be a free
   > **Business** or **Creator** account (Instagram app → Settings → Account
   > type). It stays public and looks identical to visitors.

2. **Sign up** and **connect the `@vanillaconcept` account** when prompted.

3. **Design the feed** in their editor (grid, number of posts, spacing) and
   **copy the embed snippet** they give you. It looks something like:
   ```html
   <script src="https://w.behold.so/widget.js" type="module"></script>
   <behold-widget feed-id="XXXXXXXX"></behold-widget>
   ```

4. **Paste it into the site.** Open `index.html` and find this line:
   ```html
   <!-- PASTE INSTAGRAM WIDGET SNIPPET HERE -->
   ```
   Paste your snippet directly below it, then **delete the block** just under
   it that starts with `<!-- FALLBACK` and ends with its closing `</div>`
   (that's the placeholder photos). Save.

5. **Commit and publish** (or send it to whoever manages the site). Done —
   from now on your Instagram posts appear on the homepage automatically.

## Notes

- **Cost:** free tiers usually show a tiny "powered by" badge and cap the
  number of posts. Removing the badge is typically ~$5–8/month.
- **If you skip this:** the placeholder photos still look good and the
  **Follow @vanillaconcept** button + footer icons already link to your
  profile, so nothing is broken.
- **Want the feed on the Gallery page too?** Copy the whole
  `<section class="section tint ig-section"> … </section>` block from
  `index.html` into `gallery.html` in the same spot.
