# Search API Usage Examples

Practical examples for integrating the Meilisearch API into your applications.

## Table of Contents

1. [cURL Examples](#curl-examples)
2. [JavaScript/TypeScript Examples](#javascripttypescript-examples)
3. [React Component Examples](#react-component-examples)
4. [Common Use Cases](#common-use-cases)

## cURL Examples

### Simple Product Search

```bash
# Search for "iphone"
curl -X GET "http://localhost:3000/api/v1/search?q=iphone"

# Pretty print with jq
curl -s "http://localhost:3000/api/v1/search?q=iphone" | jq .
```

### Paginated Search

```bash
# First page (default 20 per page)
curl "http://localhost:3000/api/v1/search?q=samsung&limit=20&offset=0"

# Second page
curl "http://localhost:3000/api/v1/search?q=samsung&limit=20&offset=20"

# Large result set
curl "http://localhost:3000/api/v1/search?q=phone&limit=50&offset=100"
```

### Autocomplete/Suggestions

```bash
# Get suggestions for "iph"
curl "http://localhost:3000/api/v1/search/suggestions?q=iph&limit=5"

# Get more suggestions
curl "http://localhost:3000/api/v1/search/suggestions?q=app&limit=10"
```

### Advanced Search with Filters

```bash
# Search with price range
curl "http://localhost:3000/api/v1/search/advanced?q=phone&filters.minPrice=10000&filters.maxPrice=50000"

# Search with category
curl "http://localhost:3000/api/v1/search/advanced?q=samsung&filters.categoryId=cat-phones"

# Search with brand
curl "http://localhost:3000/api/v1/search/advanced?q=camera&filters.brand=Canon"

# Search with store filter
curl "http://localhost:3000/api/v1/search/advanced?q=laptop&filters.stores=Foxtrot,Eldorado"

# Search with minimum discount
curl "http://localhost:3000/api/v1/search/advanced?q=tv&filters.minDiscount=15"
```

### Sorting Results

```bash
# Sort by price ascending
curl "http://localhost:3000/api/v1/search/advanced?q=phone&sort.field=bestPrice&sort.direction=asc"

# Sort by discount descending
curl "http://localhost:3000/api/v1/search/advanced?q=laptop&sort.field=discountPercent&sort.direction=desc"

# Sort by update date
curl "http://localhost:3000/api/v1/search/advanced?q=electronics&sort.field=updatedAt&sort.direction=desc"
```

### Faceted Search

```bash
# Get facets for categories and brands
curl "http://localhost:3000/api/v1/search/advanced?q=electronics&facets=category,brand,storeNames"

# Filter by multiple criteria and get facets
curl "http://localhost:3000/api/v1/search/advanced?q=phone&filters.minPrice=5000&filters.maxPrice=100000&facets=category,brand"
```

### Complex Queries

```bash
# Electronics, price range, sorted, with facets
curl "http://localhost:3000/api/v1/search/advanced?q=smartphone&filters.categoryId=cat-001&filters.minPrice=20000&filters.maxPrice=100000&filters.minDiscount=10&sort.field=bestPrice&sort.direction=asc&facets=category,brand&page=1&limit=20"

# All parameters
curl "http://localhost:3000/api/v1/search/advanced?q=laptop&page=1&limit=25&filters.minPrice=30000&filters.maxPrice=150000&filters.brand=Lenovo&filters.stores=Foxtrot&filters.minDiscount=5&sort.field=discountPercent&sort.direction=desc&facets=category,brand,storeNames"
```

### Health and Statistics

```bash
# Check Meilisearch health
curl "http://localhost:3000/api/v1/search/health"

# Get index statistics
curl "http://localhost:3000/api/v1/search/stats"
```

## JavaScript/TypeScript Examples

### Basic Search with Fetch API

```javascript
// Simple search
async function searchProducts(query) {
  const response = await fetch(
    `http://localhost:3000/api/v1/search?q=${encodeURIComponent(query)}`
  );
  const data = await response.json();
  return data;
}

// Usage
const results = await searchProducts('iphone');
console.log(`Found ${results.totalHits} products`);
console.log(results.results);
```

### Advanced Search with Fetch API

```javascript
async function advancedSearch(options = {}) {
  const params = new URLSearchParams();
  
  // Main parameters
  params.append('q', options.query || '');
  params.append('page', options.page || 1);
  params.append('limit', options.limit || 20);
  
  // Filters
  if (options.filters) {
    if (options.filters.minPrice) {
      params.append('filters.minPrice', options.filters.minPrice);
    }
    if (options.filters.maxPrice) {
      params.append('filters.maxPrice', options.filters.maxPrice);
    }
    if (options.filters.categoryId) {
      params.append('filters.categoryId', options.filters.categoryId);
    }
    if (options.filters.brand) {
      params.append('filters.brand', options.filters.brand);
    }
    if (options.filters.stores) {
      params.append('filters.stores', options.filters.stores);
    }
    if (options.filters.minDiscount) {
      params.append('filters.minDiscount', options.filters.minDiscount);
    }
  }
  
  // Sorting
  if (options.sort) {
    params.append('sort.field', options.sort.field);
    params.append('sort.direction', options.sort.direction);
  }
  
  // Facets
  if (options.facets) {
    params.append('facets', options.facets.join(','));
  }
  
  const response = await fetch(
    `http://localhost:3000/api/v1/search/advanced?${params}`
  );
  
  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }
  
  return response.json();
}

// Usage
const results = await advancedSearch({
  query: 'laptop',
  page: 1,
  limit: 20,
  filters: {
    minPrice: 30000,
    maxPrice: 100000,
    brand: 'Lenovo'
  },
  sort: {
    field: 'bestPrice',
    direction: 'asc'
  },
  facets: ['category', 'brand']
});

console.log(results.results);
console.log(results.facets);
console.log(results.priceStats);
```

### Using Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  timeout: 10000
});

// Search service
const searchService = {
  basic: (query, limit = 20, offset = 0) => 
    api.get('/search', {
      params: { q: query, limit, offset }
    }),
  
  advanced: (query, filters = {}, sort = {}, page = 1, limit = 20) =>
    api.get('/search/advanced', {
      params: {
        q: query,
        page,
        limit,
        ...Object.entries(filters).reduce((acc, [key, val]) => {
          if (val !== undefined && val !== null) {
            acc[`filters.${key}`] = val;
          }
          return acc;
        }, {}),
        ...(sort.field && { 'sort.field': sort.field }),
        ...(sort.direction && { 'sort.direction': sort.direction })
      }
    }),
  
  suggestions: (query, limit = 10) =>
    api.get('/search/suggestions', {
      params: { q: query, limit }
    }),
  
  health: () => api.get('/health'),
  stats: () => api.get('/stats')
};

// Usage
const { data: products } = await searchService.basic('iphone', 20);
console.log(products.results);

const { data: advResults } = await searchService.advanced(
  'laptop',
  { minPrice: 20000, maxPrice: 100000, brand: 'Dell' },
  { field: 'bestPrice', direction: 'asc' },
  1,
  20
);
console.log(advResults.facets);
console.log(advResults.priceStats);

const { data: suggestions } = await searchService.suggestions('iph', 5);
console.log(suggestions.suggestions);
```

## React Component Examples

### Simple Search Component

```javascript
import React, { useState, useEffect } from 'react';

function SearchProducts() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:3000/api/v1/search?q=${encodeURIComponent(query)}&limit=20`
      );
      const data = await response.json();
      setResults(data.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      <div className="results">
        {results.map((product) => (
          <div key={product.id} className="product">
            <img src={product.media} alt={product.canonicalName} />
            <h3>{product.canonicalName}</h3>
            <p>{product.brand}</p>
            <p className="price">₴{product.bestPrice}</p>
            {product.discountPercent && (
              <span className="discount">-{product.discountPercent}%</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SearchProducts;
```

### Advanced Search with Filters

```javascript
import React, { useState, useCallback } from 'react';
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1'
});

function AdvancedSearch() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    minPrice: undefined,
    maxPrice: undefined,
    categoryId: undefined,
    brand: undefined
  });
  const [sort, setSort] = useState({ field: 'bestPrice', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [results, setResults] = useState([]);
  const [facets, setFacets] = useState([]);
  const [priceStats, setPriceStats] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const performSearch = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.append('q', query);
      params.append('page', page);
      params.append('limit', limit);
      params.append('facets', 'category,brand');

      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(`filters.${key}`, value);
        }
      });

      // Add sort
      params.append('sort.field', sort.field);
      params.append('sort.direction', sort.direction);

      const { data } = await api.get('/search/advanced', { params });

      setResults(data.results);
      setFacets(data.facets || []);
      setPriceStats(data.priceStats);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [query, filters, sort, page, limit]);

  return (
    <div>
      {/* Search Input */}
      <div className="search-box">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && performSearch()}
          placeholder="Search products..."
        />
        <button onClick={performSearch} disabled={loading}>
          Search
        </button>
      </div>

      <div className="search-layout">
        {/* Filters Sidebar */}
        <div className="filters">
          <h3>Filters</h3>

          <div className="filter-group">
            <label>Price Range</label>
            <input
              type="number"
              placeholder="Min price"
              value={filters.minPrice || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  minPrice: e.target.value ? parseInt(e.target.value) : undefined
                })
              }
            />
            <input
              type="number"
              placeholder="Max price"
              value={filters.maxPrice || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  maxPrice: e.target.value ? parseInt(e.target.value) : undefined
                })
              }
            />
          </div>

          {/* Price Statistics */}
          {priceStats && (
            <div className="price-stats">
              <p>Min: ₴{priceStats.min}</p>
              <p>Max: ₴{priceStats.max}</p>
              <p>Avg: ₴{priceStats.avg}</p>
            </div>
          )}

          {/* Facets */}
          {facets.map((facet) => (
            <div key={facet.name} className="facet">
              <h4>{facet.name}</h4>
              {facet.values.slice(0, 5).map((value) => (
                <label key={value.value}>
                  <input
                    type="checkbox"
                    checked={filters[facet.name] === value.value}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilters({ ...filters, [facet.name]: value.value });
                      } else {
                        setFilters({ ...filters, [facet.name]: undefined });
                      }
                    }}
                  />
                  {value.value} ({value.count})
                </label>
              ))}
            </div>
          ))}
        </div>

        {/* Results */}
        <div className="results">
          <div className="sort-bar">
            <select
              value={sort.field}
              onChange={(e) => setSort({ ...sort, field: e.target.value })}
            >
              <option value="bestPrice">Price</option>
              <option value="discountPercent">Discount</option>
              <option value="canonicalName">Name</option>
              <option value="updatedAt">Latest</option>
            </select>

            <select
              value={sort.direction}
              onChange={(e) => setSort({ ...sort, direction: e.target.value })}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>

          {loading ? (
            <div>Loading...</div>
          ) : (
            <>
              <div className="product-grid">
                {results.map((product) => (
                  <div key={product.id} className="product-card">
                    <img src={product.media} alt={product.canonicalName} />
                    <h4>{product.canonicalName}</h4>
                    <p className="brand">{product.brand}</p>
                    <p className="price">₴{product.bestPrice}</p>
                    {product.discountPercent && (
                      <span className="badge">-{product.discountPercent}%</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="pagination">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    disabled={p === page}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdvancedSearch;
```

### Autocomplete Component

```javascript
import React, { useState, useEffect } from 'react';
import debounce from 'lodash/debounce';

function Autocomplete() {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);

  const fetchSuggestions = debounce(async (query) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3000/api/v1/search/suggestions?q=${encodeURIComponent(query)}&limit=8`
      );
      const data = await response.json();
      setSuggestions(data.suggestions);
      setOpen(true);
    } catch (error) {
      console.error('Autocomplete error:', error);
    }
  }, 300);

  useEffect(() => {
    fetchSuggestions(input);
  }, [input]);

  return (
    <div className="autocomplete">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Search..."
      />

      {open && suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((suggestion, idx) => (
            <li
              key={idx}
              onClick={() => {
                setInput(suggestion);
                setOpen(false);
              }}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Autocomplete;
```

## Common Use Cases

### E-commerce Product Listing

```javascript
// Show products by category with filters
const { data } = await api.get('/search/advanced', {
  params: {
    q: '*',  // All products
    'filters.categoryId': selectedCategory,
    'sort.field': 'bestPrice',
    'sort.direction': 'asc',
    page: currentPage,
    limit: 20,
    facets: 'brand,storeNames'
  }
});
```

### Price Comparison

```javascript
// Search for product in multiple price ranges
const { data: budget } = await api.get('/search/advanced', {
  params: {
    q: productName,
    'filters.minPrice': 0,
    'filters.maxPrice': 10000
  }
});

const { data: midRange } = await api.get('/search/advanced', {
  params: {
    q: productName,
    'filters.minPrice': 10000,
    'filters.maxPrice': 50000
  }
});
```

### Deals and Discounts

```javascript
// Find products with high discounts
const { data } = await api.get('/search/advanced', {
  params: {
    q: searchTerm,
    'filters.minDiscount': 25,
    'sort.field': 'discountPercent',
    'sort.direction': 'desc'
  }
});
```

### Store Specific Search

```javascript
// Search products available in specific stores
const { data } = await api.get('/search/advanced', {
  params: {
    q: productName,
    'filters.stores': 'Foxtrot,Eldorado',
    facets: 'storeNames'
  }
});
```
