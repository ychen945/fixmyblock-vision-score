-- Add new values to the report_type enum
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'animals';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'consumer_employee_protection';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'covid_19_assistance';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'disabilities';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'garbage_recycling';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'health';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'home_buildings';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'parks_trees_environment';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'public_safety';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'seniors';
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'transportation_streets';