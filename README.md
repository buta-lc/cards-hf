# Cards HF

Overlay + dashboard admin pour gerer des cartes de haut-faits en direct:

- Board public: affichage des cartes et tri.
- Overlay OBS grille: reveal centre en direct.
- Overlay OBS solo: reveal carte unique (intro dos -> flip -> front -> outro).
- Admin: creation cartes, attribution, validation, reveal/recache, rollback d'etat.
- Audio reveal: bibliotheque mp3/wav stockee sur Supabase Storage + selection par carte + pre-ecoute.

Projet maintenu et signe par Buta.

## Stack

- React + Vite
- Supabase (Auth, Postgres, Realtime, Storage)
- GitHub Pages (HashRouter)

## Demarrage rapide

1. Installer les dependances:

```bash
npm install
```

2. Creer `.env` local:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_ACTIVE_SEASON=saison-1
VITE_REVEAL_SOUND_URL=
VITE_REVEAL_SOUND_BUCKET=reveal-sounds
```

3. Lancer en dev:

```bash
npm run dev
```

4. Build production:

```bash
npm run build
```

## Routes

- `/#/` : board public
- `/#/obs` : overlay OBS grille
- `/#/obs-solo` : overlay OBS solo
- `/#/admin/login` : login admin
- `/#/admin` : dashboard admin
- `/#/admin/cards` : gestion cartes + bibliotheque audio

## Audio Reveal (Supabase Storage)

La feature audio par carte utilise le bucket Storage configure par `VITE_REVEAL_SOUND_BUCKET` (par defaut `reveal-sounds`).

### Workflow admin

1. Upload d'un son depuis l'ecran admin cartes.
2. Le son apparait dans la bibliotheque (taille + pre-ecoute).
3. Selection du son pour une carte.
4. Au reveal, l'overlay joue d'abord le son de la carte, sinon fallback sur `VITE_REVEAL_SOUND_URL`.

### Contraintes de taille

- Recommande: `< 1 MB` (meilleure reactivite stream)
- Autorise: `<= 5 MB`
- Bloque: `> 5 MB`

### Permissions Supabase minimales

- Pas besoin de nouvelles cles API.
- Les cles actuelles suffisent (URL + publishable key), si les policies Storage sont en place.
- Il faut autoriser les admins authentifies a uploader/lister dans le bucket audio.

Exemple de policy SQL (a adapter a votre schema admin):

```sql
-- bucket: reveal-sounds
-- lecture publique (si souhaitee)
create policy "public can read reveal sounds"
on storage.objects for select
to public
using (bucket_id = 'reveal-sounds');

-- upload admin authentifie
create policy "admins can upload reveal sounds"
on storage.objects for insert
to authenticated
with check (bucket_id = 'reveal-sounds');
```

## UX Admin - etats de carte

Le dashboard permet maintenant:

- Validation d'une attribution (`locked` -> `validated`)
- Reveal immediat
- Recache d'une carte deja reveal
- Retour en `locked` (annule validation + reveal)
- Repassage en `validated` apres recache

## Deploy GitHub Pages

- Build Vite avec base configuree dans `vite.config.js`.
- Deploy via workflow GitHub Actions sur `gh-pages`.

## Licence

Ce projet est distribue sous licence non commerciale (voir `LICENSE`).
Toute utilisation commerciale est interdite sans accord ecrit explicite de Buta.
