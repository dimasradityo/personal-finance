-- Default categories seed
-- Income categories
INSERT INTO categories (name, applicable_types, color) VALUES
  ('Salary',       ARRAY['Income'],   '#22c55e'),
  ('USDT Income',  ARRAY['Income'],   '#16a34a');

-- Expense categories
INSERT INTO categories (name, applicable_types, color) VALUES
  ('Insurance',        ARRAY['Expense'],           '#f97316'),
  ('Household Staff',  ARRAY['Expense'],           '#fb923c'),
  ('Utilities',        ARRAY['Expense'],           '#fdba74');

-- CC Spend categories
INSERT INTO categories (name, applicable_types, color) VALUES
  ('Groceries',    ARRAY['CC Spend', 'Expense'],  '#3b82f6'),
  ('Dining',       ARRAY['CC Spend', 'Expense'],  '#6366f1'),
  ('Fuel',         ARRAY['CC Spend', 'Expense'],  '#8b5cf6'),
  ('Transport',    ARRAY['CC Spend', 'Expense'],  '#a78bfa'),
  ('Laundry',      ARRAY['CC Spend', 'Expense'],  '#06b6d4'),
  ('Leisure',      ARRAY['CC Spend', 'Expense'],  '#ec4899'),
  ('Self Care',    ARRAY['CC Spend', 'Expense'],  '#f43f5e'),
  ('Others',       ARRAY['CC Spend', 'Expense'],  '#94a3b8');
