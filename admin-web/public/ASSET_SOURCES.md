# Admin Login assets — S31.1

- `images/admin-login-museum.jpg` is an unchanged copy of
  `frontend-web/public/museum/images/hero.jpg`, already used by Customer Login.
  Source/usage records remain in `docs/MUSEUM_IMAGES.md`; this copy introduces
  no new historical claims or rights. Retain any required attribution if that
  source asset's licence/credit requirements change.
- `fonts/be-vietnam-pro/{regular,semibold,bold}.ttf` are unchanged copies from
  `frontend-web/src/assets/fonts/be-vietnam-pro/`; `OFL.txt` is copied alongside
  them. No remote font or image service is used.
- Museum mark SVG follows the existing Customer Login mark.

Set `VITE_PUBLIC_MUSEUM_URL` to the deployed Public Museum home URL. Admin's own
`/` redirects to Dashboard and is not the public home. The development default
is `http://localhost:5173/`; use the correct public host for production.
