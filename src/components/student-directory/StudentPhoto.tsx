import { useState, useEffect } from "react";
import type { Student } from "../../services/student-database";
import { logger } from "../../utils/logger";

// Simple cache to prevent duplicate photo requests
const photoCache = new Map<
  string,
  Promise<{ success: boolean; data?: string; error?: string }>
>();

interface StudentPhotoProps {
  student: Student;
  size?: "small" | "normal" | "large";
}

export function StudentPhoto({ student, size = "normal" }: StudentPhotoProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const getInitials = () => {
    return student.voorletters || student.roepnaam.charAt(0).toUpperCase();
  };

  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      try {
        setImageLoading(true);
        setImageError(false);
        setImageSrc(null);

        const externeId = student.externeId;
        if (!externeId) {
          logger.debug(
            `⚠️ Student ${student.id} has no externeId, cannot load photo`,
          );
          setImageError(true);
          setImageLoading(false);
          return;
        }

        logger.debug(`🖼️ Loading photo for student ${externeId}`);

        // First, try to get from persistent cache
        const cachedResponse = await window.studentDBAPI.getPhoto(externeId);
        if (cachedResponse.success && cachedResponse.data && mounted) {
          logger.debug(`📦 Using cached photo for student ${externeId}`);
          setImageSrc(cachedResponse.data);
          setImageLoading(false);
          return;
        }

        // If not in cache, fetch from API
        let photoPromise = photoCache.get(externeId);
        if (!photoPromise) {
          photoPromise = window.magisterAPI.fetchStudentPhoto(student.id);
          photoCache.set(externeId, photoPromise);
        }

        const response = await photoPromise;

        if (response.success && response.data && mounted) {
          const dataUrl = response.data as string;
          setImageSrc(dataUrl);

          // Save to persistent cache using externeId
          await window.studentDBAPI.savePhoto(externeId, dataUrl);
          logger.debug(`✅ Photo fetched and cached for student ${externeId}`);
        } else if (mounted) {
          logger.debug(
            `❌ No photo data for student ${externeId}:`,
            response.error,
          );
          setImageError(true);
        }
      } catch (err) {
        logger.debug(
          `💥 Failed to load photo for student ${student.externeId}:`,
          err,
        );
        if (mounted) {
          setImageError(true);
        }
      } finally {
        if (mounted) {
          setImageLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      mounted = false;
    };
  }, [student.id, student.externeId]);

  const sizeClasses =
    size === "small"
      ? "h-8 w-8 text-xs"
      : size === "large"
        ? "h-20 w-20 text-base"
        : "h-16 w-16 text-sm";

  if (imageError) {
    logger.debug(
      `🎭 Showing fallback avatar for student ${student.id} (error: ${imageError})`,
    );
    return (
      <div
        className={`border-muted flex ${sizeClasses} items-center justify-center rounded-full border-2 bg-linear-to-br from-blue-400 to-purple-500 font-semibold text-white shadow-sm`}
      >
        {getInitials()}
      </div>
    );
  }

  if (!imageSrc) {
    logger.debug(`⏳ Waiting for image source for student ${student.id}`);
    return (
      <div
        className={`bg-muted border-muted ${sizeClasses} animate-pulse rounded-full border-2`}
      ></div>
    );
  }

  logger.debug(
    `🖼️ Rendering image for student ${student.id}: ${imageSrc.substring(0, 50)}...`,
  );
  return (
    <div className="relative">
      {imageLoading && (
        <div
          className={`bg-muted border-muted ${sizeClasses} animate-pulse rounded-full border-2`}
        ></div>
      )}
      <img
        src={imageSrc}
        alt={`${student.roepnaam} ${student.achternaam}`}
        className={`border-muted ${sizeClasses} rounded-full border-2 object-cover shadow-sm transition-opacity ${imageLoading ? "opacity-0" : "opacity-100"}`}
        onLoad={() => {
          logger.debug(
            `✅ Image loaded successfully for student ${student.id}`,
          );
          setImageLoading(false);
        }}
        onError={(e) => {
          logger.debug(
            `❌ Image failed to load for student ${student.id}:`,
            e.currentTarget.src,
          );
          setImageError(true);
        }}
      />
    </div>
  );
}
