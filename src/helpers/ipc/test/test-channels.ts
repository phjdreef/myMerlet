/**
 * IPC Channel names for test/grade operations
 */

export const TEST_CHANNELS = {
  // Test operations
  GET_ALL_TESTS: "test:get-all",
  GET_TESTS_FOR_CLASS: "test:get-for-class",
  GET_TEST: "test:get",
  CREATE_TEST: "test:create",
  UPDATE_TEST: "test:update",
  DELETE_TEST: "test:delete",

  // Grade operations
  GET_GRADES_FOR_TEST: "test:get-grades-for-test",
  GET_GRADES_FOR_STUDENT: "test:get-grades-for-student",
  SAVE_GRADE: "test:save-grade",
  SAVE_COMPOSITE_GRADE: "test:save-composite-grade",
  GET_TEST_STATISTICS: "test:get-statistics",
} as const;
