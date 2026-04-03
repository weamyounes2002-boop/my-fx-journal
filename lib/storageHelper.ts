import { supabase, isSupabaseConfigured } from './supabase';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload user avatar to Supabase Storage
 * @param userId - User ID
 * @param file - Image file to upload
 * @returns Upload result with public URL
 */
export async function uploadAvatar(userId: string, file: File): Promise<UploadResult> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase is not configured' };
  }

  // Validate file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return { success: false, error: 'Invalid file type. Please upload an image (JPG, PNG, GIF, or WebP)' };
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { success: false, error: 'File size exceeds 5MB limit' };
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/avatar.${fileExt}`;

    // Upload file (upsert to replace existing)
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { 
        upsert: true,
        contentType: file.type
      });

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return { success: true, url: data.publicUrl };
  } catch (error) {
    console.error('Unexpected error uploading avatar:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Upload trade screenshot to Supabase Storage
 * @param userId - User ID
 * @param tradeId - Trade ID
 * @param file - Image file to upload
 * @returns Upload result with public URL
 */
export async function uploadTradeScreenshot(
  userId: string,
  tradeId: string,
  file: File
): Promise<UploadResult> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase is not configured' };
  }

  // Validate file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return { success: false, error: 'Invalid file type. Please upload an image (JPG, PNG, GIF, or WebP)' };
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { success: false, error: 'File size exceeds 5MB limit' };
  }

  try {
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const fileName = `${userId}/${tradeId}_${timestamp}.${fileExt}`;

    // Upload file
    const { error: uploadError } = await supabase.storage
      .from('trade-screenshots')
      .upload(fileName, file, {
        contentType: file.type
      });

    if (uploadError) {
      console.error('Error uploading screenshot:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data } = supabase.storage
      .from('trade-screenshots')
      .getPublicUrl(fileName);

    return { success: true, url: data.publicUrl };
  } catch (error) {
    console.error('Unexpected error uploading screenshot:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Delete a file from Supabase Storage
 * @param bucket - Bucket name ('avatars' or 'trade-screenshots')
 * @param filePath - Full file path in storage
 * @returns Success status
 */
export async function deleteFile(bucket: string, filePath: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured');
    return false;
  }

  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error deleting file:', error);
    return false;
  }
}

/**
 * Extract file path from Supabase Storage URL
 * @param url - Full Supabase Storage URL
 * @param bucket - Bucket name
 * @returns File path or null
 */
export function extractFilePathFromUrl(url: string, bucket: string): string | null {
  try {
    // URL format: https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/[path]
    const parts = url.split(`/storage/v1/object/public/${bucket}/`);
    if (parts.length === 2) {
      return parts[1];
    }
    return null;
  } catch (error) {
    console.error('Error extracting file path:', error);
    return null;
  }
}

/**
 * Delete avatar for a user
 * @param userId - User ID
 * @param avatarUrl - Current avatar URL
 * @returns Success status
 */
export async function deleteAvatar(userId: string, avatarUrl: string): Promise<boolean> {
  const filePath = extractFilePathFromUrl(avatarUrl, 'avatars');
  if (!filePath) {
    console.error('Could not extract file path from URL');
    return false;
  }

  return await deleteFile('avatars', filePath);
}

/**
 * Delete trade screenshot
 * @param userId - User ID
 * @param screenshotUrl - Screenshot URL
 * @returns Success status
 */
export async function deleteTradeScreenshot(userId: string, screenshotUrl: string): Promise<boolean> {
  const filePath = extractFilePathFromUrl(screenshotUrl, 'trade-screenshots');
  if (!filePath) {
    console.error('Could not extract file path from URL');
    return false;
  }

  return await deleteFile('trade-screenshots', filePath);
}

/**
 * Validate image file
 * @param file - File to validate
 * @returns Validation result
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please upload an image (JPG, PNG, GIF, or WebP)' };
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 5MB limit' };
  }

  return { valid: true };
}

/**
 * Format file size for display
 * @param bytes - File size in bytes
 * @returns Formatted string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}