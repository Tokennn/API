const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const db = new Database(path.join(__dirname, '..', 'data.sqlite'));

// Enable better concurrency on SQLite
db.pragma('journal_mode = WAL');

const nowIso = () => new Date().toISOString();

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
  `);
}

function seedCategories() {
  const categories = [
    { name: 'Electronics', description: 'Devices and gadgets for work and fun' },
    { name: 'Books', description: 'Fiction, non-fiction, and everything to read' },
    { name: 'Home', description: 'Home improvement, kitchen, and comfort items' },
  ];

  const existing = db.prepare('SELECT COUNT(*) AS count FROM categories').get().count;
  if (existing > 0) return;

  const insert = db.prepare(
    'INSERT INTO categories (name, description) VALUES (?, ?)'
  );
  const tx = db.transaction((items) => {
    items.forEach((c) => insert.run(c.name, c.description));
  });
  tx(categories);
}

function seedProducts() {
  const existing = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;
  if (existing > 0) return;

  const categoryIds = db.prepare('SELECT id, name FROM categories').all();
  if (categoryIds.length < 3) {
    throw new Error('Seed categories before products');
  }

  const categoryMap = Object.fromEntries(categoryIds.map((c) => [c.name, c.id]));
  const today = new Date();
  const productData = [
    { name: 'Wireless Headphones', price: 129.99, stock: 45, daysAgo: 2, category: 'Electronics' },
    { name: 'Bluetooth Speaker', price: 79.99, stock: 60, daysAgo: 5, category: 'Electronics' },
    { name: '4K Monitor', price: 349.99, stock: 18, daysAgo: 10, category: 'Electronics' },
    { name: 'USB-C Hub', price: 39.99, stock: 120, daysAgo: 7, category: 'Electronics' },
    { name: 'Mechanical Keyboard', price: 119.99, stock: 35, daysAgo: 12, category: 'Electronics' },
    { name: 'Smart Light Bulb', price: 24.99, stock: 200, daysAgo: 14, category: 'Electronics' },
    { name: 'Stainless Steel Pan', price: 59.99, stock: 70, daysAgo: 3, category: 'Home' },
    { name: 'Chef Knife', price: 89.99, stock: 50, daysAgo: 1, category: 'Home' },
    { name: 'Espresso Maker', price: 199.99, stock: 20, daysAgo: 9, category: 'Home' },
    { name: 'Vacuum Cleaner', price: 149.99, stock: 25, daysAgo: 6, category: 'Home' },
    { name: 'Throw Blanket', price: 29.99, stock: 110, daysAgo: 13, category: 'Home' },
    { name: 'Standing Desk', price: 499.99, stock: 10, daysAgo: 15, category: 'Home' },
    { name: 'Science Fiction Novel', price: 16.99, stock: 150, daysAgo: 4, category: 'Books' },
    { name: 'Cookbook', price: 24.99, stock: 90, daysAgo: 8, category: 'Books' },
    { name: 'Productivity Guide', price: 21.99, stock: 130, daysAgo: 11, category: 'Books' },
    { name: 'History Book', price: 27.5, stock: 80, daysAgo: 16, category: 'Books' },
    { name: 'Mystery Thriller', price: 18.5, stock: 140, daysAgo: 17, category: 'Books' },
    { name: 'Graphic Novel', price: 22.0, stock: 95, daysAgo: 18, category: 'Books' },
    { name: 'Notebook Set', price: 14.99, stock: 160, daysAgo: 19, category: 'Books' },
    { name: 'Desk Lamp', price: 34.99, stock: 85, daysAgo: 20, category: 'Home' },
  ];

  const insert = db.prepare(`
    INSERT INTO products (name, price, stock, created_at, category_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  const tx = db.transaction((items) => {
    items.forEach((p) => {
      const createdAt = new Date(
        today.getTime() - p.daysAgo * 24 * 60 * 60 * 1000
      ).toISOString();
      insert.run(p.name, p.price, p.stock, createdAt, categoryMap[p.category]);
    });
  });
  tx(productData);
}

function seedUsers() {
  const existing = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (existing > 0) return;

  const users = [
    { email: 'eleve@example.com', password: 'password123', role: 'user' },
    { email: 'prof@example.com', password: 'password123', role: 'user' },
    { email: 'admin@example.com', password: 'admin123', role: 'admin' },
  ];

  const insert = db.prepare(`
    INSERT INTO users (email, password_hash, role, created_at)
    VALUES (?, ?, ?, ?)
  `);

  const tx = db.transaction((items) => {
    items.forEach((u) => {
      const hash = bcrypt.hashSync(u.password, 10);
      insert.run(u.email, hash, u.role, nowIso());
    });
  });

  tx(users);
}

function init() {
  migrate();
  seedCategories();
  seedProducts();
  seedUsers();
}

module.exports = {
  db,
  init,
  nowIso,
};
