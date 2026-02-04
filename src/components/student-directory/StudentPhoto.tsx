import { useState, useEffect } from "react";
import type { Student } from "@/services/student-database";
import { logger } from "@/utils/logger";
import {
  formatStudentInitials,
  formatStudentName,
} from "@/helpers/student_helpers";

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

  const getInitials = () => formatStudentInitials(student);

  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      try {
        setImageLoading(true);
        setImageError(false);
        setImageSrc(null);

        const studentId = student.id;
        if (!studentId) {
          logger.debug(`⚠️ Student has no id, cannot load photo`);
          setImageError(true);
          setImageLoading(false);
          return;
        }

        logger.debug(`🖼️ Loading photo for student ${studentId}`);

        // Get from persistent cache only
        const cachedResponse = await window.studentDBAPI.getPhoto(studentId);
        if (cachedResponse.success && cachedResponse.data && mounted) {
          logger.debug(`📦 Using cached photo for student ${studentId}`);
          setImageSrc(cachedResponse.data);
          setImageLoading(false);
        } else if (mounted) {
          logger.debug(`❌ No cached photo for student ${studentId}`);
          setImageError(true);
          setImageLoading(false);
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
        ? "h-16 w-16 text-sm"
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
        className={`border-muted bg-white ${sizeClasses} animate-pulse rounded-full border-2`}
      ></div>
    );
  }

  logger.debug(
    `🖼️ Rendering image for student ${student.id}: ${imageSrc.substring(0, 50)}...`,
  );
  return (
    <div className="group relative">
      {imageLoading && (
        <div
          className={`border-muted bg-white ${sizeClasses} animate-pulse rounded-full border-2`}
        ></div>
      )}
      <div className={`bg-white ${sizeClasses} rounded-full`}>
        <img
          src={imageSrc}
          alt={formatStudentName(student)}
          className={`border-muted ${sizeClasses} rounded-full border-2 object-cover shadow-sm transition-all duration-200 ${imageLoading ? "opacity-0" : "opacity-100"} ${
            size === "small"
              ? "group-hover:z-50 group-hover:scale-[4] group-hover:shadow-2xl"
              : size === "large"
                ? "group-hover:z-50 group-hover:scale-150 group-hover:shadow-2xl"
                : ""
          }`}
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
    </div>
  );
}
