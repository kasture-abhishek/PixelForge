# PixelForge — Build Plan & Feature Roadmap

> Personal reference doc. Static pages only (HTML + CSS + JS). No backend.

---

## 1. Immediate Code Fixes (Before New Features)

### 1.1 Nav Link
```html
<!-- CURRENT — wrong -->
<a href="#testimonials">Partners</a>

<!-- CHANGE TO — pick one based on section you build -->
<a href="#workflow">How It Works</a>
<a href="#showcase">Showcase</a>
<a href="#changelog">Updates</a>
```

### 1.2 Fake Stats in `#about` — Replace with honest numbers
```html
<!-- REMOVE -->
<strong>1M+</strong><span>Active users</span>
<strong>50M+</strong><span>Edit photos</span>
<strong>4.9★</strong><span>User ratings</span>

<!-- REPLACE WITH — things you can actually stand behind -->
<strong>25+</strong><span>Built-in tools</span>
<strong>6</strong><span>Export formats</span>
<strong>0</strong><span>Servers used</span>
```

### 1.3 CTA Section — Remove agency template copy
```html
<!-- REMOVE -->
"2 open spots left this month"
"Book a 15-minute call"

<!-- REPLACE WITH -->
"Your images. Your browser. No uploads."
<a href="/frontend/editor.html">Open the Editor →</a>
```

---

## 2. Replace `#testimonials` — 3 Options

### Option A — "How It Works" Steps ⭐ Recommended
**Section ID:** `#workflow` | **Nav label:** `How It Works`

3-card horizontal row with a connector line:

| Step 1 | Step 2 | Step 3 |
|--------|--------|--------|
| 🖼 Drop your image | 🎨 Pick your tools | ⬇ Export & Download |
| Drag-drop or browse. JPG, PNG, GIF, WEBP, up to 50MB. | Adjust, filter, crop, convert — all live in-browser. | Save as any format. No account. No watermark. |

**CSS approach:** Reuse existing `.feat-card` grid. Add a pseudo-element connector line between cards using `::after` on the wrapper.

**Bonus:** Merge the fake `#about` stats row *below* the 3 steps inside this same section. One combined section replaces two weak ones.

---

### Option B — Format Support Showcase
**Section ID:** `#formats` | **Nav label:** `Formats`

Two rows of pill badges:

```
INPUT  →  [ JPG ] [ PNG ] [ GIF ] [ WEBP ] [ AVIF ] [ PDF ] [ BMP ]
OUTPUT →  [ JPG ] [ PNG ] [ WEBP ] [ AVIF ] [ PDF ] [ GIF ]
```

**CSS approach:** Reuse `.work-tag` class (already has mono font + accent-ink background). Group into two `<div>` rows with a label prefix.

---

