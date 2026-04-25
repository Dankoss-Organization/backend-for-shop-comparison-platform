import { ProductsApiClient } from "./products-api.client";

async function runExample() {
  const client = new ProductsApiClient("http://localhost:3000");

  const card = await client.getProductCard("BAR-005");
  const offers = await client.getProductOffers("BAR-005", {
    sort: "price",
    inStock: true,
  });

  console.log(card.product.canonicalName);
  console.log(offers.total);
}

runExample().catch((error) => {
  console.error(error);
  process.exit(1);
});
