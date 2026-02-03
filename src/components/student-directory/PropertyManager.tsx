import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StudentPropertyDefinition } from "@/services/student-database";
import { studentDB } from "@/services/student-database";
import { Trash2, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { logger } from "@/utils/logger";

interface PropertyManagerProps {
  className: string;
  schoolYear: string;
  properties: StudentPropertyDefinition[];
  onPropertiesChange: () => void;
}

export function PropertyManager({
  className,
  schoolYear,
  properties,
  onPropertiesChange,
}: PropertyManagerProps) {
  const { t } = useTranslation();
  const [newPropertyName, setNewPropertyName] = useState("");
  const [newPropertyType, setNewPropertyType] = useState<
    "boolean" | "text" | "letter" | "number"
  >("text");

  const handleAddProperty = async () => {
    if (!newPropertyName.trim()) {
      return;
    }

    try {
      const newProperty: StudentPropertyDefinition = {
        id: `prop_${Date.now()}`,
        className,
        schoolYear,
        name: newPropertyName.trim(),
        type: newPropertyType,
        order: properties.length,
      };

      await studentDB.savePropertyDefinition(newProperty);
      setNewPropertyName("");
      setNewPropertyType("text");
      onPropertiesChange();
    } catch (error) {
      logger.error("Failed to add property:", error);
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    try {
      await studentDB.deletePropertyDefinition(propertyId);
      onPropertiesChange();
    } catch (error) {
      logger.error("Failed to delete property:", error);
    }
  };

  const handleMoveProperty = async (property: StudentPropertyDefinition, direction: "up" | "down") => {
    const currentIndex = properties.findIndex((p) => p.id === property.id);
    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === properties.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const otherProperty = properties[newIndex];

    try {
      // Swap orders
      await studentDB.savePropertyDefinition({
        ...property,
        order: otherProperty.order,
      });
      await studentDB.savePropertyDefinition({
        ...otherProperty,
        order: property.order,
      });
      onPropertiesChange();
    } catch (error) {
      logger.error("Failed to reorder property:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">{t("customProperties")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("customPropertiesDescription")}
        </p>
      </div>

      {/* Existing Properties */}
      {properties.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">{t("existingProperties")}</h4>
          <div className="space-y-1">
            {properties.map((property, index) => (
              <div
                key={property.id}
                className="flex items-center gap-2 bg-background rounded-md border p-2"
              >
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-sm font-medium">{property.name}</span>
                  <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                    {t(`propertyType_${property.type}`)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveProperty(property, "up")}
                    disabled={index === 0}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveProperty(property, "down")}
                    disabled={index === properties.length - 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteProperty(property.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Property */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">{t("addNewProperty")}</h4>
        <div className="flex gap-2">
          <Input
            placeholder={t("propertyNamePlaceholder")}
            value={newPropertyName}
            onChange={(e) => setNewPropertyName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddProperty();
              }
            }}
            className="flex-1"
          />
          <select
            value={newPropertyType}
            onChange={(e) =>
              setNewPropertyType(
                e.target.value as "boolean" | "text" | "letter" | "number",
              )
            }
            className="px-3 py-2 border rounded-md bg-background text-sm"
          >
            <option value="text">{t("propertyType_text")}</option>
            <option value="boolean">{t("propertyType_boolean")}</option>
            <option value="letter">{t("propertyType_letter")}</option>
            <option value="number">{t("propertyType_number")}</option>
          </select>
          <Button onClick={handleAddProperty} disabled={!newPropertyName.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            {t("add")}
          </Button>
        </div>
      </div>
    </div>
  );
}
