import { TsoaResponse } from "tsoa";

export type RoleTypeEnum =
  | "ADMIN"
  | "TRAINER"
  | "SUPERVISOR"
  | "TRAINEE"
  | "DEVELOPER"
  | "ADMINISTRATOR"
  | "STAFF";

export interface IResponse<T> {
  statusCode: number;
  message: string;
  error?: unknown;
  data?: T;
}

export interface IPaged<T> {
  data: T;
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  statusCode: number;
  message: string;
  error?: unknown;
}

export interface Paged<T> {
  data: T;
  totalItems: number;
  statusCode: number;
  message: string;
  error?: unknown;
}

export type TUser = {
  id: string;
  email?: string | null;
  fullNames: string;
  password: string;
  phoneNumber: string;
  photo?: Express.Multer.File | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  userRoles?: IUserRole[];
  staff?: IStaff;
  student?: IStudent;
  district: string;
  sector: string;
  cell: string;
  village: string;
  NID?: string | null;
  birthdate?: Date | string | null;
  gender?: string;
};

export interface IUserRole {
  id: string;
  name: RoleType;
  userId: string;
}

export interface IStaff {
  id: string;
  role: string;
}

export interface IStudent {
  id: string;
  role: string;
}
export interface IUserResponse {
  id: string;
  fullNames: string;
  email: string | null;
  userRoles: IUserRole[];
  password: string;
  createdAt: Date;
  phoneNumber: string;
  updatedAt: Date;
  otp: string | null;
  otpExpiresAt: Date | null;
  photo: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  NID?: string | null;
  birthdate?: Date | null | string;
  gender: string | null;
}

export interface UserResponse
  extends Omit<
    IUserResponse,
    | "createdAt"
    | "updatedAt"
    | "userRoles"
    | "password"
    | "phoneNumber"
    | "otp"
    | "otpExpiresAt"
    | "photo"
  > {}

export interface CreateUserDto {
  fullNames: string;
  email?: string | null;
  phoneNumber: string;
  photo?: Express.Multer.File | string | null;
  district: string;
  sector: string;
  cell: string;
  village: string;
  NID?: string | null;
  birthdate?: Date | string | null;
  gender?: string | null;
}

export interface UpdateProfileDto {
  fullNames: string;
  email?: string | null;
  phoneNumber: string;
  photo?: Express.Multer.File | string | null;
  district: string;
  sector: string;
  cell: string;
  village: string;
  NID?: string | null;
  birthdate?: Date | string | null;
  gender?: string | null;
}

export type RoleType = RoleTypeEnum;

export interface IUser extends Omit<TUser, "id" | "createdAt" | "updatedAt"> {}
export interface ILoginResponse
  extends Omit<TUser, "password" | "createdAt" | "updatedAt" | "userRoles"> {
  token: string;
  userRoles: IUserRole[];
}
export interface ILoginUser extends Pick<IUser, "fullNames" | "phoneNumber"> {}

// Password-based login payload (email + password)
export interface IPasswordLogin {
  email: string;
  password: string;
}

export interface ISignUpUser
  extends Pick<IUser, "email" | "fullNames" | "photo" | "phoneNumber"> {
  district: string;
  sector: string;
  cell: string;
  village: string;
  NID?: string | null;
  birthdate?: Date | string | null;
  gender?: string | null;
}

export type TErrorResponse = TsoaResponse<
  400 | 401 | 500,
  IResponse<{ message: string }>
>;

export interface IResponse<T> {
  statusCode: number;
  message: string;
  data?: T;
}

export interface TNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  isRead: boolean;
  actionUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

