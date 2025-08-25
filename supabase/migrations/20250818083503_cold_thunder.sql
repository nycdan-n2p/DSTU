/*
  # Add image_url column to custom_questions table

  1. Changes
    - Add `image_url` column to `custom_questions` table to store uploaded question images
    - Column is nullable since not all questions need images
    - Add index for better query performance when filtering by image presence

  2. Security
    - Maintain existing RLS policies
    - No breaking changes to existing data
*/

-- Add image_url column to custom_questions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custom_questions' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE custom_questions ADD COLUMN image_url text;
  END IF;
END $$;

-- Add index for better performance when querying questions with images
CREATE INDEX IF NOT EXISTS idx_custom_questions_image_url ON custom_questions(image_url) WHERE image_url IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN custom_questions.image_url IS 'URL of uploaded image associated with the question (optional)';