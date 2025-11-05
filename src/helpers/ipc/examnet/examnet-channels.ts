/**
 * IPC channel names for exam.net API communication
 */
export const EXAMNET_CHANNELS = {
  LOGIN: "examnet:login",
  LOGOUT: "examnet:logout",
  GET_TESTS: "examnet:getTests",
  GET_TEST_RESULTS: "examnet:getTestResults",
  GET_STUDENTS: "examnet:getStudents",
  SYNC_DATA: "examnet:syncData",
} as const;
