import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ═══════════════════════════════════════════════════════
   PEDAGOGICAL FRAMEWORK
   ─────────────────────────────────────────────────────
   Each module follows the Gradual Release of Responsibility model
   (Fisher & Frey, 2008) + Spaced Retrieval Practice (Roediger, 2006)
   + Cognitive Load Theory (Sweller, 1988):

   1. HOOK        – Real scenario: WHY does this skill matter today?
   2. CONCEPT     – Analogy + concept cards (concrete before abstract)
   3. SEE IT      – Annotated worked examples (run live)
   4. GUIDED      – Fill-in-the-blank (scaffold fades per exercise)
   5. REAL WORLD  – Business use-cases (transfer, authentic context)
   6. RECALL      – Multiple-choice retrieval practice
   7. CHALLENGE   – Free-form (full autonomy, minimal scaffold)
   8. COMPLETE    – Summary + spaced-repetition teaser + next lesson
═══════════════════════════════════════════════════════ */

/* ─── TOKENS ─────────────────────────────────────────── */
const T = {
  bg:"#0c0a07", surf:"#131008", s2:"#1b1610", s3:"#232019", s4:"#2c2818",
  brd:"#342e1a", brdF:"#1e1a0e",
  tx:"#ede0c0", t2:"#b89555", t3:"#6b5530", t4:"#3c2e14",
  A:"#e8a020",  // amber – primary
  AL:"#f5be50", // amber light
  AD:"#7a4c00", // amber dark
  S:"#6db870",  // sage – success
  SD:"#163010",
  R:"#c05840",  // terra – error / hard
  RD:"#481408",
  M:"#9870c0",  // mauve – extra
  MD:"#281040",
  B:"#5a9fc0",  // steel – info
  BD:"#102838",
  ok:{bg:"#0b1e0e",brd:"#1a4020",tx:"#6dcc88"},
  err:{bg:"#1e0808",brd:"#4c1818",tx:"#e07070"},
  warn:{bg:"#1e1408",brd:"#4c2e08",tx:"#e0a050"},
};
const LC = ["#6db870","#e8a020","#c05840","#9870c0"];
const DIFF = {Easy:T.S, Medium:T.A, Hard:T.R, Expert:T.M};
const TC = {employees:T.B,departments:T.S,products:T.M,customers:T.A,orders:T.R};
const SCHEMA_MAP = {
  employees:  ["id","name","dept_id","salary","hire_date","manager_id"],
  departments:["id","name","city","budget"],
  products:   ["id","name","category","price","stock"],
  customers:  ["id","name","email","city"],
  orders:     ["id","customer_id","product_id","qty","order_date"],
};

/* ─── COMPANY PERSONAS ───────────────────────────────── */
const CO = {
  nexus:   {name:"Nexus Commerce",   icon:"🛒", color:T.A,  role:"Data Analyst, Growth",          note:"E-commerce marketplace, 450 employees"},
  meridian:{name:"Meridian Health",  icon:"🏥", color:T.S,  role:"People Analytics Analyst, HR",  note:"Regional hospital network, 2,800 employees"},
  atlas:   {name:"Atlas Capital",    icon:"📊", color:T.M,  role:"BI Analyst, Finance",            note:"Investment advisory, 320 employees"},
  forge:   {name:"Forge Logistics",  icon:"📦", color:T.R,  role:"Operations Analyst, Supply Chain",note:"3PL provider, 1,200 employees"},
};

/* ─── DB ─────────────────────────────────────────────── */
const SCHEMA_SQL=`CREATE TABLE departments(id INT PRIMARY KEY,name TEXT,city TEXT,budget REAL);CREATE TABLE employees(id INT PRIMARY KEY,name TEXT,dept_id INT,salary REAL,hire_date TEXT,manager_id INT);CREATE TABLE products(id INT PRIMARY KEY,name TEXT,category TEXT,price REAL,stock INT);CREATE TABLE customers(id INT PRIMARY KEY,name TEXT,email TEXT,city TEXT);CREATE TABLE orders(id INT PRIMARY KEY,customer_id INT,product_id INT,qty INT,order_date TEXT);`;
const SEED_SQL=`INSERT INTO departments VALUES(1,'Engineering','San Francisco',900000),(2,'Marketing','New York',400000),(3,'HR','Chicago',260000),(4,'Finance','New York',480000),(5,'Design','San Francisco',310000);INSERT INTO employees VALUES(1,'Alice Chen',1,95000,'2019-03-15',NULL),(2,'Bob Martinez',1,82000,'2020-07-01',1),(3,'Carol Williams',2,71000,'2018-11-20',NULL),(4,'David Kim',1,110000,'2017-01-10',1),(5,'Eva Rossi',3,58000,'2021-04-05',NULL),(6,'Frank Lee',4,89000,'2019-09-12',NULL),(7,'Grace Okafor',5,76000,'2020-02-28',NULL),(8,'Henry Patel',2,65000,'2022-01-15',3),(9,'Iris Johnson',1,91000,'2018-06-30',1),(10,'James Brown',4,78000,'2021-08-22',6),(11,'Karen Smith',3,54000,'2023-03-01',5),(12,'Leo Zhang',5,83000,'2019-12-10',7);INSERT INTO products VALUES(1,'Laptop Pro','Electronics',1299.99,45),(2,'Wireless Mouse','Electronics',39.99,200),(3,'Standing Desk','Furniture',549.00,30),(4,'Ergonomic Chair','Furniture',799.00,25),(5,'Monitor 27in','Electronics',429.99,60),(6,'Mech Keyboard','Electronics',149.99,80),(7,'Notebook Set','Stationery',24.99,500),(8,'HD Webcam','Electronics',89.99,120);INSERT INTO customers VALUES(1,'Acme Corp','acme@x.com','Boston'),(2,'Globex','globex@x.com','Chicago'),(3,'Initech','init@x.com','Dallas'),(4,'Umbrella','umb@x.com','San Francisco'),(5,'Duff Corp','duff@x.com','Springfield');INSERT INTO orders VALUES(1,1,1,3,'2024-01-15'),(2,2,3,1,'2024-01-18'),(3,1,5,2,'2024-02-03'),(4,3,2,5,'2024-02-10'),(5,4,4,2,'2024-02-14'),(6,2,6,3,'2024-03-01'),(7,5,7,10,'2024-03-05'),(8,1,8,4,'2024-03-12'),(9,3,1,1,'2024-03-20'),(10,4,2,8,'2024-04-01'),(11,5,5,1,'2024-04-08'),(12,2,7,20,'2024-04-15');`;

