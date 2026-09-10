ALTER TABLE products ADD COLUMN unlimited INTEGER NOT NULL DEFAULT 0 CHECK(unlimited IN (0,1));
ALTER TABLE order_items ADD COLUMN stock_reserved INTEGER NOT NULL DEFAULT 1 CHECK(stock_reserved IN (0,1));
DROP TRIGGER reserve_stock;
DROP TRIGGER add_total;
DROP TRIGGER restore_cancelled;
CREATE TRIGGER reserve_stock BEFORE INSERT ON order_items
WHEN NOT EXISTS (SELECT 1 FROM products p JOIN categories c ON c.id=p.category WHERE p.id=NEW.product_id AND p.active=1 AND c.open=1 AND (p.unlimited=1 OR p.stock>=NEW.quantity) AND p.price=NEW.unit_price AND p.name=NEW.name)
BEGIN
 SELECT RAISE(ABORT,'STOCK_CHANGED');
END;
CREATE TRIGGER add_total AFTER INSERT ON order_items BEGIN
 UPDATE order_items SET stock_reserved=(SELECT 1-unlimited FROM products WHERE id=NEW.product_id) WHERE order_id=NEW.order_id AND product_id=NEW.product_id;
 UPDATE products SET stock=stock-NEW.quantity WHERE id=NEW.product_id AND unlimited=0;
 UPDATE orders SET total=total+NEW.quantity*NEW.unit_price WHERE id=NEW.order_id;
END;
CREATE TRIGGER restore_cancelled AFTER UPDATE OF status ON orders WHEN NEW.status='cancelled' AND OLD.status!='cancelled' BEGIN
 UPDATE products SET stock=stock+COALESCE((SELECT quantity FROM order_items WHERE order_id=NEW.id AND product_id=products.id AND stock_reserved=1),0) WHERE id IN (SELECT product_id FROM order_items WHERE order_id=NEW.id AND stock_reserved=1);
END;
