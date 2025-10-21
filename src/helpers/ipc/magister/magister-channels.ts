export const MAGISTER_CHANNELS = {
  AUTHENTICATE: "magister:authenticate",
  GET_TODAY_INFO: "magister:getTodayInfo",
  GET_USER_INFO: "magister:getUserInfo",
  LOGOUT: "magister:logout",
  IS_AUTHENTICATED: "magister:isAuthenticated",
  TEST_API: "magister:testAPI",
  GET_ALL_STUDENTS: "magister:getAllStudents",
  CLEAR_TOKEN: "magister:clearToken",
  FETCH_STUDENT_PHOTO: "magister:fetchStudentPhoto",
} as const;