/* ─── CURRICULUM ─────────────────────────────────────── */
const COURSE = [
 {level:"Beginner", icon:"✦", color:"#6db870", modules:[
  {id:"b1", title:"SELECT & FROM", tagline:"Your first SQL query — retrieve any data in seconds",
   hook:{
     co:"nexus", day:"Monday, 9:04 am",
     msg:"Hey! Quick favour — can you pull a list of all employees with their names and salaries? Board meeting at 10.",
     from:"Sarah Chen · Head of Growth",
     insight:"This is the most common SQL task. You'll write this pattern dozens of times every week. It takes 10 seconds.",
   },
   concepts:[
     {icon:"🗄️", title:"What is a database?",
      body:"A database is an organised collection of data stored in tables. A table is like a spreadsheet: rows are records, columns are fields. SQL is the language you use to talk to it.",
      analogy:"Think of a database as a library. Each table is a bookshelf. SELECT is your request slip — it says which books (columns) you want from which shelf (table).",
      misconception:null},
     {icon:"📡", title:"SELECT — which columns?",
      body:"SELECT lists the columns you want in your result. Separate multiple columns with commas. Use * to get every column (useful for exploring, avoid in production).",
      analogy:null, tip:"SELECT * is great for exploring. In production, always name your columns — it documents your intent and is faster on wide tables."},
     {icon:"📋", title:"FROM — which table?",
      body:"FROM tells SQL where to look. Every query needs both SELECT and FROM. SQL reads FROM first internally, then filters by your SELECT list.",
      analogy:null, tip:null},
     {icon:"🏷️", title:"AS — rename columns in output",
      body:"salary AS annual_pay renames the column label in your results only — the database schema never changes. Useful for making reports readable.",
      analogy:null, tip:'Aliases with spaces need quotes: salary AS "monthly pay"'},
     {icon:"🔢", title:"Computed columns",
      body:"You can do arithmetic directly inside SELECT: salary / 12 gives monthly pay per row. The computed result doesn't exist in the database — it's calculated fresh each time.",
      analogy:null, tip:null},
   ],
   seeit:[
     {lbl:"Retrieve all employees",  ann:"* means every column — great for exploration",
      sql:"SELECT *\nFROM employees;"},
     {lbl:"Only name and salary",     ann:"Comma-separate the columns you need",
      sql:"SELECT name, salary\nFROM employees;"},
     {lbl:"Rename output columns",   ann:"AS renames only in the output — database unchanged",
      sql:"SELECT name        AS employee_name,\n       salary      AS annual_salary\nFROM employees;"},
     {lbl:"Compute monthly pay",     ann:"Math inline: SQL computes this per row automatically",
      sql:"SELECT name,\n       salary,\n       ROUND(salary / 12, 2) AS monthly_pay\nFROM employees;"},
   ],
   guided:[
     {id:"g1", diff:"Easy", scaffold:0.85,
      title:"Complete the query",
      context:"Sarah needs names and salaries. The query structure is here — choose the correct SQL keyword for each gap.",
      template:"%%D:SELECT|FROM|WHERE%% name, salary\n%%D:FROM|SELECT|WHERE%% employees;",
      checks:[{t:"rows",n:12},{t:"col",c:"salary"}],
      hints:["SELECT always names the columns you want to see","FROM always names the table to read from"],
      solution:"SELECT name, salary\nFROM employees;",
      whyItWorks:"SELECT + FROM is the skeleton of every SQL query. SELECT = what to show. FROM = where to look."},
     {id:"g2", diff:"Easy", scaffold:0.7,
      title:"Add a readable label",
      context:"The CFO wants the salary column labeled `annual_pay` to match her spreadsheet template.",
      template:"SELECT name,\n       salary AS %%B:the alias%%\nFROM %%B:table name%%;",
      checks:[{t:"rows",n:12},{t:"col",c:"annual_pay"}],
      hints:["The alias is: annual_pay","The table name is: employees"],
      solution:"SELECT name, salary AS annual_pay\nFROM employees;",
      whyItWorks:"AS annual_pay renames only in the output. The actual database column is still called 'salary'. Zero schema change."},
     {id:"g3", diff:"Medium", scaffold:0.5,
      title:"Compute monthly pay",
      context:"Payroll needs monthly pay (salary ÷ 12, rounded to 2 decimal places) alongside each employee's name.",
      template:"SELECT name,\n       %%B:function%%(salary %%B:operator%% 12, 2) AS monthly_pay\nFROM employees;",
      checks:[{t:"rows",n:12},{t:"col",c:"monthly_pay"}],
      hints:["The rounding function is: ROUND","Division operator: /","Combined: ROUND(salary / 12, 2)"],
      solution:"SELECT name, ROUND(salary / 12, 2) AS monthly_pay\nFROM employees;",
      whyItWorks:"ROUND(salary / 12, 2) computes for each row independently. monthly_pay doesn't exist in the DB — it's derived fresh every time the query runs."},
   ],
   usecases:[
     {co:"atlas", icon:"💰", title:"Board Deck Budget Report",
      situation:"The CFO needs department names and budgets — with readable column labels matching her slide template.",
      sql:"SELECT name   AS department,\n       city,\n       budget AS annual_budget\nFROM departments\nORDER BY budget DESC;",
      result:"The AS aliases mean the output columns match the slide template exactly. No manual renaming in Excel.",
      transferPoint:"AS is one of the most practical SQL habits. It documents what the data means, not just what it's called."},
     {co:"forge", icon:"🏷️", title:"Price List for Marketing",
      situation:"Marketing needs a clean product catalogue — names and prices only, most expensive first.",
      sql:"SELECT name, price\nFROM products\nORDER BY price DESC;",
      result:"6 lines of SQL. Saved 20 minutes of manual spreadsheet work.",
      transferPoint:"Selecting only the columns you need is not just style — on wide tables with millions of rows, it's dramatically faster."},
   ],
   recall:[
     {q:"SELECT salary / 12 AS monthly FROM employees does what?",
      opts:["Creates a new 'monthly' column in the database","Returns each row's salary divided by 12, labeled 'monthly' in the output","Renames the salary column to 'monthly' permanently","Errors — division must use a separate query"],
      ans:1, exp:"AS creates a temporary alias. The result is computed per row on the fly. The database never changes. The column name 'monthly' exists only in this query's output."},
     {q:"You write SELECT * FROM employees. How many columns are returned?",
      opts:["1 (just id)","Depends on the WHERE clause","Every column in the employees table","Only the columns listed in GROUP BY"],
      ans:2, exp:"* is a wildcard that means 'all columns'. Every column in the employees table is returned. In employees that's: id, name, dept_id, salary, hire_date, manager_id."},
     {q:"Which part of a query does SQL execute first internally?",
      opts:["SELECT — to know what to return","FROM — to locate the data source","WHERE — to filter rows","AS — to rename columns"],
      ans:1, exp:"SQL reads FROM first (locates the table), then applies any WHERE filter, then SELECT picks the columns from the result. This is why you can't use a SELECT alias inside a WHERE clause."},
   ],
   challenge:[
     {id:"c1", diff:"Hard",
      title:"Full Tax Breakdown Report",
      context:"Atlas Capital's finance team needs a tax report. Show each employee's name, salary, estimated tax (salary × 0.28, rounded to 0 decimal places), and take-home pay (salary × 0.72, rounded to 0 dp). Sort by salary descending so the highest earners appear first.",
      tables:["employees"],
      starter:"-- employees: id, name, dept_id, salary, hire_date, manager_id\nSELECT name,\n       salary,\n       ",
      checks:[{t:"rows",n:12},{t:"col",c:"tax"},{t:"col",c:"take_home"}],
      hints:["ROUND(salary * 0.28, 0) AS tax","ROUND(salary * 0.72, 0) AS take_home","Close with: FROM employees ORDER BY salary DESC"],
      solution:"SELECT name, salary,\n  ROUND(salary * 0.28, 0) AS tax,\n  ROUND(salary * 0.72, 0) AS take_home\nFROM employees\nORDER BY salary DESC;",
      celebration:"David Kim leads at $110k — $30,800 tax, $79,200 take-home. Multiple computed columns evaluate independently per row."},
   ],
  },

  {id:"b2", title:"WHERE — Filtering Rows", tagline:"Stop reading every row. Get exactly what you need.",
   hook:{
     co:"forge", day:"Wednesday, 2:18 pm",
     msg:"Two quick things: (1) find all employees earning over $80k for a comp review, and (2) who's missing a manager in our system? Some people slipped through the migration.",
     from:"Marcus Webb · Operations Director",
     insight:"Unfiltered queries read every row — slow and exposing. WHERE is how you target exactly the data that matters.",
   },
   concepts:[
     {icon:"🚦", title:"WHERE is a row-by-row gate",
      body:"SQL tests the WHERE condition against every row. TRUE → the row passes through. FALSE → it's blocked. Only passing rows appear in your results.",
      analogy:"Imagine a bouncer at a club checking IDs. Each person (row) approaches the door. The rule (WHERE condition) is checked. Only those who pass make it inside (your results).",
      misconception:"Common mistake: WHERE runs on the raw rows, before any GROUP BY or aggregate. You cannot filter on AVG(salary) in a WHERE clause — use HAVING instead."},
     {icon:"⚖️", title:"Comparison operators",
      body:"= equal · <> not equal · > greater · < less · >= · <= · BETWEEN a AND b (inclusive both ends) · LIKE '%pattern%' · IN (list) · IS NULL · IS NOT NULL",
      analogy:null, tip:"BETWEEN is always inclusive. salary BETWEEN 60000 AND 90000 includes both 60000 and 90000."},
     {icon:"🔗", title:"AND / OR / NOT — combining conditions",
      body:"AND: both sides must be true. OR: at least one side must be true. NOT: flips the result. Use parentheses to control grouping when mixing AND and OR.",
      analogy:null,
      misconception:"⚠️ AND binds before OR. dept=1 OR dept=2 AND salary>70k means: dept=1 OR (dept=2 AND salary>70k). If you want both departments to require the salary check, write: (dept=1 OR dept=2) AND salary>70k."},
     {icon:"∅", title:"NULL — the unknown value",
      body:"NULL means a value is missing or unknown. You cannot test for NULL with = or !=. NULL = NULL is not TRUE — it's UNKNOWN. The only valid checks are IS NULL and IS NOT NULL.",
      analogy:"NULL is like an empty envelope. You can't open it to check if its contents match something — because there are no contents. IS NULL is asking 'is this envelope empty?'",
      misconception:"⚠️ WHERE manager_id = NULL always returns 0 rows — SQL won't warn you. It silently finds nothing. This is one of the most common bugs."},
   ],
   seeit:[
     {lbl:"Filter by department",  ann:"= tests for an exact match",
      sql:"SELECT name, salary\nFROM employees\nWHERE dept_id = 1;"},
     {lbl:"BETWEEN — salary range", ann:"Inclusive on both ends: 70k and 95k are included",
      sql:"SELECT name, salary\nFROM employees\nWHERE salary BETWEEN 70000 AND 95000;"},
     {lbl:"IN — list of cities",   ann:"IN is cleaner than writing OR for every value",
      sql:"SELECT name, city\nFROM departments\nWHERE city IN ('New York', 'Chicago');"},
     {lbl:"IS NULL — find missing managers", ann:"= NULL would return 0 rows silently — IS NULL is the only correct way",
      sql:"SELECT name, dept_id\nFROM employees\nWHERE manager_id IS NULL;"},
     {lbl:"AND + parentheses",     ann:"Parentheses force the OR to evaluate first, then AND applies to both depts",
      sql:"SELECT name, dept_id, salary\nFROM employees\nWHERE (dept_id = 1 OR dept_id = 4)\n  AND salary > 75000\nORDER BY salary DESC;"},
   ],
   guided:[
     {id:"g1", diff:"Easy", scaffold:0.8,
      title:"Find high earners",
      context:"Marcus needs all employees earning above $80,000. Show name and salary.",
      template:"SELECT name, salary\nFROM employees\nWHERE salary %%D:>|<|=|<>%% 80000;",
      checks:[{t:"rows",n:5}],
      hints:["Use > for 'greater than'","80000 is a number — no quotes, no commas"],
      solution:"SELECT name, salary\nFROM employees\nWHERE salary > 80000;",
      whyItWorks:"5 of 12 employees qualify. WHERE tests each row independently — in a 10M-row table this is still efficient with an index."},
     {id:"g2", diff:"Easy", scaffold:0.7,
      title:"Departments in two cities",
      context:"Forge has offices in New York and Chicago. Show departments in those cities.",
      template:"SELECT name, city\nFROM departments\nWHERE city %%D:IN|BETWEEN|LIKE|=%% ('New York', 'Chicago');",
      checks:[{t:"rows",n:3}],
      hints:["IN matches against a list of values in parentheses","= only works for one exact value at a time"],
      solution:"SELECT name, city\nFROM departments\nWHERE city IN ('New York', 'Chicago');",
      whyItWorks:"IN ('A','B') is cleaner and faster to read than city='New York' OR city='Chicago'. With 20 cities it's indispensable."},
     {id:"g3", diff:"Medium", scaffold:0.5,
      title:"Find employees missing a manager",
      context:"Marcus's data quality issue: find everyone with no manager assigned (manager_id is missing).",
      template:"SELECT name, dept_id\nFROM employees\nWHERE manager_id %%B:the two-word NULL check%%;",
      checks:[{t:"rows",n:5}],
      hints:["The two-word phrase is: IS NULL","= NULL would silently return 0 rows — that's the bug Marcus saw!"],
      solution:"SELECT name, dept_id\nFROM employees\nWHERE manager_id IS NULL;",
      whyItWorks:"IS NULL is the ONLY valid way to check for missing values. = NULL evaluates to UNKNOWN (not TRUE), so it returns nothing."},
     {id:"g4", diff:"Medium", scaffold:0.4,
      title:"Salary range filter",
      context:"Atlas Capital's comp committee reviews 'mid-band' employees — those earning between $65k and $90k. Show name, salary, and dept_id.",
      template:"SELECT name, salary, dept_id\nFROM employees\nWHERE salary %%B:BETWEEN keyword%% %%B:lower bound%% %%B:AND keyword%% %%B:upper bound%%\nORDER BY salary DESC;",
      checks:[{t:"col",c:"dept_id"}],
      hints:["Keyword: BETWEEN","Lower: 65000","AND (literal keyword)","Upper: 90000"],
      solution:"SELECT name, salary, dept_id\nFROM employees\nWHERE salary BETWEEN 65000 AND 90000\nORDER BY salary DESC;",
      whyItWorks:"BETWEEN is inclusive — salary = 65000 qualifies. Missing edge cases caused a real comp review error at a previous company."},
   ],
   usecases:[
     {co:"nexus", icon:"🎯", title:"VIP Customer Campaign",
      situation:"Marketing is planning a pop-up store in San Francisco and needs emails for SF-based customers only.",
      sql:"SELECT name, email\nFROM customers\nWHERE city = 'San Francisco';",
      result:"1 matching customer. Email is sent to Umbrella only — no wasted outreach to Boston or Chicago.",
      transferPoint:"Filtering before export is how you keep CRM lists clean. Running queries without WHERE exposes unnecessary data."},
     {co:"meridian", icon:"🔍", title:"Post-Migration Data Quality Check",
      situation:"After migrating from an old HRIS, Meridian needs to identify employees with missing manager assignments — a common migration integrity issue.",
      sql:"SELECT name, dept_id, hire_date\nFROM employees\nWHERE manager_id IS NULL\nORDER BY hire_date;",
      result:"5 employees have no manager. HR files a data correction ticket. Sorted by hire_date to prioritise longest-standing gaps.",
      transferPoint:"IS NULL is your most important data quality tool. Run it after every migration or import."},
     {co:"forge", icon:"⚠️", title:"Low Stock Alert",
      situation:"Trigger a reorder for Electronics products with fewer than 80 units. Surface the most critical first.",
      sql:"SELECT name, stock, price\nFROM products\nWHERE category = 'Electronics'\n  AND stock < 80\nORDER BY stock ASC;",
      result:"3 products qualify. ORDER BY ASC puts the most depleted first for immediate action.",
      transferPoint:"AND narrows the result — both conditions must be true. This query runs hourly in Forge's inventory alerting system."},
   ],
   recall:[
     {q:"WHERE manager_id = NULL — how many rows does this return?",
      opts:["All employees with no manager","0 rows — = NULL is always UNKNOWN, never TRUE","Depends on the database","An error is thrown"],
      ans:1, exp:"= NULL evaluates to UNKNOWN in SQL — not TRUE, not FALSE. No rows pass an UNKNOWN condition. IS NULL is the only correct way to check for missing values."},
     {q:"salary BETWEEN 60000 AND 90000 — is salary = 60000 included?",
      opts:["No — BETWEEN uses strict > and <","Yes — BETWEEN is inclusive on both ends","Only if INCLUSIVE is specified","Depends on the database"],
      ans:1, exp:"BETWEEN a AND b is always inclusive. An employee earning exactly $60,000 qualifies. It's equivalent to: salary >= 60000 AND salary <= 90000."},
     {q:"dept_id=1 OR dept_id=2 AND salary>70000 — who qualifies?",
      opts:["Only employees in dept 1 or 2 with salary > 70000","All dept 1 employees PLUS dept 2 employees with salary > 70000","Everyone — OR makes conditions optional","A syntax error"],
      ans:1, exp:"AND binds before OR. This reads as: dept_id=1 OR (dept_id=2 AND salary>70000). All of dept 1 qualifies regardless of salary. Fix: (dept_id=1 OR dept_id=2) AND salary>70000."},
   ],
   challenge:[
     {id:"c1", diff:"Hard",
      title:"Retention Risk Report",
      context:"Meridian's people analytics dashboard flags employees who are most at risk of leaving: hired after 2019-01-01, in Engineering (dept 1) or Marketing (dept 2), earning less than $85,000. Show name, dept_id, salary, hire_date — sorted by salary ascending so the most vulnerable appear first.",
      tables:["employees"],
      starter:"-- employees: id, name, dept_id, salary, hire_date, manager_id\nSELECT name, dept_id, salary, hire_date\nFROM employees\nWHERE ",
      checks:[{t:"col",c:"hire_date"}],
      hints:["hire_date > '2019-01-01'","AND (dept_id = 1 OR dept_id = 2)","AND salary < 85000","ORDER BY salary ASC"],
      solution:"SELECT name, dept_id, salary, hire_date\nFROM employees\nWHERE hire_date > '2019-01-01'\n  AND (dept_id = 1 OR dept_id = 2)\n  AND salary < 85000\nORDER BY salary ASC;",
      celebration:"Three conditions combined with AND and parenthesised OR. This exact pattern runs in Meridian's HR dashboard every Monday morning."},
   ],
  },

  {id:"b3", title:"Aggregates & GROUP BY", tagline:"Turn thousands of rows into executive-ready summaries.",
   hook:{
     co:"atlas", day:"Monday, 8:52 am",
     msg:"Board deck goes out at noon. I need: headcount per department, average salary per dept, and flag any dept where the average is above $75k. Can you have those ready by 9:30?",
     from:"Priya Sharma · Head of Finance",
     insight:"GROUP BY is the engine behind every dashboard, every report, every 'summary by category' you'll ever build. This skill pays for itself on day one.",
   },
   concepts:[
     {icon:"∑", title:"Aggregate functions collapse rows",
      body:"COUNT(*) counts rows. SUM totals a column. AVG computes the mean. MIN / MAX find extremes. All of these collapse many rows into one summary value.",
      analogy:"Imagine tipping all employee salary records onto a desk. SUM() adds them all up into one number. GROUP BY sorts them into piles by department first, then SUM() totals each pile — giving one total per department instead of one grand total.",
      misconception:"⚠️ All aggregates except COUNT(*) skip NULL values silently. COUNT(manager_id) with 5 NULLs returns 7, not 12."},
     {icon:"📦", title:"GROUP BY — one row per group",
      body:"GROUP BY splits rows into buckets that share the same value. Each aggregate function then runs independently on each bucket. Result: one output row per unique bucket.",
      analogy:null,
      misconception:"⚠️ Every column in SELECT must either appear in GROUP BY or be inside an aggregate. SELECT name, AVG(salary) FROM employees GROUP BY dept_id is an ERROR — which 'name'? There are multiple per dept."},
     {icon:"🔬", title:"HAVING — filter groups (not rows)",
      body:"WHERE filters individual rows BEFORE grouping. HAVING filters groups AFTER aggregation. Both can exist in the same query. Use HAVING when your condition references an aggregate.",
      analogy:"WHERE is the bouncer who stops people before they form groups. HAVING is the judge who reviews each completed group and decides which groups make it into the final report.",
      misconception:"⚠️ AVG(salary) in a WHERE clause throws an error — aggregation hasn't happened yet at WHERE time. Always use HAVING for aggregate conditions."},
   ],
   seeit:[
     {lbl:"Company-wide stats",   ann:"No GROUP BY = one row summarising all 12 employees",
      sql:"SELECT COUNT(*)             AS total_employees,\n       MIN(salary)          AS lowest_salary,\n       MAX(salary)          AS highest_salary,\n       ROUND(AVG(salary),0) AS avg_salary,\n       SUM(salary)          AS total_payroll\nFROM employees;"},
     {lbl:"Count per department",  ann:"One output row per dept_id — 5 depts = 5 rows",
      sql:"SELECT dept_id,\n       COUNT(*) AS headcount\nFROM employees\nGROUP BY dept_id\nORDER BY headcount DESC;"},
     {lbl:"Multiple aggregates",   ann:"Each aggregate runs independently per group",
      sql:"SELECT dept_id,\n       COUNT(*) AS headcount,\n       ROUND(AVG(salary),0) AS avg_salary,\n       SUM(salary) AS total_payroll\nFROM employees\nGROUP BY dept_id;"},
     {lbl:"HAVING — filter groups",ann:"HAVING filters AFTER aggregation — WHERE would error here",
      sql:"SELECT dept_id,\n       ROUND(AVG(salary),0) AS avg_salary\nFROM employees\nGROUP BY dept_id\nHAVING AVG(salary) > 75000\nORDER BY avg_salary DESC;"},
     {lbl:"WHERE + GROUP BY + HAVING",ann:"Three-stage pipeline: filter rows → group → filter groups",
      sql:"SELECT dept_id, ROUND(AVG(salary),0) AS avg_sal\nFROM employees\nWHERE hire_date >= '2019-01-01'  -- filter rows first\nGROUP BY dept_id\nHAVING AVG(salary) > 70000;     -- filter groups"},
   ],
   guided:[
     {id:"g1", diff:"Easy", scaffold:0.8,
      title:"Headcount per department",
      context:"Priya needs headcount per department for the board deck. Show dept_id and headcount, sorted largest first.",
      template:"SELECT dept_id,\n       %%B:aggregate%%(*) AS headcount\nFROM employees\n%%B:grouping clause%% dept_id\nORDER BY headcount DESC;",
      checks:[{t:"rows",n:5},{t:"col",c:"headcount"}],
      hints:["Aggregate that counts rows: COUNT","Clause that groups: GROUP BY"],
      solution:"SELECT dept_id, COUNT(*) AS headcount\nFROM employees\nGROUP BY dept_id\nORDER BY headcount DESC;",
      whyItWorks:"GROUP BY collapsed 12 rows into 5 groups. Engineering leads with 4 people. The ORDER BY runs on the 5 result rows."},
     {id:"g2", diff:"Medium", scaffold:0.55,
      title:"Average salary — only high earners",
      context:"Priya wants departments where the average salary exceeds $75,000. Which clause filters groups after aggregation?",
      template:"SELECT dept_id,\n       ROUND(AVG(salary),0) AS avg_salary\nFROM employees\nGROUP BY dept_id\n%%D:HAVING|WHERE|AND|GROUP BY%% AVG(salary) > 75000\nORDER BY avg_salary DESC;",
      checks:[{t:"col",c:"avg_salary"}],
      hints:["HAVING filters GROUPS after aggregation","WHERE filters ROWS before GROUP BY — it can't see AVG(salary)"],
      solution:"SELECT dept_id, ROUND(AVG(salary),0) AS avg_salary\nFROM employees\nGROUP BY dept_id\nHAVING AVG(salary) > 75000\nORDER BY avg_salary DESC;",
      whyItWorks:"HAVING is the only clause that can reference aggregate results. WHERE runs before aggregation — AVG(salary) doesn't exist yet at WHERE time."},
     {id:"g3", diff:"Medium", scaffold:0.45,
      title:"Product category summary",
      context:"Nexus Commerce's ops review needs inventory data per category: count of products, and total inventory value (price × stock summed).",
      template:"SELECT category,\n       COUNT(*) AS product_count,\n       %%B:aggregate%%(price * %%B:column%%) AS stock_value\nFROM products\nGROUP BY %%B:group by column%%;",
      checks:[{t:"rows",n:3},{t:"col",c:"stock_value"}],
      hints:["Aggregate that totals: SUM","Multiply price × stock per row before summing: stock","Group on: category"],
      solution:"SELECT category,\n       COUNT(*) AS product_count,\n       SUM(price * stock) AS stock_value\nFROM products\nGROUP BY category;",
      whyItWorks:"SUM(price * stock) multiplies per row first, then sums within each category. You can use expressions inside aggregate functions."},
   ],
   usecases:[
     {co:"atlas", icon:"📋", title:"Board Deck in 4 Lines",
      situation:"CFO's quarterly board presentation needs headcount and average salary per department — formatted and sorted.",
      sql:"SELECT dept_id,\n       COUNT(*) AS headcount,\n       ROUND(AVG(salary), 0) AS avg_salary,\n       SUM(salary) AS total_payroll\nFROM employees\nGROUP BY dept_id\nORDER BY headcount DESC;",
      result:"5 rows, 4 metrics. This replaces 30 minutes of manual COUNTIF and AVERAGEIF in Excel.",
      transferPoint:"GROUP BY is the workhorse of executive reporting. Every dashboard you'll ever build uses this pattern."},
     {co:"nexus", icon:"💰", title:"Category Revenue Prioritisation",
      situation:"Ops team needs to decide which product category gets the next warehouse allocation. Total inventory value per category tells the story.",
      sql:"SELECT category,\n       COUNT(*) AS products,\n       SUM(price * stock) AS inventory_value\nFROM products\nGROUP BY category\nORDER BY inventory_value DESC;",
      result:"Electronics dominates at ~$200k+ inventory value. That's where the warehouse space goes.",
      transferPoint:"SUM(price * stock) uses math inside the aggregate — common pattern in revenue and inventory reporting."},
   ],
   recall:[
     {q:"12 rows, 5 have manager_id = NULL. What does COUNT(manager_id) return?",
      opts:["12","5","7","Depends on GROUP BY"],
      ans:2, exp:"COUNT(column) skips NULLs. 12 total rows − 5 NULL manager_ids = 7. COUNT(*) counts all rows including NULLs and would return 12."},
     {q:"Which clause filters AFTER aggregation?",
      opts:["WHERE","HAVING","GROUP BY","ORDER BY"],
      ans:1, exp:"HAVING runs after GROUP BY. WHERE runs before — it filters individual rows before any grouping. You can use both in the same query."},
     {q:"SELECT name, AVG(salary) FROM employees GROUP BY dept_id — what's wrong?",
      opts:["Nothing — this is valid SQL","'name' is not in GROUP BY and not in an aggregate — SQL rejects it","AVG() can't be used without a WHERE clause","ORDER BY is required with GROUP BY"],
      ans:1, exp:"Every column in SELECT must be either in GROUP BY or wrapped in an aggregate. 'name' is neither. SQL can't decide which name to show when multiple names exist per dept_id."},
     {q:"Correct clause order for a full query?",
      opts:["SELECT → WHERE → FROM → GROUP BY → HAVING → ORDER BY","SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY","FROM → GROUP BY → SELECT → HAVING → WHERE → ORDER BY","SELECT → FROM → GROUP BY → WHERE → HAVING → ORDER BY"],
      ans:1, exp:"The logical order: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY. WHERE always runs before GROUP BY; HAVING always runs after. Writing them in this order produces valid SQL."},
   ],
   challenge:[
     {id:"c1", diff:"Hard",
      title:"Priya's Full Board Report",
      context:"Write the complete query Priya needs: for each department show dept_id, headcount, avg_salary (rounded to 0dp), total_payroll, and a flag labelled 'above_threshold' (1 if avg > 75000, 0 otherwise). Filter to departments with at least 2 employees. Sort by avg_salary descending.",
      tables:["employees"],
      starter:"-- employees: id, name, dept_id, salary, hire_date, manager_id\nSELECT dept_id,\n       COUNT(*) AS headcount,\n       ROUND(AVG(salary), 0) AS avg_salary,\n       SUM(salary) AS total_payroll,\n       ",
      checks:[{t:"rows",n:4},{t:"col",c:"above_threshold"}],
      hints:["CASE WHEN AVG(salary) > 75000 THEN 1 ELSE 0 END AS above_threshold","FROM employees GROUP BY dept_id","HAVING COUNT(*) >= 2","ORDER BY avg_salary DESC"],
      solution:"SELECT dept_id, COUNT(*) AS headcount,\n  ROUND(AVG(salary), 0) AS avg_salary,\n  SUM(salary) AS total_payroll,\n  CASE WHEN AVG(salary) > 75000 THEN 1 ELSE 0 END AS above_threshold\nFROM employees\nGROUP BY dept_id\nHAVING COUNT(*) >= 2\nORDER BY avg_salary DESC;",
      celebration:"This is a real board-deck query. CASE WHEN inside SELECT creates a computed flag column — combine it with GROUP BY for powerful conditional aggregation."},
   ],
  },
 ]},

 {level:"Intermediate", icon:"◈", color:"#e8a020", modules:[
  {id:"i1", title:"JOINs — Combining Tables", tagline:"Most business questions live across multiple tables.",
   hook:{
     co:"nexus", day:"Friday, 3:41 pm",
     msg:"Two things for the weekly ops report: (1) full order details — customer names, products, quantities, revenue per line. And (2) ALL departments with staff count, even if a dept has zero people (payroll caught a discrepancy).",
     from:"Kenji Park · Head of Operations",
     insight:"One table is rarely enough. Joins are how you unlock insights that span the entire business.",
   },
   concepts:[
     {icon:"🔗", title:"JOIN zips two tables on a shared key",
      body:"employees has dept_id. departments has id. JOIN matches each employee row to its department row and places them side-by-side. Every row in the result draws from both tables.",
      analogy:"Think of two spreadsheets: one with employee names and dept codes, one with dept codes and dept names. A JOIN is like doing VLOOKUP for every row automatically — but built into the database.",
      misconception:null},
     {icon:"🔵", title:"INNER JOIN — matched rows only",
      body:"Returns rows where the ON condition matches in BOTH tables. Unmatched rows from either side are dropped silently. JOIN alone means INNER JOIN.",
      analogy:null, tip:"If every foreign key is valid (no orphan rows), INNER and LEFT JOIN give identical results."},
     {icon:"🟡", title:"LEFT JOIN — keep all left rows",
      body:"Returns ALL rows from the left table. Where no right-side match exists, right columns are NULL. Use when you need 'everything from X, even those without a matching Y'.",
      analogy:null, tip:"Most analysts default to LEFT JOIN to avoid accidentally losing rows they don't know about."},
     {icon:"⚡", title:"Always alias table names and prefix columns",
      body:"When two tables both have a column called 'name' or 'id', SQL can't tell which one you mean. Aliases (e for employees, d for departments) let you write e.name and d.name unambiguously.",
      analogy:null,
      misconception:"⚠️ SELECT name FROM employees e JOIN departments d is an ERROR — 'name' exists in both tables and is ambiguous. Always write e.name or d.name."},
   ],
   seeit:[
     {lbl:"INNER JOIN — employee + dept name", ann:"ON defines the bridge: employee dept_id matches department id",
      sql:"SELECT e.name,\n       d.name AS department,\n       e.salary\nFROM employees e\nINNER JOIN departments d ON e.dept_id = d.id\nORDER BY e.name;"},
     {lbl:"LEFT JOIN — all depts, even empty",   ann:"COUNT(e.id) is 0 for empty depts — e.id is NULL after LEFT JOIN",
      sql:"SELECT d.name,\n       d.budget,\n       COUNT(e.id) AS headcount\nFROM departments d\nLEFT JOIN employees e ON e.dept_id = d.id\nGROUP BY d.id, d.name, d.budget\nORDER BY headcount DESC;"},
     {lbl:"3-table JOIN — full order details",    ann:"orders is the hub — it holds both foreign keys",
      sql:"SELECT c.name AS customer,\n       p.name AS product,\n       o.qty,\n       ROUND(o.qty * p.price, 2) AS line_total\nFROM orders o\nJOIN customers c ON o.customer_id = c.id\nJOIN products  p ON o.product_id  = p.id\nORDER BY line_total DESC;"},
     {lbl:"Self-JOIN — employee + their manager", ann:"Same table used twice with different aliases",
      sql:"SELECT e.name AS employee,\n       COALESCE(m.name, 'No Manager') AS manager\nFROM employees e\nLEFT JOIN employees m ON e.manager_id = m.id\nORDER BY manager, employee;"},
   ],
   guided:[
     {id:"g1", diff:"Easy", scaffold:0.8,
      title:"Employee names with department names",
      context:"Nexus ops needs the staff list with readable department names (not IDs). Sort alphabetically by department, then employee name.",
      template:"SELECT e.name, d.name AS department\nFROM employees %%B:alias%%\n%%B:join type%% departments d ON e.dept_id = %%B:right-side key%%\nORDER BY d.name, e.name;",
      checks:[{t:"rows",n:12},{t:"col",c:"department"}],
      hints:["Alias for employees: e","JOIN type: JOIN (or INNER JOIN)","Right-side key: d.id"],
      solution:"SELECT e.name, d.name AS department\nFROM employees e\nJOIN departments d ON e.dept_id = d.id\nORDER BY d.name, e.name;",
      whyItWorks:"ON e.dept_id = d.id is the bridge between tables. All 12 employees have a valid dept_id so all 12 appear in the result."},
     {id:"g2", diff:"Medium", scaffold:0.6,
      title:"All departments — including empty ones",
      context:"Kenji's payroll discrepancy: show ALL departments with headcount. Departments with zero staff must appear.",
      template:"SELECT d.name, COUNT(e.id) AS headcount\nFROM departments d\n%%D:LEFT JOIN|INNER JOIN|RIGHT JOIN|CROSS JOIN%% employees e ON e.dept_id = d.id\nGROUP BY d.id, d.name\nORDER BY headcount DESC;",
      checks:[{t:"rows",n:5},{t:"col",c:"headcount"}],
      hints:["LEFT JOIN keeps ALL rows from the left (departments)","INNER JOIN would silently drop departments with no employees"],
      solution:"SELECT d.name, COUNT(e.id) AS headcount\nFROM departments d\nLEFT JOIN employees e ON e.dept_id = d.id\nGROUP BY d.id, d.name\nORDER BY headcount DESC;",
      whyItWorks:"COUNT(e.id) returns 0 for empty departments — e.id is NULL after LEFT JOIN, and COUNT(column) skips NULLs. This is why COUNT(e.id) not COUNT(*)."},
     {id:"g3", diff:"Medium", scaffold:0.45,
      title:"Order revenue — 3 tables",
      context:"Weekly revenue report: customer name, product name, quantity, and line total (qty × price). Highest revenue first.",
      template:"SELECT c.name AS customer, p.name AS product,\n       o.qty, o.qty * p.price AS line_total\nFROM orders o\nJOIN customers c ON o.%%B:FK to customers%% = c.id\nJOIN products  p ON o.%%B:FK to products%% = p.id\nORDER BY line_total %%B:direction%%;",
      checks:[{t:"rows",n:12},{t:"col",c:"line_total"}],
      hints:["FK to customers: customer_id","FK to products: product_id","Highest first: DESC"],
      solution:"SELECT c.name AS customer, p.name AS product,\n  o.qty, o.qty * p.price AS line_total\nFROM orders o\nJOIN customers c ON o.customer_id = c.id\nJOIN products p ON o.product_id = p.id\nORDER BY line_total DESC;",
      whyItWorks:"orders is the hub table — it holds both foreign keys linking to customers and products. Always start FROM the central fact/transaction table."},
   ],
   usecases:[
     {co:"nexus", icon:"💰", title:"Weekly Revenue Report",
      situation:"The weekly ops review starts with this query every Monday. Three tables, one view of who bought what.",
      sql:"SELECT c.name AS customer,\n       p.name AS product,\n       p.category,\n       o.qty,\n       ROUND(o.qty * p.price, 2) AS line_total\nFROM orders o\nJOIN customers c ON o.customer_id = c.id\nJOIN products  p ON o.product_id  = p.id\nORDER BY line_total DESC;",
      result:"Acme Corp's Laptop Pro order is the highest line: 3 × $1,299.99 = $3,899.97.",
      transferPoint:"Chain JOINs outward from your central fact table. orders is the hub; customers and products are its dimensions."},
     {co:"meridian", icon:"📊", title:"Budget vs Payroll by Department",
      situation:"Finance needs to compare each department's allocated budget against its actual payroll spend. Empty departments must appear with zero.",
      sql:"SELECT d.name,\n       d.budget,\n       COUNT(e.id)               AS headcount,\n       COALESCE(SUM(e.salary),0)  AS actual_payroll,\n       d.budget - COALESCE(SUM(e.salary),0) AS remaining\nFROM departments d\nLEFT JOIN employees e ON e.dept_id = d.id\nGROUP BY d.id, d.name, d.budget\nORDER BY remaining ASC;",
      result:"Engineering is most over-budget (payroll nearly equals budget). An empty department appears with $0 payroll.",
      transferPoint:"LEFT JOIN + COALESCE is the standard pattern for 'include all X even if no matching Y exists'."},
   ],
   recall:[
     {q:"A LEFT JOIN B. Table A has 5 rows, 2 have no match in B. Result rows?",
      opts:["3 (matched rows only)","5 (all of A, NULLs for unmatched)","7 (all rows from both)","Depends on the ON condition"],
      ans:1, exp:"LEFT JOIN always returns ALL rows from the left table — exactly 5. The 2 unmatched rows appear with NULLs in all B columns. INNER JOIN would return only 3."},
     {q:"You want ALL departments, even those with zero employees. departments is on the left. Which JOIN?",
      opts:["INNER JOIN employees to departments","LEFT JOIN employees to departments","LEFT JOIN departments to employees","CROSS JOIN"],
      ans:2, exp:"departments on the left with LEFT JOIN means: keep all departments. Each department is matched to its employees. Departments with no employees appear with NULL employee columns and COUNT(e.id) = 0."},
     {q:"SELECT name FROM employees e JOIN departments d is ambiguous. Why?",
      opts:["You can't use aliases in a JOIN","'name' exists in both employees and departments — SQL can't decide which","JOIN requires you to SELECT *","The alias 'e' conflicts with 'employees'"],
      ans:1, exp:"Both tables have a 'name' column. Without a prefix (e.name or d.name), SQL doesn't know which one you mean and throws an error. Always prefix column names in JOIN queries."},
   ],
   challenge:[
     {id:"c1", diff:"Hard",
      title:"Full Org Chart with Budget Utilisation",
      context:"Meridian's CHRO needs a complete org chart: each employee's name, their manager's name (or 'No Manager'), their department name, and what percentage of their department's total payroll their salary represents (1 decimal place, labelled pct_of_dept). Sort by department, then percentage descending.",
      tables:["employees","departments"],
      starter:"-- Use: employees e, employees m (manager self-join), departments d\n-- Window function: SUM(salary) OVER (PARTITION BY dept_id)\nSELECT e.name AS employee,\n       COALESCE(m.name, 'No Manager') AS manager,\n       d.name AS department,\n       ",
      checks:[{t:"rows",n:12},{t:"col",c:"pct_of_dept"}],
      hints:["ROUND(e.salary * 100.0 / SUM(e.salary) OVER (PARTITION BY e.dept_id), 1) AS pct_of_dept","FROM employees e LEFT JOIN employees m ON e.manager_id = m.id JOIN departments d ON e.dept_id = d.id","ORDER BY department, pct_of_dept DESC"],
      solution:"SELECT e.name AS employee,\n  COALESCE(m.name, 'No Manager') AS manager,\n  d.name AS department,\n  ROUND(e.salary * 100.0 / SUM(e.salary) OVER (PARTITION BY e.dept_id), 1) AS pct_of_dept\nFROM employees e\nLEFT JOIN employees m ON e.manager_id = m.id\nJOIN departments d ON e.dept_id = d.id\nORDER BY department, pct_of_dept DESC;",
      celebration:"Self-join + regular join + window function in one query — this is genuinely advanced SQL that impresses in any interview or code review."},
   ],
  },
 ]},
];

