import { ProductsApiClient } from "./products-api.client";

async function runExample() {
  const client = new ProductsApiClient("http://localhost:3000");

  const catalog = await client.getProducts({ page: 1, limit: 10 });
  const categories = await client.getCategories();
  const card = await client.getProductCard("BAR-005");
  const offers = await client.getProductOffers("BAR-005", {
    sort: "price",
    inStock: true,
  });

  console.log(catalog.total);
  console.log(categories.categories.length);
  console.log(card.product.canonicalName);
  console.log(offers.total);
}

runExample().catch((error) => {
  console.error(error);
  process.exit(1);
});
