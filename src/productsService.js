const { db } = require('./db');

const allowedFields = {
  id: 'p.id',
  name: 'p.name',
  price: 'p.price',
  stock: 'p.stock',
  createdAt: 'p.created_at',
  categoryId: 'p.category_id',
};

const allowedSort = {
  name: 'p.name',
  price: 'p.price',
  createdAt: 'p.created_at',
};

function parseFields(fieldsParam) {
  if (!fieldsParam) return Object.keys(allowedFields);
  const requested = fieldsParam
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);

  requested.forEach((f) => {
    if (!allowedFields[f]) {
      throw new Error(`Projection field "${f}" is not allowed`);
    }
  });

  return requested;
}

function parseSort(sortParam) {
  if (!sortParam) return { column: allowedSort.createdAt, direction: 'DESC' };

  let direction = 'ASC';
  let field = sortParam;

  if (sortParam.startsWith('-')) {
    direction = 'DESC';
    field = sortParam.slice(1);
  }

  const column = allowedSort[field];
  if (!column) {
    throw new Error(`Sort field "${field}" is not allowed`);
  }

  return { column, direction };
}

function buildFilters(query) {
  const filters = [];
  const params = [];

  if (query.category) {
    const categoryId = Number(query.category);
    if (Number.isNaN(categoryId)) {
      throw new Error('category filter must be a number');
    }
    filters.push('p.category_id = ?');
    params.push(categoryId);
  }

  if (query.minPrice) {
    const minPrice = Number(query.minPrice);
    if (Number.isNaN(minPrice)) {
      throw new Error('minPrice filter must be a number');
    }
    filters.push('p.price >= ?');
    params.push(minPrice);
  }

  if (query.maxPrice) {
    const maxPrice = Number(query.maxPrice);
    if (Number.isNaN(maxPrice)) {
      throw new Error('maxPrice filter must be a number');
    }
    filters.push('p.price <= ?');
    params.push(maxPrice);
  }

  return { where: filters.length ? `WHERE ${filters.join(' AND ')}` : '', params };
}

function listProducts(options) {
  const {
    page = 1,
    limit = 10,
    sort,
    fields: fieldsParam,
    includeCategory = false,
    filters = {},
  } = options;

  const parsedFields = parseFields(fieldsParam);
  const sortConfig = parseSort(sort);
  const { where, params } = buildFilters(filters);

  const limitNumber = Math.min(Number(limit) || 10, 100);
  const pageNumber = Math.max(Number(page) || 1, 1);
  const offset = (pageNumber - 1) * limitNumber;

  const selectPieces = [];
  const responseFields = new Set(parsedFields);

  // Always select id internally to help mapping and inclusion
  if (!parsedFields.includes('id')) {
    selectPieces.push('p.id AS _internal_id');
  }

  parsedFields.forEach((f) => {
    const column = allowedFields[f];
    selectPieces.push(`${column} AS ${f}`);
  });

  if (includeCategory) {
    selectPieces.push(
      'c.id AS category_id',
      'c.name AS category_name',
      'c.description AS category_description'
    );
  }

  const joinClause = includeCategory
    ? 'LEFT JOIN categories c ON c.id = p.category_id'
    : '';

  const dataSql = `
    SELECT ${selectPieces.join(', ')}
    FROM products p
    ${joinClause}
    ${where}
    ORDER BY ${sortConfig.column} ${sortConfig.direction}
    LIMIT ? OFFSET ?
  `;

  const rows = db
    .prepare(dataSql)
    .all(...params, limitNumber, offset)
    .map((row) => mapProduct(row, { includeCategory, responseFields }));

  const total = db
    .prepare(`SELECT COUNT(*) as count FROM products p ${where}`)
    .get(...params).count;

  return {
    data: rows,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      totalItems: total,
      totalPages: Math.ceil(total / limitNumber),
    },
  };
}

function mapProduct(row, { includeCategory, responseFields }) {
  const product = {};

  Object.entries(row).forEach(([key, value]) => {
    if (key.startsWith('_internal')) return;
    if (key.startsWith('category_')) return;
    if (!responseFields.has(key)) return;
    product[key] = value;
  });

  if (includeCategory) {
    product.category = {
      id: row.category_id,
      name: row.category_name,
      description: row.category_description,
    };
  }

  return product;
}

module.exports = {
  listProducts,
};
