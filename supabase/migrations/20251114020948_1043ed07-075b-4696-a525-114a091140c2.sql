-- Fix the update_block_need_score function to handle both reports and upvotes tables
CREATE OR REPLACE FUNCTION public.update_block_need_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  affected_block_id uuid;
BEGIN
  -- Determine which table triggered this and get the appropriate block_id
  IF TG_TABLE_NAME = 'reports' THEN
    -- For reports table, the block_id is directly in the row
    IF TG_OP = 'DELETE' THEN
      affected_block_id := OLD.block_id;
    ELSE
      affected_block_id := NEW.block_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'upvotes' THEN
    -- For upvotes table, we need to look up the block_id from the report
    IF TG_OP = 'DELETE' THEN
      SELECT r.block_id INTO affected_block_id
      FROM public.reports r
      WHERE r.id = OLD.report_id;
    ELSE
      SELECT r.block_id INTO affected_block_id
      FROM public.reports r
      WHERE r.id = NEW.report_id;
    END IF;
  END IF;

  -- Only update if we found a block_id
  IF affected_block_id IS NOT NULL THEN
    -- Update the need score for the block (count of open reports + upvotes)
    UPDATE public.blocks
    SET need_score = (
      SELECT COUNT(r.id) * 10 + COALESCE(SUM(upvote_count), 0)
      FROM public.reports r
      LEFT JOIN (
        SELECT report_id, COUNT(*) as upvote_count
        FROM public.upvotes
        GROUP BY report_id
      ) u ON r.id = u.report_id
      WHERE r.block_id = affected_block_id
        AND r.status = 'open'
    )
    WHERE id = affected_block_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;