/* ─── GLOBAL CSS ─────────────────────────────────────── */
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;background:${T.bg};color:${T.tx};-webkit-font-smoothing:antialiased;}
body{font-family:'Plus Jakarta Sans',sans-serif;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-track{background:${T.bg};}
::-webkit-scrollbar-thumb{background:${T.brd};border-radius:2px;}
textarea,input{font-family:'JetBrains Mono',monospace!important;}
textarea:focus,input:focus,select:focus{outline:none;}
button{cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;}
select{font-family:'JetBrains Mono',monospace;}
.hkw{color:#d4a852;font-weight:600;}.hst{color:#6db870;}.hnu{color:#c05840;}.hcm{color:${T.t3};font-style:italic;}
@keyframes slideUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
@keyframes glow{0%,100%{box-shadow:0 0 8px rgba(232,160,32,.2);}50%{box-shadow:0 0 20px rgba(232,160,32,.35);}}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
@keyframes toastIn{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
@keyframes bounce{0%,100%{transform:translateY(0);}50%{transform:translateY(-4px);}}
.aUp{animation:slideUp .3s cubic-bezier(.22,.68,0,1.15) both;}
.toastIn{animation:toastIn .4s cubic-bezier(.22,.68,0,1.2) both;}
@media(max-width:640px){.hide-sm{display:none!important;}.sm-col{flex-direction:column!important;}.sm-full{width:100%!important;}.sm-pad{padding:16px 12px!important;}}
@media(max-width:900px){.hide-md{display:none!important;}.md-col{flex-direction:column!important;}}
`;

/* ─── UTILS ──────────────────────────────────────────── */
const KW=/\b(SELECT|FROM|WHERE|JOIN|INNER|LEFT|RIGHT|ON|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|DROP|TABLE|WITH|RECURSIVE|UNION|ALL|AS|AND|OR|NOT|NULL|BETWEEN|IN|LIKE|DISTINCT|COUNT|SUM|AVG|MIN|MAX|OVER|PARTITION\s+BY|RANK|ROW_NUMBER|DENSE_RANK|LAG|LEAD|CASE|WHEN|THEN|ELSE|END|COALESCE|CAST|ROUND|IS|EXISTS|NULLIF|EXPLAIN|INDEX|STRFTIME)\b/gi;
const hlSQL=l=>!l?"":(l.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/(--[^\n]*)/g,'<span class="hcm">$1</span>').replace(/('[^']*')/g,'<span class="hst">$1</span>').replace(KW,m=>`<span class="hkw">${m.toUpperCase()}</span>`).replace(/\b(\d+(?:\.\d+)?)\b/g,'<span class="hnu">$1</span>'));
function parseTpl(t){const re=/%%([BD]):([^%]*)%%/g,p=[];let l=0,m;while((m=re.exec(t))){if(m.index>l)p.push({k:"text",v:t.slice(l,m.index)});p.push(m[1]==="B"?{k:"blank",hint:m[2]}:{k:"drop",opts:m[2].split("|")});l=m.index+m[0].length;}if(l<t.length)p.push({k:"text",v:t.slice(l)});return p;}
const asmSql=(t,f)=>{let i=0;return t.replace(/%%[BD]:[^%]*%%/g,()=>f[i++]??"___");};
function validate(res,checks){if(!checks?.length)return null;if(!res?.columns?.length)return{ok:false,msg:"No results returned. Make sure your query is a SELECT."};const cols=res.columns.map(c=>c.toLowerCase());for(const ck of checks){if(ck.t==="rows"&&res.values.length!==ck.n)return{ok:false,msg:`Expected ${ck.n} row${ck.n!==1?"s":""},  got ${res.values.length}.`};if(ck.t==="col"&&!cols.includes(ck.c.toLowerCase()))return{ok:false,msg:`Column "${ck.c}" not found — check your aliases.`};}return{ok:true,msg:"Correct!"};}
const runDB=(db,sql)=>{const ss=sql.split(";").map(s=>s.trim()).filter(Boolean);let last=null;for(const s of ss){const r=db.exec(s+";");if(r.length)last=r[r.length-1];}return last;};
const rich=t=>t.replace(/\*\*([^*]+)\*\*/g,`<strong style="color:${T.tx}">$1</strong>`).replace(/`([^`]+)`/g,`<code style="color:${T.A};background:${T.AD}44;padding:1px 6px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:12px;border:1px solid ${T.AD}">$1</code>`);
function useWinSize(){const[w,s]=useState(typeof window!=="undefined"?window.innerWidth:1200);useEffect(()=>{const h=()=>s(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);return w;}

/* ─── PRIMITIVES ─────────────────────────────────────── */
function PBar({pct,color,h=4}){return <div style={{background:T.s3,borderRadius:99,height:h,overflow:"hidden"}}><div style={{width:`${Math.max(0,Math.min(100,pct))}%`,height:"100%",borderRadius:99,transition:"width .5s ease",background:`linear-gradient(90deg,${color}88,${color})`}}/></div>;}
function Ring({pct,color,size=36,sw=3}){const r=(size-sw*2)/2,c=2*Math.PI*r,d=(pct/100)*c;return <svg width={size} height={size} style={{transform:"rotate(-90deg)",flexShrink:0}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.s3} strokeWidth={sw}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={`${d} ${c}`} strokeLinecap="round" style={{transition:"stroke-dasharray .5s"}}/></svg>;}
function Tag({label,color,sm}){return <span style={{display:"inline-flex",alignItems:"center",padding:sm?"1px 7px":"2px 10px",borderRadius:99,fontSize:sm?9.5:11,fontWeight:600,color,background:`${color}16`,border:`1px solid ${color}30`,whiteSpace:"nowrap"}}>{label}</span>;}
function Btn({children,onClick,primary,color,disabled,style={}}){const c=color||T.A;return <button onClick={onClick} disabled={disabled} style={{padding:"10px 22px",borderRadius:9,border:primary?`none`:`1.5px solid ${disabled?"#2a2010":c+"55"}`,background:primary?`linear-gradient(135deg,${c},${c}dd)`:`${c}12`,color:disabled?T.t4:primary?T.bg:c,fontWeight:700,fontSize:13.5,transition:"all .2s",boxShadow:primary&&!disabled?`0 3px 16px ${c}44`:"none",...style}} onMouseEnter={e=>{if(!disabled&&!primary)e.currentTarget.style.background=`${c}22`;}} onMouseLeave={e=>{if(!disabled&&!primary)e.currentTarget.style.background=`${c}12`;}}>{children}</button>;}

/* ─── CODE BLOCK ─────────────────────────────────────── */
function CB({sql,ann,label}){
  const[cp,setCp]=useState(false);
  return <div style={{borderRadius:9,overflow:"hidden",border:`1px solid ${T.brd}`,marginBottom:8}}>
    {ann&&<div style={{padding:"6px 13px",background:`${T.A}14`,borderBottom:`1px solid ${T.brd}`,fontSize:11.5,color:T.A,display:"flex",gap:6,alignItems:"flex-start"}}><span style={{flexShrink:0}}>💬</span>{ann}</div>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 12px",background:T.s2}}>
      <span style={{fontSize:10.5,color:T.t3,fontFamily:"'JetBrains Mono',monospace"}}>{label||"sql"}</span>
      <button onClick={()=>{navigator.clipboard?.writeText(sql);setCp(true);setTimeout(()=>setCp(false),1800);}} style={{background:"none",border:`1px solid ${T.brd}`,borderRadius:4,color:cp?T.S:T.t3,padding:"1px 9px",fontSize:10,fontFamily:"'JetBrains Mono',monospace",transition:"color .2s"}}>{cp?"✓":"copy"}</button>
    </div>
    <pre style={{margin:0,padding:"12px 14px",background:T.bg,overflowX:"auto",fontFamily:"'JetBrains Mono',monospace",fontSize:12.5,lineHeight:1.85}} dangerouslySetInnerHTML={{__html:sql.trim().split("\n").map(hlSQL).join("\n")}}/>
  </div>;
}

/* ─── RESULT TABLE ───────────────────────────────────── */
function RT({res,err,ran}){
  if(!ran)return null;
  if(err)return <div style={{padding:"10px 13px",background:T.err.bg,borderTop:`1px solid ${T.err.brd}`,display:"flex",gap:8,alignItems:"flex-start"}}><span style={{color:T.R,fontSize:15,flexShrink:0}}>⚠</span><span style={{color:T.err.tx,fontSize:12,fontFamily:"'JetBrains Mono',monospace",lineHeight:1.6}}>{err}</span></div>;
  if(!res?.columns?.length)return <div style={{padding:"9px 13px",color:T.S,fontSize:12,borderTop:`1px solid ${T.brd}`,background:T.s4,fontFamily:"'JetBrains Mono',monospace"}}>✓ Executed — 0 rows</div>;
  return <div style={{borderTop:`1px solid ${T.brd}`,overflowX:"auto",maxHeight:180,overflowY:"auto"}}>
    <table style={{borderCollapse:"collapse",fontSize:12,fontFamily:"'JetBrains Mono',monospace",width:"100%",minWidth:"max-content"}}>
      <thead><tr>{res.columns.map(c=><th key={c} style={{padding:"5px 12px",background:T.s2,color:T.A,borderBottom:`1px solid ${T.brd}`,textAlign:"left",whiteSpace:"nowrap",position:"sticky",top:0,fontWeight:600,fontSize:10,letterSpacing:.8,textTransform:"uppercase"}}>{c}</th>)}</tr></thead>
      <tbody>{res.values.map((row,i)=><tr key={i} style={{background:i%2===0?T.bg:T.s4}} onMouseEnter={e=>e.currentTarget.style.background=T.s2} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.bg:T.s4}>
        {row.map((cell,j)=><td key={j} style={{padding:"5px 12px",color:cell===null?T.t3:T.t2,borderBottom:`1px solid ${T.brdF}`,whiteSpace:"nowrap"}}>{cell===null?<em style={{color:T.t3}}>NULL</em>:String(cell)}</td>)}
      </tr>)}</tbody>
    </table>
    <div style={{padding:"3px 12px",color:T.t3,fontSize:10,background:T.s2,borderTop:`1px solid ${T.brdF}`,fontFamily:"'JetBrains Mono',monospace"}}>{res.values.length} row{res.values.length!==1?"s":""}</div>
  </div>;
}

/* ─── SQL CONSOLE (for See It + Challenge) ───────────── */
function Console({initSQL="",db,compact,checks,onPass}){
  const[sql,setSql]=useState(initSQL); const[res,setR]=useState(null); const[err,setE]=useState(null); const[ran,setRn]=useState(false); const[val,setV]=useState(null);
  const ta=useRef();
  const run=useCallback(()=>{if(!db)return;setE(null);setR(null);setRn(true);setV(null);try{const r=runDB(db,sql);setR(r);if(checks?.length){const v=validate(r,checks);setV(v);if(v?.ok&&onPass)onPass();}}catch(e){setE(e.message);}},[db,sql,checks,onPass]);
  const onKey=e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();run();}if(e.key==="Tab"){e.preventDefault();const el=ta.current,p=el.selectionStart;setSql(v=>v.slice(0,p)+"  "+v.slice(el.selectionEnd));requestAnimationFrame(()=>{el.selectionStart=el.selectionEnd=p+2;});}};
  return <div style={{border:`1px solid ${T.brd}`,borderRadius:9,overflow:"hidden"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 12px",background:T.s2,borderBottom:`1px solid ${T.brd}`}}>
      <div style={{display:"flex",gap:4}}>{["#c03028","#e0922a","#28b040"].map(c=><div key={c} style={{width:9,height:9,borderRadius:"50%",background:c}}/>)}</div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:10,color:T.t3,fontFamily:"'JetBrains Mono',monospace"}}>Ctrl+Enter</span>
        <button onClick={run} disabled={!db} style={{background:db?T.A:T.brd,border:"none",borderRadius:6,color:db?T.bg:T.t3,padding:"3px 14px",fontSize:12.5,fontWeight:700,transition:"all .2s",boxShadow:db?`0 2px 10px rgba(232,160,32,.3)`:"none"}}>▶ Run</button>
      </div>
    </div>
    <textarea ref={ta} value={sql} onChange={e=>setSql(e.target.value)} onKeyDown={onKey} spellCheck={false} style={{width:"100%",height:compact?80:130,padding:"10px 13px",background:T.bg,color:T.tx,border:"none",fontFamily:"'JetBrains Mono',monospace",fontSize:12.5,lineHeight:1.85,resize:"vertical"}}/>
    <RT res={res} err={err} ran={ran}/>
    {val&&<div className="aUp" style={{padding:"9px 13px",display:"flex",alignItems:"center",gap:8,background:val.ok?T.ok.bg:T.warn.bg,borderTop:`1px solid ${val.ok?T.ok.brd:T.warn.brd}`}}><span style={{fontSize:16,flexShrink:0}}>{val.ok?"✅":"💡"}</span><span style={{fontSize:12.5,color:val.ok?T.ok.tx:T.warn.tx,lineHeight:1.5}}>{val.msg}</span></div>}
  </div>;
}

/* ─── TEMPLATE EDITOR ────────────────────────────────── */
function TplEd({template,fills,setFills,db,checks,onPass}){
  const parts=useMemo(()=>parseTpl(template),[template]);
  const[res,setR]=useState(null); const[err,setE]=useState(null); const[ran,setRn]=useState(false); const[val,setV]=useState(null);
  let bi=0;const el=[];
  for(let i=0;i<parts.length;i++){
    const p=parts[i];
    if(p.k==="text"){p.v.split("\n").forEach((l,li,arr)=>{el.push(<span key={`t${i}l${li}`} dangerouslySetInnerHTML={{__html:hlSQL(l)}}/>);if(li<arr.length-1)el.push(<br key={`br${i}${li}`}/>);});}
    else if(p.k==="blank"){const idx=bi++,w=Math.max(p.hint.length*8,70);el.push(<input key={`b${i}`} value={fills[idx]||""} placeholder={p.hint} spellCheck={false} onChange={e=>setFills(f=>({...f,[idx]:e.target.value}))} style={{display:"inline-block",width:w,verticalAlign:"baseline",background:"#1c1402",border:`1.5px dashed ${T.A}`,borderRadius:4,color:T.AL,fontFamily:"'JetBrains Mono',monospace",fontSize:12.5,padding:"0 5px",lineHeight:"inherit"}} onFocus={e=>{e.target.style.background="#261c04";e.target.style.borderStyle="solid";}} onBlur={e=>{e.target.style.background="#1c1402";e.target.style.borderStyle="dashed";}}/>);}
    else{const idx=bi++;el.push(<select key={`d${i}`} value={fills[idx]||""} onChange={e=>setFills(f=>({...f,[idx]:e.target.value}))} style={{display:"inline-block",verticalAlign:"baseline",background:"#0e1a0a",border:`1.5px solid ${T.S}`,borderRadius:4,color:fills[idx]?T.S:T.t3,fontFamily:"'JetBrains Mono',monospace",fontSize:12.5,padding:"0 5px",cursor:"pointer"}}><option value="" style={{color:T.t3}}>▾ pick</option>{p.opts.map(o=><option key={o} value={o} style={{color:T.tx,background:T.surf}}>{o}</option>)}</select>);}
  }
  const run=()=>{if(!db)return;setE(null);setR(null);setRn(true);setV(null);const sql=asmSql(template,Object.values(fills));try{const r=runDB(db,sql);setR(r);const v=validate(r,checks||[]);setV(v);if(v?.ok&&onPass)onPass();}catch(e){setE(e.message);}};
  const tot=(template.match(/%%[BD]:/g)||[]).length,fil=Object.values(fills).filter(v=>v?.trim()).length;
  return <div style={{border:`1px solid ${T.brd}`,borderRadius:9,overflow:"hidden"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 12px",background:T.s2,borderBottom:`1px solid ${T.brd}`}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <div style={{display:"flex",gap:3}}>{Array.from({length:tot}).map((_,i)=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:fills[i]?.trim()?T.A:T.brd,transition:"background .2s"}}/>)}</div>
        <span style={{fontSize:10,color:T.t3,fontFamily:"'JetBrains Mono',monospace"}}>{fil}/{tot} filled</span>
      </div>
      <button onClick={run} disabled={!db} style={{background:db?T.A:T.brd,border:"none",borderRadius:6,color:db?T.bg:T.t3,padding:"3px 14px",fontSize:12.5,fontWeight:700,transition:"all .2s",boxShadow:db?`0 2px 10px rgba(232,160,32,.3)`:"none"}}>▶ Check</button>
    </div>
    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12.5,lineHeight:2.1,background:T.bg,padding:"12px 16px",overflowX:"auto",whiteSpace:"pre-wrap"}}>{el}</div>
    <RT res={res} err={err} ran={ran}/>
    {val&&<div className="aUp" style={{padding:"9px 13px",display:"flex",alignItems:"center",gap:8,background:val.ok?T.ok.bg:T.warn.bg,borderTop:`1px solid ${val.ok?T.ok.brd:T.warn.brd}`}}><span style={{fontSize:16,flexShrink:0}}>{val.ok?"✅":"💡"}</span><span style={{fontSize:12.5,color:val.ok?T.ok.tx:T.warn.tx,lineHeight:1.5}}>{val.msg}</span></div>}
  </div>;
}

/* ─── CONTEXT PANEL ──────────────────────────────────── */
function CtxPanel({db,tables}){
  const[prev,setP]=useState({}); const[open,setO]=useState(true);
  useEffect(()=>{if(!db||!tables?.length)return;const o={};for(const t of tables){try{const r=db.exec(`SELECT * FROM ${t} LIMIT 3`);if(r.length)o[t]=r[0];}catch(e){}}setP(o);},[db,tables?.join(",")]);
  if(!tables?.length)return null;
  return <div style={{border:`1px solid ${T.brd}`,borderRadius:8,marginBottom:12,overflow:"hidden"}}>
    <button onClick={()=>setO(o=>!o)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 13px",background:T.s2,border:"none",cursor:"pointer"}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:11}}>📋</span><span style={{fontSize:11.5,fontWeight:600,color:T.t2}}>Table Reference — {tables.join(", ")}</span></div>
      <span style={{fontSize:10,color:T.t3}}>{open?"▲":"▼"}</span>
    </button>
    {open&&<div style={{padding:"10px 13px",background:T.s4,display:"flex",flexDirection:"column",gap:10}}>
      {tables.map(t=><div key={t}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5,flexWrap:"wrap"}}>
          <span style={{width:8,height:8,borderRadius:"50%",background:TC[t]||T.A,display:"inline-block",flexShrink:0}}/>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:600,color:TC[t]||T.A}}>{t}</span>
          <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{SCHEMA_MAP[t]?.map(c=><span key={c} style={{fontSize:9.5,color:T.t3,background:T.s3,padding:"1px 6px",borderRadius:3,border:`1px solid ${T.brd}`,fontFamily:"'JetBrains Mono',monospace"}}>{c}</span>)}</div>
        </div>
        {prev[t]&&<div style={{overflowX:"auto",borderRadius:6,border:`1px solid ${T.brd}`}}>
          <table style={{borderCollapse:"collapse",fontSize:11,fontFamily:"'JetBrains Mono',monospace",width:"100%"}}>
            <thead><tr>{prev[t].columns.map(c=><th key={c} style={{padding:"3px 10px",background:T.s3,color:T.t2,borderBottom:`1px solid ${T.brd}`,textAlign:"left",whiteSpace:"nowrap",fontWeight:500,fontSize:10}}>{c}</th>)}</tr></thead>
            <tbody>{prev[t].values.map((row,i)=><tr key={i} style={{background:i%2===0?T.bg:T.s4}}>{row.map((cell,j)=><td key={j} style={{padding:"3px 10px",color:cell===null?T.t3:T.t2,borderBottom:`1px solid ${T.brdF}`,whiteSpace:"nowrap"}}>{cell===null?<em style={{color:T.t3}}>NULL</em>:String(cell)}</td>)}</tr>)}</tbody>
          </table>
          <div style={{padding:"1px 10px",color:T.t3,fontSize:9.5,background:T.s2,fontFamily:"'JetBrains Mono',monospace"}}>first 3 rows</div>
        </div>}
      </div>)}
    </div>}
  </div>;
}

/* ─── STEP WRAPPER ───────────────────────────────────── */
function Step({num,icon,label,color,children,locked,complete}){
  const[open,setOpen]=useState(!locked);
  return <div style={{marginBottom:4}}>
    <div onClick={()=>!locked&&setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 18px",background:T.surf,border:`1px solid ${complete?color+"40":T.brd}`,borderRadius:complete||open?"11px 11px 0 0":"11px",cursor:locked?"not-allowed":"pointer",transition:"all .2s",boxShadow:complete?`0 0 16px ${color}18`:undefined}}>
      <div style={{width:32,height:32,borderRadius:"50%",border:`2px solid ${locked?"#2a2010":complete?color:T.brd}`,background:complete?`${color}18`:locked?"#1a1408":T.s2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,transition:"all .3s"}}>{complete?"✓":locked?"🔒":icon}</div>
      <div style={{flex:1}}><div style={{fontFamily:"'Fraunces',serif",fontWeight:700,fontSize:14.5,color:locked?T.t4:complete?color:T.tx}}>{label}</div>{locked&&<div style={{fontSize:11,color:T.t4,marginTop:1}}>Complete the previous step to unlock</div>}</div>
      {!locked&&<span style={{color:T.t3,fontSize:13,transition:"transform .2s",transform:open?"rotate(180deg)":"none"}}>▾</span>}
    </div>
    {open&&!locked&&<div className="aUp" style={{border:`1px solid ${T.brd}`,borderTop:"none",borderRadius:"0 0 11px 11px",padding:"20px 18px",background:T.bg}}>{children}</div>}
  </div>;
}

/* ─── SECTION COMPLETE BUTTON ────────────────────────── */
function ContinueBtn({label,onClick,color}){return <div style={{display:"flex",justifyContent:"flex-end",marginTop:18}}><Btn onClick={onClick} primary color={color} style={{padding:"11px 28px",fontSize:14}}>{label||"Continue →"}</Btn></div>;}

/* ─── MCQ RECALL BLOCK ───────────────────────────────── */
function Recall({questions,onAllDone}){
  const[answers,setAnswers]=useState({});
  const[revealed,setRevealed]=useState({});
  const allDone=questions.every((_,i)=>answers[i]!==undefined);
  useEffect(()=>{if(allDone&&onAllDone)onAllDone();},[allDone]);
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    {questions.map((q,qi)=>{
      const sel=answers[qi]; const done=sel!==undefined; const rev=revealed[qi]||done;
      return <div key={qi} style={{background:T.surf,border:`1px solid ${T.brd}`,borderRadius:10,padding:"15px 16px"}}>
        <div style={{fontSize:13.5,fontWeight:600,color:T.tx,marginBottom:12,lineHeight:1.5}}><span style={{color:T.t3,fontFamily:"'JetBrains Mono',monospace",fontSize:11,marginRight:8}}>Q{qi+1}</span>{q.q}</div>
        <div className="sm-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
          {q.opts.map((opt,i)=>{const isC=i===q.ans,isS=i===sel;let bg=T.s2,brd=T.brd,col=T.t2;if(done){if(isC){bg=T.ok.bg;brd=T.S;col=T.tx;}else if(isS){bg=T.err.bg;brd=T.R;col=T.err.tx;}else col=T.t3;}
            return <button key={i} onClick={()=>{if(done)return;setAnswers(a=>({...a,[qi]:i}));setRevealed(r=>({...r,[qi]:true}));}} style={{background:bg,border:`1.5px solid ${brd}`,borderRadius:7,padding:"9px 11px",textAlign:"left",color:col,cursor:done?"default":"pointer",fontSize:12.5,lineHeight:1.45,display:"flex",gap:7,alignItems:"flex-start",transition:"all .15s"}} onMouseEnter={e=>!done&&(e.currentTarget.style.background=T.s3)} onMouseLeave={e=>!done&&(e.currentTarget.style.background=bg)}>
              <span style={{width:18,height:18,borderRadius:"50%",border:`1.5px solid ${brd}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,flexShrink:0,color:col,marginTop:1}}>{done&&isC?"✓":done&&isS?"✗":String.fromCharCode(65+i)}</span>{opt}
            </button>;})}
        </div>
        {rev&&q.exp&&<div className="aUp" style={{marginTop:10,padding:"9px 12px",background:"#0c0a1c",borderRadius:7,color:"#c4b5fd",fontSize:12,lineHeight:1.65,display:"flex",gap:7,alignItems:"flex-start"}}><span style={{flexShrink:0}}>💡</span><span>{q.exp}</span></div>}
      </div>;})}
  </div>;
}

/* ─── CHALLENGE EXERCISE ─────────────────────────────── */
function ChallengeEx({ex,db,lc,onPass}){
  const[passed,setPassed]=useState(false); const[hintIdx,setHintIdx]=useState(0); const[showSol,setSol]=useState(false);
  const handle=useCallback(()=>{if(!passed){setPassed(true);if(onPass)onPass();}},[passed,onPass]);
  return <div style={{border:`1.5px solid ${passed?lc+"55":T.brd}`,borderRadius:10,overflow:"hidden",transition:"all .3s",boxShadow:passed?`0 0 20px ${lc}14`:undefined}}>
    <div style={{padding:"10px 15px",background:T.s2,borderBottom:`1px solid ${T.brd}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${passed?lc:T.brd}`,background:passed?`${lc}20`:T.s3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9.5,color:passed?lc:T.t3,fontWeight:700}}>{passed?"✓":"?"}</div>
        <span style={{fontWeight:600,fontSize:13.5,color:T.tx}}>{ex.title}</span>
      </div>
      <Tag label={ex.diff} color={DIFF[ex.diff]||T.t2} sm/>
    </div>
    <div style={{padding:"14px 15px",background:T.bg}}>
      <div style={{padding:"10px 13px",background:T.surf,borderRadius:7,border:`1px solid ${T.brd}`,borderLeft:`3px solid ${lc}`,marginBottom:12}}>
        <div style={{fontSize:9.5,fontWeight:700,color:lc,letterSpacing:1.5,marginBottom:5,textTransform:"uppercase"}}>Your Mission</div>
        <div style={{fontSize:13,color:T.t2,lineHeight:1.65}}>{ex.context}</div>
      </div>
      {ex.tables?.length>0&&<CtxPanel db={db} tables={ex.tables}/>}
      <Console initSQL={ex.starter||""} db={db} checks={ex.checks} onPass={handle}/>
      {passed&&ex.celebration&&<div className="aUp" style={{marginTop:10,padding:"11px 14px",background:"#0e0c00",borderRadius:8,borderLeft:`3px solid ${lc}`,display:"flex",gap:8,alignItems:"flex-start"}}><span style={{fontSize:18,flexShrink:0}}>🎯</span><span style={{color:T.t2,fontSize:12.5,lineHeight:1.65}}>{ex.celebration}</span></div>}
      {(ex.hints?.length||ex.solution)&&<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:10}}>
        {hintIdx<(ex.hints?.length||0)&&<button onClick={()=>setHintIdx(h=>h+1)} style={{background:T.s2,border:`1px solid ${T.brd}`,borderRadius:6,color:T.A,padding:"5px 12px",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:5}}>💡 Hint {hintIdx+1}/{ex.hints.length}</button>}
        {hintIdx>0&&<span style={{color:T.t2,fontSize:12,padding:"5px 10px",background:T.s2,borderRadius:6,border:`1px solid ${T.brd}`,flex:1}}>{ex.hints[hintIdx-1]}</span>}
        {ex.solution&&<button onClick={()=>setSol(s=>!s)} style={{marginLeft:"auto",background:"none",border:`1px solid ${T.brd}`,borderRadius:6,color:T.t3,padding:"5px 10px",fontSize:11}}>{showSol?"Hide":"Show"} answer</button>}
      </div>}
      {showSol&&ex.solution&&<div style={{marginTop:8}}><CB sql={ex.solution} label="answer"/></div>}
    </div>
  </div>;
}

/* ─── COMPLETE CARD ──────────────────────────────────── */
function CompleteCard({mod,lc,onNext,hasNext}){
  return <div style={{border:`1.5px solid ${lc}50`,borderRadius:12,overflow:"hidden",background:`${lc}08`}}>
    <div style={{padding:"24px 22px",textAlign:"center"}}>
      <div style={{fontSize:40,marginBottom:10}}>🏅</div>
      <div style={{fontFamily:"'Fraunces',serif",fontWeight:800,fontSize:20,color:T.tx,marginBottom:8}}>Lesson Complete!</div>
      <div style={{fontSize:13.5,color:T.t2,marginBottom:20,lineHeight:1.7,maxWidth:460,margin:"0 auto 20px"}}>
        You've learned <strong style={{color:lc}}>{mod.title}</strong>. 
        The key to retention is practice — you'll see these concepts again in future lessons (spaced repetition).
      </div>
      {/* Concept summary */}
      <div style={{background:T.surf,border:`1px solid ${T.brd}`,borderRadius:9,padding:"14px 16px",marginBottom:20,textAlign:"left"}}>
        <div style={{fontSize:10,fontWeight:700,color:T.t3,letterSpacing:1.5,marginBottom:10,textTransform:"uppercase"}}>What You Learned</div>
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {mod.concepts.map((c,i)=><div key={i} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <span style={{color:lc,fontSize:14,flexShrink:0,marginTop:1}}>{c.icon}</span>
            <div><span style={{fontWeight:600,color:T.tx,fontSize:13}}>{c.title}</span><span style={{color:T.t3,fontSize:12}}> — {c.body.slice(0,80)}{c.body.length>80?"…":""}</span></div>
          </div>)}
        </div>
      </div>
      {hasNext?<Btn onClick={onNext} primary color={lc} style={{padding:"12px 36px",fontSize:15}}>Next Lesson →</Btn>
        :<div style={{color:T.t2,fontSize:14}}>🎓 You've completed all current lessons! More coming soon.</div>}
    </div>
  </div>;
}

/* ─── LESSON PAGE ────────────────────────────────────── */
function LessonPage({mod,db,lc,onNext,hasNext}){
  // Unlock state — tracks which steps are complete
  const[step,setStep]=useState({hook:true,concept:false,seeit:false,guided:false,usecase:false,recall:false,challenge:false,done:false});
  const[guidedDone,setGD]=useState({}); // which guided exercises are passed
  const[recallDone,setRD]=useState(false);
  const[challengeDone,setCD]=useState(false);
  const[guidedFills,setGF]=useState({}); // fills per guided exercise

  const unlock=useCallback((k)=>setStep(s=>({...s,[k]:true})),[]);
  const guidedPassed=mod.guided?.filter((_,i)=>guidedDone[i]).length||0;
  const allGuided=mod.guided?.length||0;

  return <div style={{display:"flex",flexDirection:"column",gap:6}}>

    {/* ─── STEP 1: THE MISSION ─── */}
    <Step num={1} icon="🎯" label="The Mission — Why This Matters" color={T.A} complete={step.concept}>
      <div style={{border:`1px solid ${CO[mod.hook.co]?.color}30`,borderRadius:11,overflow:"hidden",marginBottom:16}}>
        <div style={{padding:"10px 18px",background:`${CO[mod.hook.co]?.color}0c`,borderBottom:`1px solid ${CO[mod.hook.co]?.color}20`,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div style={{width:34,height:34,borderRadius:8,background:`${CO[mod.hook.co]?.color}18`,border:`1px solid ${CO[mod.hook.co]?.color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0}}>{CO[mod.hook.co]?.icon}</div>
          <div>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:700,fontSize:14.5,color:T.tx}}>{CO[mod.hook.co]?.name}</div>
            <div style={{fontSize:11.5,color:T.t2,marginTop:1}}>{mod.hook.from} · {mod.hook.day}</div>
          </div>
        </div>
        <div style={{padding:"14px 18px",background:T.surf}}>
          <div style={{background:T.s3,borderRadius:"10px 10px 10px 3px",padding:"11px 15px",marginBottom:14,border:`1px solid ${T.brd}`,position:"relative"}}>
            <div style={{position:"absolute",top:0,left:0,fontSize:9.5,color:T.t3,background:T.s2,padding:"2px 8px",borderRadius:"0 0 5px 0",border:`1px solid ${T.brd}`,borderTop:"none",borderLeft:"none"}}>💬 Slack</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:T.tx,lineHeight:1.75,marginTop:3,fontStyle:"italic"}}>"{mod.hook.msg}"</div>
          </div>
          <div className="sm-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div style={{padding:"10px 13px",background:T.s2,borderRadius:8,borderLeft:`2px solid ${T.A}`}}>
              <div style={{fontSize:9.5,fontWeight:700,color:T.A,letterSpacing:1,marginBottom:4,textTransform:"uppercase"}}>The Skill You Need</div>
              <div style={{fontSize:12.5,color:T.t2,lineHeight:1.6}}>{mod.hook.insight}</div>
            </div>
            <div style={{padding:"10px 13px",background:T.ok.bg,borderRadius:8,borderLeft:`2px solid ${T.S}`}}>
              <div style={{fontSize:9.5,fontWeight:700,color:T.S,letterSpacing:1,marginBottom:4,textTransform:"uppercase"}}>Real Impact</div>
              <div style={{fontSize:12.5,color:T.t2,lineHeight:1.6}}>In this lesson you'll write the exact query that answers this request — and understand every line of it.</div>
            </div>
          </div>
        </div>
      </div>
      <ContinueBtn label="I'm Ready — Teach Me →" onClick={()=>unlock("concept")} color={T.A}/>
    </Step>

    {/* ─── STEP 2: CONCEPTS ─── */}
    <Step num={2} icon="💡" label="Understand the Concepts" color={T.B} locked={!step.concept} complete={step.seeit}>
      {/* Analogy first (concrete before abstract) */}
      {mod.concepts[0]?.analogy&&<div style={{border:`1px solid ${T.B}30`,borderLeft:`4px solid ${T.B}`,borderRadius:10,padding:"16px 18px",marginBottom:20,background:`${T.B}07`,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",right:14,top:14,fontSize:40,opacity:.07,lineHeight:1}}>💡</div>
        <div style={{fontFamily:"'Fraunces',serif",fontWeight:600,color:T.B,fontSize:14,marginBottom:7}}>Mental Model</div>
        <div style={{color:T.t2,fontSize:13.5,lineHeight:1.75}}>{mod.concepts[0].analogy}</div>
      </div>}
      <div className="sm-col" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10,marginBottom:16}}>
        {mod.concepts.map((c,i)=><div key={i} style={{background:T.surf,border:`1px solid ${T.brd}`,borderRadius:10,padding:"14px 15px"}}>
          <div style={{fontSize:20,marginBottom:8,color:T.B}}>{c.icon}</div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:700,fontSize:13,color:T.tx,marginBottom:6}}>{c.title}</div>
          <div style={{color:T.t2,fontSize:12.5,lineHeight:1.7}}>{c.body}</div>
          {c.tip&&<div style={{marginTop:9,padding:"7px 10px",background:`${T.B}0c`,borderRadius:6,borderLeft:`2px solid ${T.B}`,color:T.t2,fontSize:11.5,lineHeight:1.55}}>💡 {c.tip}</div>}
          {c.misconception&&<div style={{marginTop:9,padding:"7px 10px",background:T.err.bg,borderRadius:6,borderLeft:`2px solid ${T.R}`,color:T.err.tx,fontSize:11.5,lineHeight:1.55}}>⚠️ {c.misconception}</div>}
        </div>)}
      </div>
      <ContinueBtn label="Got It — Show Me Examples →" onClick={()=>unlock("seeit")} color={T.B}/>
    </Step>

    {/* ─── STEP 3: SEE IT ─── */}
    <Step num={3} icon="👁️" label="See It — Worked Examples" color={T.M} locked={!step.seeit} complete={step.guided}>
      <div style={{color:T.t2,fontSize:13,marginBottom:16,lineHeight:1.65,padding:"10px 13px",background:T.surf,borderRadius:7,border:`1px solid ${T.brd}`}}>
        <strong style={{color:T.M}}>Study these patterns</strong> — each example is runnable. Try modifying them. Understanding examples before attempting exercises reduces cognitive load and speeds learning.
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {mod.seeit.map((ex,i)=><div key={i}>
          <div style={{fontSize:11.5,color:T.t3,marginBottom:4,fontFamily:"'JetBrains Mono',monospace"}}>Example {i+1}: {ex.lbl}</div>
          <CB sql={ex.sql} ann={ex.ann}/>
        </div>)}
      </div>
      <div style={{marginTop:14}}>
        <div style={{fontSize:11,fontWeight:700,color:T.t3,letterSpacing:1.5,marginBottom:8,textTransform:"uppercase"}}>Try any example live</div>
        <Console initSQL={mod.seeit[0]?.sql||""} db={db} compact/>
      </div>
      <ContinueBtn label="Ready to Practice →" onClick={()=>unlock("guided")} color={T.M}/>
    </Step>

    {/* ─── STEP 4: GUIDED PRACTICE ─── */}
    <Step num={4} icon="✍️" label={`Guided Practice (${guidedPassed}/${allGuided} done)`} color={lc} locked={!step.guided} complete={step.usecase}>
      <div style={{color:T.t2,fontSize:13,marginBottom:16,lineHeight:1.65,padding:"10px 13px",background:T.surf,borderRadius:7,border:`1px solid ${T.brd}`}}>
        Scaffolding fades across exercises — the first has the most support, the last has the least. Fill in the <span style={{color:T.A,fontFamily:"'JetBrains Mono',monospace",fontSize:12}}>amber blanks</span> or choose from <span style={{color:T.S,fontFamily:"'JetBrains Mono',monospace",fontSize:12}}>sage dropdowns</span>, then click Check.
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {mod.guided.map((g,i)=>{
          const gFills=guidedFills[i]||{};
          const setGFI=fn=>setGF(f=>({...f,[i]:fn(f[i]||{})}));
          const isPassed=!!guidedDone[i];
          return <div key={i} style={{border:`1.5px solid ${isPassed?lc+"50":T.brd}`,borderRadius:10,overflow:"hidden",transition:"border-color .3s",boxShadow:isPassed?`0 0 14px ${lc}10`:undefined}}>
            <div style={{padding:"9px 14px",background:T.surf,borderBottom:`1px solid ${T.brd}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:6}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${isPassed?lc:T.brd}`,background:isPassed?`${lc}20`:T.s2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:isPassed?lc:T.t3,fontWeight:700,flexShrink:0}}>{isPassed?"✓":i+1}</div>
                <span style={{fontWeight:600,fontSize:13.5,color:T.tx}}>{g.title}</span>
                <span style={{fontSize:9.5,color:T.t3,background:T.s3,padding:"1px 7px",borderRadius:99,border:`1px solid ${T.brd}`}}>Scaffold {Math.round(g.scaffold*100)}%</span>
              </div>
              <Tag label={g.diff} color={DIFF[g.diff]||T.t2} sm/>
            </div>
            <div style={{padding:"12px 14px",background:T.bg}}>
              <div style={{fontSize:13,color:T.t2,marginBottom:10,lineHeight:1.65,padding:"9px 12px",background:T.surf,borderRadius:7,border:`1px solid ${T.brd}`,borderLeft:`3px solid ${lc}`}}>{g.context}</div>
              <TplEd template={g.template} fills={gFills} setFills={setGFI} db={db} checks={g.checks} onPass={()=>setGD(d=>({...d,[i]:true}))}/>
              {/* Hints */}
              {g.hints&&<div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
                {g.hints.map((h,hi)=><div key={hi} style={{fontSize:11,color:T.t3,background:T.s2,padding:"3px 9px",borderRadius:5,border:`1px solid ${T.brd}`}}>💡 {h}</div>)}
              </div>}
              {isPassed&&g.whyItWorks&&<div className="aUp" style={{marginTop:10,padding:"9px 12px",background:"#0e0c00",borderRadius:7,borderLeft:`3px solid ${lc}`,display:"flex",gap:7}}><span style={{flexShrink:0,fontSize:14}}>🔑</span><span style={{color:T.t2,fontSize:12,lineHeight:1.65}}><strong style={{color:lc}}>Why it works: </strong>{g.whyItWorks}</span></div>}
            </div>
          </div>;})}
      </div>
      {guidedPassed===allGuided&&<ContinueBtn label="See Real-World Examples →" onClick={()=>unlock("usecase")} color={lc}/>}
    </Step>

    {/* ─── STEP 5: REAL-WORLD USE CASES ─── */}
    <Step num={5} icon="🌍" label="Real-World Applications" color={T.S} locked={!step.usecase} complete={step.recall}>
      <div style={{color:T.t2,fontSize:13,marginBottom:16,lineHeight:1.65,padding:"10px 13px",background:T.surf,borderRadius:7,border:`1px solid ${T.brd}`}}>
        <strong style={{color:T.S}}>Transfer is the goal of learning.</strong> These are real queries used by analysts at companies like yours — same concepts, authentic business context.
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {mod.usecases.map((uc,i)=>{
          const co=CO[uc.co]; const[open,setOpen]=useState(i===0);
          return <div key={i} style={{border:`1px solid ${open?co.color+"40":T.brd}`,borderRadius:10,overflow:"hidden",transition:"border-color .2s"}}>
            <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"11px 15px",background:open?`${co.color}08`:T.surf,border:"none",cursor:"pointer",textAlign:"left"}}>
              <span style={{fontSize:19,flexShrink:0}}>{uc.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                  <span style={{fontSize:13.5,fontWeight:600,color:T.tx}}>{uc.title}</span>
                  <span style={{fontSize:10,color:co.color,background:`${co.color}18`,padding:"1px 7px",borderRadius:99,border:`1px solid ${co.color}35`}}>{co.icon} {co.name}</span>
                </div>
                <div style={{fontSize:11.5,color:T.t3,marginTop:2}}>{uc.situation.slice(0,70)}{uc.situation.length>70?"…":""}</div>
              </div>
              <span style={{color:T.t3,fontSize:13,transition:"transform .2s",transform:open?"rotate(180deg)":"none",flexShrink:0}}>▾</span>
            </button>
            {open&&<div className="aUp" style={{padding:"0 15px 14px",background:T.bg}}>
              <p style={{fontSize:13,color:T.t2,lineHeight:1.65,margin:"12px 0 10px"}}>{uc.situation}</p>
              <CB sql={uc.sql}/>
              {db&&<div style={{marginTop:8}}><Console initSQL={uc.sql} db={db} compact/></div>}
              <div style={{marginTop:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}} className="sm-col">
                <div style={{padding:"9px 12px",background:T.ok.bg,borderRadius:7,border:`1px solid ${T.ok.brd}`}}>
                  <div style={{fontSize:9.5,fontWeight:700,color:T.S,letterSpacing:1,marginBottom:4,textTransform:"uppercase"}}>Business Result</div>
                  <div style={{fontSize:12,color:T.t2,lineHeight:1.6}}>{uc.result}</div>
                </div>
                <div style={{padding:"9px 12px",background:T.s2,borderRadius:7,border:`1px solid ${T.brd}`,borderLeft:`2px solid ${T.A}`}}>
                  <div style={{fontSize:9.5,fontWeight:700,color:T.A,letterSpacing:1,marginBottom:4,textTransform:"uppercase"}}>Key Insight</div>
                  <div style={{fontSize:12,color:T.t2,lineHeight:1.6}}>{uc.transferPoint}</div>
                </div>
              </div>
            </div>}
          </div>;})}
      </div>
      <ContinueBtn label="Test Your Understanding →" onClick={()=>unlock("recall")} color={T.S}/>
    </Step>

    {/* ─── STEP 6: RECALL (MCQ) ─── */}
    <Step num={6} icon="🧠" label="Test Your Understanding" color={T.M} locked={!step.recall} complete={step.challenge}>
      <div style={{color:T.t2,fontSize:13,marginBottom:16,lineHeight:1.65,padding:"10px 13px",background:T.surf,borderRadius:7,border:`1px solid ${T.brd}`}}>
        <strong style={{color:T.M}}>Retrieval practice</strong> — answering questions from memory strengthens recall far more than re-reading. Answer all questions to continue.
      </div>
      <Recall questions={mod.recall} onAllDone={()=>{setRD(true);unlock("challenge");}}/>
      {recallDone&&<div className="aUp" style={{marginTop:12,padding:"10px 14px",background:T.ok.bg,border:`1px solid ${T.ok.brd}`,borderRadius:8,color:T.ok.tx,fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>✅ All questions answered. The Challenge is now unlocked!</div>}
    </Step>

    {/* ─── STEP 7: CHALLENGE ─── */}
    <Step num={7} icon="🔓" label="The Challenge — Full Autonomy" color={lc} locked={!step.challenge} complete={step.done}>
      <div style={{color:T.t2,fontSize:13,marginBottom:16,lineHeight:1.65,padding:"10px 13px",background:T.surf,borderRadius:7,border:`1px solid ${T.brd}`}}>
        <strong style={{color:lc}}>No scaffolding.</strong> Write the complete query from scratch. This is where real learning happens — struggle productively, use hints if needed.
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {mod.challenge.map((c,i)=><ChallengeEx key={i} ex={c} db={db} lc={lc} onPass={()=>{setCD(true);unlock("done");}}/>)}
      </div>
    </Step>

    {/* ─── STEP 8: COMPLETE ─── */}
    <Step num={8} icon="✅" label="Lesson Complete" color={lc} locked={!step.done} complete={false}>
      <CompleteCard mod={mod} lc={lc} onNext={onNext} hasNext={hasNext}/>
    </Step>

  </div>;
}

/* ─── NAV STRIP (top horizontal) ────────────────────── */
function NavStrip({li,mi,done,nav,winW}){
  const isSm=winW<680;
  const totalMods=COURSE.reduce((a,l)=>a+l.modules.length,0);
  const totalDone=Object.values(done).filter(Boolean).length;
  return <div style={{background:T.surf,borderBottom:`1px solid ${T.brd}`,padding:"0 18px",overflowX:"auto",flexShrink:0,WebkitOverflowScrolling:"touch"}}>
    <div style={{display:"flex",alignItems:"center",height:44,gap:0,minWidth:"max-content"}}>
      {COURSE.map((lv,lvi)=>{const lc=LC[lvi];return <div key={lvi} style={{display:"flex",alignItems:"center",gap:0}}>
        {lvi>0&&<div style={{width:16,height:2,background:`linear-gradient(90deg,${LC[lvi-1]}44,${lc}44)`}}/>}
        {!isSm&&<div style={{padding:"0 7px",display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:9.5,color:lc,fontWeight:700,letterSpacing:.8,textTransform:"uppercase",whiteSpace:"nowrap"}}>{lv.icon} {lv.level}</span></div>}
        {lv.modules.map((m,mii)=>{const k=`${lvi}-${mii}`,isA=lvi===li&&mii===mi,isDone=!!done[k];return <div key={mii} style={{display:"flex",alignItems:"center"}}>
          {mii>0&&<div style={{width:10,height:2,background:isDone?`${lc}66`:T.brd}}/>}
          <button onClick={()=>nav(lvi,mii)} title={m.title} style={{width:isDone?20:isA?24:16,height:isDone?20:isA?24:16,borderRadius:"50%",border:`2px solid ${isA?lc:isDone?lc:T.brd}`,background:isA?`${lc}22`:isDone?`${lc}18`:T.s2,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .25s",flexShrink:0,animation:isA?"glow 2s ease-in-out infinite":undefined,boxShadow:isA?`0 0 0 3px ${lc}20`:undefined}}>
            <span style={{fontSize:isDone?9:isA?10:7,color:isDone?lc:isA?lc:T.t3,fontWeight:700}}>{isDone?"✓":isA?"●":"·"}</span>
          </button>
        </div>;})}
      </div>;})}
      <div style={{marginLeft:"auto",paddingLeft:14,display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
        <Ring pct={Math.round(totalDone/totalMods*100)} color={T.A} size={26} sw={2.5}/>
        {!isSm&&<span style={{fontSize:11,color:T.t2,fontFamily:"'JetBrains Mono',monospace"}}>{totalDone}/{totalMods}</span>}
      </div>
    </div>
  </div>;
}

/* ─── COMMAND PALETTE ────────────────────────────────── */
function CmdPal({db,open,onClose}){
  if(!open)return null;
  return <>
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:800,backdropFilter:"blur(5px)"}}/>
    <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"min(660px,94vw)",maxHeight:"80vh",background:T.surf,border:`1px solid ${T.brd}`,borderRadius:14,zIndex:801,display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,.7)"}}>
      <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.brd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontFamily:"'Fraunces',serif",fontWeight:700,fontSize:16,color:T.tx}}>Workspace</div>
        <button onClick={onClose} style={{background:T.s2,border:`1px solid ${T.brd}`,borderRadius:6,color:T.t2,fontSize:16,padding:"2px 8px",cursor:"pointer"}}>×</button>
      </div>
      <div style={{overflowY:"auto",padding:"14px 18px",display:"flex",flexDirection:"column",gap:16}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:T.t3,letterSpacing:1.5,marginBottom:10,textTransform:"uppercase"}}>📐 Schema</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:6}}>
            {Object.entries(SCHEMA_MAP).map(([t,cols])=><div key={t} style={{padding:"8px 10px",background:T.s2,borderRadius:7,border:`1px solid ${T.brd}`}}>
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:5}}><span style={{width:7,height:7,borderRadius:"50%",background:TC[t]||T.A,display:"inline-block"}}/><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:600,color:TC[t]||T.A}}>{t}</span></div>
              {cols.map(c=><div key={c} style={{fontSize:10,color:T.t3,fontFamily:"'JetBrains Mono',monospace",lineHeight:1.9}}>· {c}</div>)}
            </div>)}
          </div>
        </div>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:T.t3,letterSpacing:1.5,marginBottom:10,textTransform:"uppercase"}}>🏢 Companies</div>
          <div className="sm-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {Object.entries(CO).map(([k,co])=><div key={k} style={{padding:"9px 12px",background:T.s2,borderRadius:7,border:`1px solid ${co.color}25`,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18,flexShrink:0}}>{co.icon}</span><div><div style={{fontSize:12,fontWeight:600,color:co.color}}>{co.name}</div><div style={{fontSize:10.5,color:T.t3}}>{co.role}</div></div></div>)}
          </div>
        </div>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:T.t3,letterSpacing:1.5,marginBottom:10,textTransform:"uppercase"}}>🔬 SQL Playground</div>
          <Console initSQL={"SELECT e.name, d.name AS dept, e.salary\nFROM employees e\nJOIN departments d ON e.dept_id = d.id\nORDER BY e.salary DESC;"} db={db} compact/>
        </div>
      </div>
    </div>
  </>;
}

