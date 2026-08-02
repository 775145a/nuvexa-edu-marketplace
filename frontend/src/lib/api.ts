const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

async function request<T = any>(path: string, options: RequestInit = {}): Promise<{ success: boolean; data: T; message?: string }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401 && token) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('sessionToken');
    if (typeof window !== 'undefined') window.location.href = '/login';
  }

  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Request failed');
  return json;
}

export const authApi = {
  register: (data: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  verifyOtp: (data: any) => request('/auth/verify-otp', { method: 'POST', body: JSON.stringify(data) }),
  resendOtp: (data: any) => request('/auth/resend-otp', { method: 'POST', body: JSON.stringify(data) }),
  refresh: (data: any) => request('/auth/refresh', { method: 'POST', body: JSON.stringify(data) }),
  logout: (data: any) => request('/auth/logout', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),
};

export const courseApi = {
  list: (params?: any) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/courses${q}`);
  },
  getBySlug: (slug: string) => request(`/courses/${slug}`),
  getById: (id: string) => request(`/courses/id/${id}`),
  getManage: (id: string) => request(`/courses/manage/${id}`),
  getProgress: (id: string) => request(`/courses/${id}/progress`),
  create: (data: any) => request('/courses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request(`/courses/${id}`, { method: 'DELETE' }),
  submitReview: (id: string) => request(`/courses/${id}/submit-review`, { method: 'POST', body: JSON.stringify({}) }),
};

export const storageApi = {
  upload: (file: File, entity: string, onProgress?: (percent: number) => void, query?: Record<string, string>): Promise<any> => {
    return new Promise((resolve, reject) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const form = new FormData();
      form.append('file', file);

      const xhr = new XMLHttpRequest();
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      const qs = new URLSearchParams({ entity });
      if (query) {
        for (const [k, v] of Object.entries(query)) qs.set(k, v);
      }
      xhr.open('POST', `${api}/storage/upload?${qs.toString()}`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        try {
          const json = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && json.success) resolve(json.data);
          else reject(new Error(json.message || 'Upload failed'));
        } catch {
          reject(new Error('Upload failed'));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(form);
    });
  },
  sign: (key: string, downloadName?: string) =>
    request('/storage/sign', { method: 'POST', body: JSON.stringify({ key, downloadName }) }),
};

export const sectionApi = {
  list: (courseId: string) => request(`/courses/${courseId}/sections`),
  create: (courseId: string, data: any) => request(`/courses/${courseId}/sections`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request(`/sections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request(`/sections/${id}`, { method: 'DELETE' }),
  addLecture: (sectionId: string, data: any) => request(`/sections/${sectionId}/lectures`, { method: 'POST', body: JSON.stringify(data) }),
  listLectures: (sectionId: string) => request(`/sections/${sectionId}/lectures`),
};

export const lectureApi = {
  update: (id: string, data: any) => request(`/lectures/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request(`/lectures/${id}`, { method: 'DELETE' }),
  progress: (id: string, data: any) => request(`/lectures/${id}/progress`, { method: 'PUT', body: JSON.stringify(data) }),
  addResource: (lectureId: string, data: any) => request(`/lectures/${lectureId}/resources`, { method: 'POST', body: JSON.stringify(data) }),
};

export const assignmentApi = {
  list: (courseId: string) => request(`/courses/${courseId}/assignments`),
  create: (courseId: string, data: any) => request(`/courses/${courseId}/assignments`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request(`/assignments/${id}`, { method: 'DELETE' }),
  submissions: (id: string) => request(`/assignments/${id}/submissions`),
  grade: (id: string, data: any) => request(`/assignment-submissions/${id}/grade`, { method: 'PUT', body: JSON.stringify(data) }),
  submit: (id: string, data: any) => request(`/assignments/${id}/submit`, { method: 'POST', body: JSON.stringify(data) }),
};

export const examApi = {
  create: (courseId: string, data: any) => request(`/courses/${courseId}/exams`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request(`/exams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request(`/exams/${id}`, { method: 'DELETE' }),
  get: (id: string) => request(`/exams/${id}`),
  addQuestion: (examId: string, data: any) => request(`/exams/${examId}/questions`, { method: 'POST', body: JSON.stringify(data) }),
  updateQuestion: (id: string, data: any) => request(`/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuestion: (id: string) => request(`/questions/${id}`, { method: 'DELETE' }),
  submit: (examId: string, data: any) => request(`/exams/${examId}/submit`, { method: 'POST', body: JSON.stringify(data) }),
  results: (examId: string) => request(`/exams/${examId}/results`),
  myResult: (examId: string) => request(`/exams/${examId}/my-result`),
};

export const categoryApi = {
  list: () => request('/categories'),
};

export const statsApi = {
  get: () => request('/stats'),
};

export const SUPPORT_PHONE = '01003677165';
export const SUPPORT_PHONE_INTL = '201003677165';
export const WHATSAPP_LINK = (message: string) =>
  `https://wa.me/${SUPPORT_PHONE_INTL}?text=${encodeURIComponent(message)}`;

export const videoJobApi = {
  get: (id: string) => request(`/video-jobs/${id}`),
  my: () => request('/video-jobs/my'),
};

export const orderApi = {
  create: (data: any) => request('/orders/create', { method: 'POST', body: JSON.stringify(data) }),
  initiate: (data: any) => request('/orders/initiate', { method: 'POST', body: JSON.stringify(data) }),
  verifyPayment: (data: any) => request('/orders/verify-payment', { method: 'POST', body: JSON.stringify(data) }),
  paymentStatus: (id: string) => request(`/orders/${id}/status`),
  myOrders: () => request('/orders/my'),
};

export const couponApi = {
  apply: (code: string, courseId: string) => request(`/coupons/apply?code=${encodeURIComponent(code)}&courseId=${encodeURIComponent(courseId)}`),
};

export const qaApi = {
  questions: (lectureId: string) => request(`/lectures/${lectureId}/questions`),
  ask: (lectureId: string, body: string) => request(`/lectures/${lectureId}/questions`, { method: 'POST', body: JSON.stringify({ body }) }),
  reply: (questionId: string, body: string) => request(`/questions/${questionId}/reply`, { method: 'POST', body: JSON.stringify({ body }) }),
  delete: (id: string) => request(`/comments/${id}`, { method: 'DELETE' }),
};

export const adminApi = {
  dashboard: () => request('/admin/dashboard'),
  courses: () => request('/admin/courses'),
  pendingCourses: () => request('/admin/courses/pending'),
  courseDetail: (id: string) => request(`/admin/courses/${id}`),
  reviewCourse: (id: string, data: any) => request(`/admin/courses/${id}/review`, { method: 'PUT', body: JSON.stringify(data) }),
  monitoring: () => request('/admin/monitoring'),
  users: () => request('/admin/users'),
  userDetail: (id: string) => request(`/admin/users/${id}`),
  toggleUserStatus: (id: string) => request(`/admin/users/${id}/toggle-status`, { method: 'PUT' }),
  orders: () => request('/admin/orders'),
  pendingPayments: () => request('/admin/payments/pending'),
  confirmPayment: (paymentId: string, action: 'confirm' | 'reject') => request('/admin/payments/confirm', { method: 'POST', body: JSON.stringify({ paymentId, action }) }),
  categories: () => request('/admin/categories'),
  createCategory: (data: any) => request('/admin/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: any) => request(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: string) => request(`/admin/categories/${id}`, { method: 'DELETE' }),
  settings: () => request('/admin/settings'),
  updateSetting: (key: string, value: string) => request(`/admin/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
  instructors: () => request('/admin/instructors'),
  verifyInstructor: (id: string, verified: boolean) => request(`/admin/instructors/${id}/verify`, { method: 'PUT', body: JSON.stringify({ verified }) }),
};

export const instructorApi = {
  courses: () => request('/courses/mine'),
  dashboard: () => request('/instructor/dashboard'),
};

export const studentApi = {
  enrolled: () => request('/enrolled'),
  checkEnrolled: (courseId: string) => request(`/enrolled/${courseId}`),
  dashboard: () => request('/student/dashboard'),
};

export const notificationApi = {
  list: () => request('/notifications'),
  markAllRead: () => request('/notifications/read-all', { method: 'PUT' }),
};
