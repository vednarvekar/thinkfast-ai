import axios from "axios";

const instance = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4004"}/api`,
  withCredentials: true,
});

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("[axios] request failed", {
      baseURL: error.config?.baseURL,
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      responseData: error.response?.data,
      code: error.code,
      message: error.message,
    });

    return Promise.reject(error);
  }
);

export default instance;
