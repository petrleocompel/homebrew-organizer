-- Seed initial bottles 1-10 with status 'empty'
INSERT INTO "ho_bottles" ("id", "status", "bottle_number", "created", "updated")
VALUES
  (1, 'empty', 1, NOW(), NOW()),
  (2, 'empty', 2, NOW(), NOW()),
  (3, 'empty', 3, NOW(), NOW()),
  (4, 'empty', 4, NOW(), NOW()),
  (5, 'empty', 5, NOW(), NOW()),
  (6, 'empty', 6, NOW(), NOW()),
  (7, 'empty', 7, NOW(), NOW()),
  (8, 'empty', 8, NOW(), NOW()),
  (9, 'empty', 9, NOW(), NOW()),
  (10, 'empty', 10, NOW(), NOW());