/* ─── MAIN APP ───────────────────────────────────────── */
export default function App(){
  const[db,setDb]=useState(null); const[dbErr,setDbErr]=useState(null);
  const[li,setLi]=useState(0); const[mi,setMi]=useState(0);
  const[done,setDone]=useState({}); const[cmd,setCmd]=useState(false);
  const mainRef=useRef(); const winW=useWinSize();
  const isSm=winW<640;

  useEffect(()=>{const h=e=>{if((e.ctrlKey||e.metaKey)&&e.key==="k"){e.preventDefault();setCmd(c=>!c);}};document.addEventListener("keydown",h);return()=>document.removeEventListener("keydown",h);},[]);
  useEffect(()=>{(async()=>{try{await new Promise((res,rej)=>{if(window.initSqlJs){res();return;}const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});const SQL=await window.initSqlJs({locateFile:f=>`https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${f}`});const database=new SQL.Database();database.run(SCHEMA_SQL);database.run(SEED_SQL);setDb(database);}catch(e){setDbErr("SQL engine failed to load.");}})();},[]);

  const lv=COURSE[li], mod=lv.modules[mi], lc=lv.color;
  const flatMods=COURSE.flatMap((l,lvi)=>l.modules.map((m,mii)=>({li:lvi,mi:mii,mod:m})));
  const currIdx=flatMods.findIndex(f=>f.li===li&&f.mi===mi);
  const hasNext=currIdx<flatMods.length-1;
  const nav=(a,b)=>{setLi(a);setMi(b);mainRef.current?.scrollTo(0,0);};
  const goNext=()=>{if(hasNext){const n=flatMods[currIdx+1];nav(n.li,n.mi);}};
  const markDone=useCallback(()=>setDone(p=>({...p,[`${li}-${mi}`]:true})),[li,mi]);

  return <div style={{minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column"}}>
    <style>{CSS}</style>

    {/* HEADER */}
    <header style={{background:T.surf,borderBottom:`1px solid ${T.brd}`,height:52,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 18px",flexShrink:0,position:"sticky",top:0,zIndex:300}}>
      <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <div style={{width:33,height:33,borderRadius:8,background:`linear-gradient(135deg,${T.A},${T.R})`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 2px 12px rgba(232,160,32,.3)`}}>
          <span style={{fontFamily:"'Fraunces',serif",fontWeight:900,fontSize:17,color:T.bg,lineHeight:1}}>S</span>
        </div>
        {!isSm&&<div>
          <div style={{fontFamily:"'Fraunces',serif",fontWeight:700,fontSize:15,color:T.tx,letterSpacing:"-.3px",lineHeight:1}}>SQL Mastery</div>
          <div style={{fontSize:8.5,color:T.t3,letterSpacing:".8px",textTransform:"uppercase"}}>Beginner → Expert</div>
        </div>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {/* db indicator — clean, inline */}
        <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",background:T.s2,borderRadius:99,border:`1px solid ${T.brd}`}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:db?T.S:dbErr?T.R:T.A,animation:(!db&&!dbErr)?"pulse 1.5s ease infinite":db?"glow 2s ease-in-out infinite":undefined}}/>
          {!isSm&&<span style={{fontSize:11,color:T.t2}}>{db?"SQLite ready":dbErr?"Error":"Loading…"}</span>}
        </div>
        {/* single workspace button */}
        <button onClick={()=>setCmd(true)} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 14px",background:T.s2,border:`1px solid ${T.brd}`,borderRadius:8,color:T.t2,fontSize:12.5,fontWeight:500,transition:"all .2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=T.A;e.currentTarget.style.color=T.A;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.brd;e.currentTarget.style.color=T.t2;}}>
          <span>⌘</span>{!isSm&&"Workspace"}{!isSm&&<kbd style={{fontSize:9.5,color:T.t3,background:T.s3,padding:"1px 5px",borderRadius:3,border:`1px solid ${T.brd}`,fontFamily:"'JetBrains Mono',monospace"}}>K</kbd>}
        </button>
      </div>
    </header>

    {/* NAV STRIP */}
    <NavStrip li={li} mi={mi} done={done} nav={nav} winW={winW}/>

    {/* MAIN */}
    <main ref={mainRef} style={{flex:1,overflowY:"auto",padding:isSm?"18px 14px 40px":"28px 28px 48px",maxWidth:860,width:"100%",margin:"0 auto",alignSelf:"stretch"}}>
      {/* Module header */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        <Tag label={`${lv.icon} ${lv.level}`} color={lc}/>
        <span style={{color:T.brd,fontSize:16}}>›</span>
        <span style={{fontSize:11.5,color:T.t3}}>Lesson {mi+1} of {lv.modules.length}</span>
        {done[`${li}-${mi}`]&&<Tag label="✓ Complete" color={T.S} sm/>}
      </div>
      <h1 style={{fontFamily:"'Fraunces',serif",fontSize:isSm?22:28,fontWeight:800,margin:"0 0 5px",color:T.tx,lineHeight:1.15,letterSpacing:"-.4px"}}>{mod.title}</h1>
      <p style={{color:T.t2,fontSize:isSm?13:14,margin:`0 0 ${isSm?20:28}px`,fontStyle:"italic"}}>{mod.tagline}</p>

      {/* LESSON — the linear flow */}
      <LessonPage
        key={`${li}-${mi}`}
        mod={mod}
        db={db}
        lc={lc}
        onNext={()=>{markDone();goNext();}}
        hasNext={hasNext}
      />
    </main>

    {/* BOTTOM BAR */}
    <div style={{position:"fixed",bottom:0,left:0,right:0,height:36,background:T.surf,borderTop:`1px solid ${T.brd}`,display:"flex",alignItems:"center",padding:"0 16px",gap:0,zIndex:200,fontSize:11}}>
      <span style={{color:T.t3,fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,marginRight:12}}>{db?"● SQLite":dbErr?"⚠ Error":"⏳"}</span>
      <div style={{flex:1,maxWidth:200}}><PBar pct={Math.round(Object.values(done).filter(Boolean).length/COURSE.reduce((a,l)=>a+l.modules.length,0)*100)} color={lc} h={3}/></div>
      <div style={{flex:1}}/>
      <button onClick={()=>setCmd(true)} style={{background:"none",border:"none",color:T.t3,fontSize:11,cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif",display:"flex",alignItems:"center",gap:5}} onMouseEnter={e=>e.currentTarget.style.color=T.A} onMouseLeave={e=>e.currentTarget.style.color=T.t3}>
        ⌘K Workspace
      </button>
    </div>

    <CmdPal db={db} open={cmd} onClose={()=>setCmd(false)}/>
  </div>;
}
