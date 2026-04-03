-- Supabase Storage Schema
-- This file contains SQL commands to set up storage buckets and RLS policies

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('avatars', 'avatars', true),
  ('trade-screenshots', 'trade-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for avatars bucket
-- Avatar images are publicly accessible (public bucket)
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Users can upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for trade-screenshots bucket
-- Users can view their own screenshots
CREATE POLICY "Users can view their own screenshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'trade-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can upload their own screenshots
CREATE POLICY "Users can upload their own screenshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'trade-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own screenshots
CREATE POLICY "Users can delete their own screenshots"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'trade-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add screenshot_urls column to trades table
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS screenshot_urls TEXT[];

-- Add comment
COMMENT ON COLUMN trades.screenshot_urls IS 'Array of URLs to trade screenshots stored in Supabase Storage';

-- Note: Run this SQL in your Supabase SQL Editor to create the storage buckets and policies