# Mirwa — Fine & Fashion Jewelry Website

A multi-page jewelry brand website inspired by tirisi.com, built with plain HTML/CSS/JS
(no build step required — just open `index.html` in a browser, or serve the folder).

## Structure
```
mirwa/
├── index.html          Homepage — hero video, brand split, featured products, categories, journal, newsletter
├── collections.html    Shop page with category filtering
├── about.html           "The House" — brand story, values, timeline
├── contact.html         Contact form + showroom info
├── css/
│   └── style.css        Full design system (tokens, layout, components)
├── js/
│   ├── products.js       Shared product + image data
│   ├── main.js            Nav toggle, filters, forms, back-to-top
│   └── footer.js           Injects the shared footer on every page
└── README.md
```

## Design
- Palette: ink black, warm bone ivory, antique gold, deep emerald, blush rose
- Type: Cormorant Garamond (display) + Jost (body), via Google Fonts
- Signature motif: a hand-drawn "chain link" SVG divider between sections

## Media credits (free-to-use)
All photography is free-to-use under the Unsplash License, hotlinked from
`images.unsplash.com`:
- Photo by Sama Hosseini — woman wearing a gold ring
- Photo by Zayed Ahmed Zadu — gold necklace & earrings on display
- Photo by Ian Talmacs — gold hoop earrings on white background
- Photo by Zeralton Gallery — gold bracelets on a wrist
- Photo by John Marfe Bitoon — gold heart necklace on satin

The hero background video is free-to-use under the Pexels License, hotlinked from
`videos.pexels.com`:
- Video by Mariam Antadze — close-up of a gold necklace

No files were downloaded locally; all media is referenced by direct URL so the
site stays lightweight. Swap in your own imagery by editing `js/products.js`.
