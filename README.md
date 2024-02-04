# Michelin Guide Scraper

🍽️ Scrapes data about restaurants from the [MICHELIN Guide](https://guide.michelin.com/gb/en/restaurants), including Michelin Star and Bib Gourmand-awarded restaurants

__Disclaimer__: I am not affiliated with MICHELIN, and use of this scraper by violate MICHELIN's terms and conditions or local laws.

The output looks like this:

```js
[
  {
    "@context": "http://schema.org",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Jorge Juan 19",
      "addressLocality": "Valencia",
      "postalCode": "46004",
      "addressCountry": "ESP",
      "addressRegion": "Community of Valencia"
    },
    "name": "Habitual",
    "image": "https://axwwgrkdco.cloudimg.io/v7/__gmpics__/0a9fca1eab7e4e0ea2ee64fe0bd31836?width=1000",
    "@type": "Restaurant",
    "review": {
      "@type": "Review",
      "datePublished": "2023-11-28T11:40",
      "name": "Habitual",
      "description": "This unusual restaurant, part of chef Ricard Camarena’s stable, boasts a surprising design and layout on the lower floor of the Modernist-style Mercado de Colón. The extensive and affordable à la ...",
      "author": {
        "@type": "Person",
        "name": "Michelin Inspector"
      }
    },
    "telephone": "+34 963 44 56 31",
    "knowsLanguage": "en-ES",
    "acceptsReservations": "No",
    "servesCuisine": "International",
    "url": "https://guide.michelin.com/gb/en/comunidad-valenciana/valencia/restaurant/habitual",
    "currenciesAccepted": "EUR",
    "paymentAccepted": "American Express credit card, Credit card / Debit card accepted, Mastercard credit card, Visa credit card",
    "award": "Selected: Good cooking",
    "brand": "MICHELIN Guide",
    "hasDriveThroughService": "False",
    "latitude": 39.4687302,
    "longitude": -0.3689512,
    "hasMap": "https://www.google.com/maps/search/?api=1&query=39.4687302%2C-0.3689512"
  },
  // ...
]
```

## Usage

1. Make sure Node.js is available on your machine. v20 is recommended.
1. Clone the repository: `git clone git@github.com:timrogers/michelin-guide-scraper.git`
1. Install the dependencies: `npm i`.
1. Start the scraper: `npm start`. Optionally, you can use the `--limit` argument to limit the number of restaurants scraped (e.g. `npm start -- --limit 1`).
1. Wait a while! The data will be written to `data/restaurants.json`.