PRAGMA foreign_keys = ON;
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, open INTEGER NOT NULL DEFAULT 0 CHECK(open IN (0,1)));
CREATE TABLE products (id TEXT PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL REFERENCES categories(id),price INTEGER NOT NULL CHECK(price>=0),stock INTEGER NOT NULL DEFAULT 0 CHECK(stock>=0),active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),featured INTEGER NOT NULL DEFAULT 0,sort INTEGER NOT NULL DEFAULT 0);
CREATE TABLE orders (id TEXT PRIMARY KEY,request_key TEXT UNIQUE NOT NULL,request_hash TEXT NOT NULL,name TEXT NOT NULL,phone TEXT NOT NULL,phone_key TEXT NOT NULL,payment_note TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','paid','ready','collected','cancelled')),total INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX idx_orders_phone ON orders(phone_key);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE TABLE order_items (order_id TEXT NOT NULL REFERENCES orders(id),product_id TEXT NOT NULL REFERENCES products(id),name TEXT NOT NULL,quantity INTEGER NOT NULL CHECK(quantity>0),unit_price INTEGER NOT NULL CHECK(unit_price>=0),flavors TEXT NOT NULL DEFAULT '[]',PRIMARY KEY(order_id,product_id));
CREATE TRIGGER reserve_stock BEFORE INSERT ON order_items
WHEN NOT EXISTS (SELECT 1 FROM products p JOIN categories c ON c.id=p.category WHERE p.id=NEW.product_id AND p.active=1 AND c.open=1 AND p.stock>=NEW.quantity AND p.price=NEW.unit_price AND p.name=NEW.name)
BEGIN
 SELECT RAISE(ABORT,'STOCK_CHANGED');
END;
CREATE TRIGGER add_total AFTER INSERT ON order_items BEGIN
 UPDATE products SET stock=stock-NEW.quantity WHERE id=NEW.product_id;
 UPDATE orders SET total=total+NEW.quantity*NEW.unit_price WHERE id=NEW.order_id;
END;
CREATE TRIGGER restore_cancelled AFTER UPDATE OF status ON orders WHEN NEW.status='cancelled' AND OLD.status!='cancelled' BEGIN
 UPDATE products SET stock=stock+COALESCE((SELECT quantity FROM order_items WHERE order_id=NEW.id AND product_id=products.id),0) WHERE id IN (SELECT product_id FROM order_items WHERE order_id=NEW.id);
END;
CREATE TABLE customer_notes (phone_key TEXT PRIMARY KEY,note TEXT NOT NULL);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE integrations (id TEXT PRIMARY KEY,account_id TEXT NOT NULL,username TEXT NOT NULL,token TEXT NOT NULL);
CREATE TABLE giveaways (id TEXT PRIMARY KEY,title TEXT NOT NULL,media_id TEXT NOT NULL,require_like INTEGER NOT NULL DEFAULT 0,require_share INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,winner TEXT,drawn_at TEXT,draw_pool TEXT);
CREATE TABLE entries (giveaway_id TEXT NOT NULL REFERENCES giveaways(id),username TEXT NOT NULL,commented INTEGER NOT NULL DEFAULT 0,liked INTEGER NOT NULL DEFAULT 0,shared INTEGER NOT NULL DEFAULT 0,note TEXT NOT NULL DEFAULT '',PRIMARY KEY(giveaway_id,username));