// Course
export interface CreateCourseDto {
  creatorId: string; // staff id
  title: string;
  coverIcon: string;
  description?: string | null;
  isPublished?: boolean;
}
export interface TCourseResponse {
  id: string;
  creatorId: string;
  title: string;
  coverIcon: string;
  description?: string | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Section
export interface CreateSectionDto {
  courseId: string;
  title: string;
  description?: string | null;
}
export interface TSectionResponse {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  totalChapter: number;
  createdAt: Date;
  updatedAt: Date;
}

// Chapter
export interface CreateChapterDto {
  sectionId: string;
  title: string;
  description?: string | null;
  chapterNumber?: number;
  activityAt?: number;
  lessonDuration?: number;
  isPublished?: boolean;
}
export interface TChapterResponse {
  id: string;
  sectionId: string;
  title: string;
  description?: string | null;
  totalSlide: number;
  chapterNumber: number;
  activityAt?: number | null;
  lessonDuration: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Slide
export interface CreateSlideDto {
  chapterId: string;
  note?: string | null;
  description?: string | null;
  slideNumber: number;
  file?: string | null;
  isPublished?: boolean;
}
export interface TSlideResponse {
  id: string;
  chapterId: string;
  note?: string | null;
  description?: string | null;
  slideNumber: number;
  file?: string | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// CourseIntro
export interface CreateCourseIntroDto {
  courseId: string;
  title: string;
  summary: string;
  bannerImage?: string | null;
  thumbnail: string;
}
export interface TCourseIntroResponse {
  id: string;
  courseId: string;
  title: string;
  summary: string;
  bannerImage?: string | null;
  thumbnail: string;
  createdAt: Date;
  updatedAt: Date;
}

// Tests
export interface CreatePreTestDto {
  sectionId: string;
  questionToBeAnswered: number;
  marksToPass: number;
  description?: string;
  isPublished?: boolean;
}
export interface TPreTestResponse {
  id: string;
  sectionId: string;
  questionToBeAnswered: number;
  marksToPass: number;
  description?: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMidTestDto {
  chapterId: string;
  questionToBeAnswered: number;
  marksToPass: number;
  description?: string;
}
export interface TMidTestResponse {
  id: string;
  chapterId: string;
  questionToBeAnswered: number;
  marksToPass: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFinalTestDto {
  chapterId: string;
  questionToBeAnswered: number;
  marksToPass: number;
  description?: string;
  isPublished?: boolean;
}
export interface TFinalTestResponse {
  id: string;
  chapterId: string;
  questionToBeAnswered: number;
  marksToPass: number;
  description?: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Questionnaire / Option / Answer
export interface CreateQuestionnaireDto {
  question: string;
  questionImage?: string | null;
  allowMultiple?: boolean;
  preTestId?: string | null;
  midTestId?: string | null;
  finalTestId?: string | null;
}
export interface TQuestionnaireResponse {
  id: string;
  question: string;
  questionImage?: string | null;
  allowMultiple: boolean;
  options: TOptionResponse[];
  answers: TAnswerResponse[];
  preTestId?: string | null;
  midTestId?: string | null;
  finalTestId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOptionDto {
  label: string;
  image?: string | null;
  questionnaireId: string;
}
export interface TOptionResponse {
  id: string;
  label: string;
  image?: string | null;
  questionnaireId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAnswerDto {
  label: string;
  image?: string | null;
  questionnaireId: string;
}
export interface TAnswerResponse {
  id: string;
  label: string;
  image?: string | null;
  questionnaireId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Super Course Creation DTOs - Complex nested structure
export interface SuperCourseOptionDto {
  label: string;
  image?: string;
}

export interface SuperCourseAnswerDto {
  label: string;
  image?: string;
}

export interface SuperCourseQuestionDto {
  question: string;
  questionImage?: string;
  allowMultiple: boolean;
  options: SuperCourseOptionDto[];
  correctAnswer?: SuperCourseAnswerDto;
  correctAnswers?: number[];
  correctAnswerIndex?: number;
}

export interface SuperCourseActivityInstructionDto {
  questionToBeAnswered: number;
  marksToPass: number;
  description: string;
}

export interface SuperCourseActivityDto {
  instruction: SuperCourseActivityInstructionDto;
  questions: SuperCourseQuestionDto[];
}

export interface SuperCourseSlideDto {
  note?: string;
  description?: string;
  slideNumber: number;
  file?: string;
  isPublished?: boolean;
  isActivitySlide?: boolean;
  isPreTestSlide?: boolean;
  isFinalTestSlide?: boolean;
  activity?: SuperCourseActivityDto;
}

export interface SuperCourseChapterDto {
  title: string;
  description?: string;
  chapterNumber?: number;
  activityAt?: number;
  lessonDuration?: number;
  isPublished?: boolean;
  slides: SuperCourseSlideDto[];
  finalTestSlide?: SuperCourseSlideDto;
}

export interface SuperCourseSectionDto {
  title: string;
  description?: string;
  preTestSlide?: SuperCourseSlideDto;
  chapters: SuperCourseChapterDto[];
}

export interface SuperCourseCourseIntroDto {
  title: string;
  summary: string;
  bannerImage?: string;
  thumbnail: string;
}

export interface CreateSuperCourseDto {
  title: string;
  coverIcon: string;
  description?: string;
  isPublished?: boolean;
  courseIntro: SuperCourseCourseIntroDto;
  sections: SuperCourseSectionDto[];
}

export interface UpdateSuperCourseDto extends CreateSuperCourseDto {
  courseId: string;
}

// Attempt Test
export interface CreateAttempTestDto {
  preTestId?: string | null;
  midTestId?: string | null;
  finalTestId?: string | null;
  tryCount?: number;
  studentId: string;
  questionAnswers?: Array<{
    questionnaireId: string;
    selectedAnswerIds: string[];
  }>;
}
export interface TAttempTestResponse {
  id: string;
  studentId: string;
  preTestId?: string | null;
  midTestId?: string | null;
  finalTestId?: string | null;
  tryCount: number;
  marks: number;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAttemptAnswerDto {
  attemptId: string;
  questionnaireId: string;
  selectedAnswerIds: string[];
}
export interface TAttemptAnswerResponse {
  id: string;
  attemptId: string;
  questionnaireId: string;
  selectedAnswerIds: string[];
  isCorrect: boolean;
  marks: number;
  createdAt: Date;
  updatedAt: Date;
}

// Progress
export interface CreateCourseProgressDto {
  courseId: string;
  studentId: string;
  progress?: number;
  isCompleted: boolean;
}
export interface TCourseProgressResponse {
  id: string;
  studentId: string;
  courseId: string;
  progress: number;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateChapterProgressDto {
  studentId: string;
  chapterId: string;
  progress?: number;
  isCompleted: boolean;
}
export interface TChapterProgressResponse {
  id: string;
  studentId: string;
  chapterId: string;
  progress: number;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSlideProgressDto {
  slideId: string;
  isCompleted: boolean;
}
export interface TSlideProgressResponse {
  id: string;
  studentId: string;
  slideId: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Slide-related
export interface CreateDocumentOnSlideDto {
  fileName: string;
  file: string;
  chapterId: string;
}
export interface TDocumentOnSlideResponse {
  id: string;
  fileName: string;
  file: string;
  chapterId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFAQOnSlideDto {
  userId: string;
  slideId: string;
  message: string;
  isPublished?: boolean;
}
export interface TFAQOnSlideResponse {
  id: string;
  userId: string;
  slideId: string;
  message: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStudentOnSlideDto {
  studentId: string;
  slideId: string;
  progress?: number;
}
export interface TStudentOnSlideResponse {
  id: string;
  studentId: string;
  slideId: string;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

// Student / Staff
export interface CreateStudentDto {
  userId: string;
  role?: RoleTypeEnum;
}
export interface TStudentResponse {
  id: string;
  userId: string;
  role: RoleTypeEnum;
}

export interface CreateStaffDto {
  userId: string;
  role?: RoleTypeEnum;
}
export interface TStaffResponse {
  id: string;
  userId: string;
  role: RoleTypeEnum;
}
