export const STUDENT_DB_CHANNELS = {
  SAVE_STUDENTS: "studentDB:saveStudents",
  GET_ALL_STUDENTS: "studentDB:getAllStudents",
  SEARCH_STUDENTS: "studentDB:searchStudents",
  GET_METADATA: "studentDB:getMetadata",
  CLEAR_ALL_DATA: "studentDB:clearAllData",
  SAVE_PHOTO: "studentDB:savePhoto",
  GET_PHOTO: "studentDB:getPhoto",
  // Property Definitions
  GET_PROPERTY_DEFINITIONS: "studentDB:getPropertyDefinitions",
  SAVE_PROPERTY_DEFINITION: "studentDB:savePropertyDefinition",
  DELETE_PROPERTY_DEFINITION: "studentDB:deletePropertyDefinition",
  // Property Values
  GET_PROPERTY_VALUES: "studentDB:getPropertyValues",
  SAVE_PROPERTY_VALUE: "studentDB:savePropertyValue",
  // Notes
  GET_NOTE: "studentDB:getNote",
  SAVE_NOTE: "studentDB:saveNote",
} as const;
