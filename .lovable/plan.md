## Plan: Byt namn till FLOVVK

### 1. Ladda upp logotypen som CDN-asset

- Ladda upp `Flovvk.png` via `lovable-assets create` → `src/assets/flovvk-logo.png.asset.json`.

### 2. Header (`src/components/AppShell.tsx`)

- Ersätt den blå "OVK"-rutan + texten "Besiktning" med `<img>` som visar FLOVVK-logotypen.
- Sätt lämplig höjd (ca 32–40 px) så den passar i headern, med `alt="FLOVVK"`.

### 3. Textuella förekomster → "FLOVVK"

- `index.html`: `<title>`, meta description, author, `apple-mobile-web-app-title`, `og:title`, `og:description` → använd "FLOVVK – Protokoll & ventilationskontroll" / motsvarande.
- `public/manifest.webmanifest`: `name`, `short_name`, `description`.
- `src/pages/Home.tsx`: rubrik "OVK-besiktningar" → "FLOVVK – besiktningar" (behåller betydelsen).
- `src/pages/InstallPage.tsx`: "Installera OVK på surfplattan" → "Installera FLOVVK på surfplattan".
- `src/sections/IntygView.tsx`: behåll "OVK – Obligatorisk ventilationskontroll" eftersom det är den juridiska benämningen på själva intyget (inte appnamnet). 

### 4. Verifiera

- Visuell kontroll i preview att logotypen renderas snyggt i headern på både desktop och mobil.

### Frågor

- IntygView-rubriken ("OVK – Obligatorisk ventilationskontroll") är en officiell term — ska den vara kvar eller också bytas? Svar: den ska vara kvar.