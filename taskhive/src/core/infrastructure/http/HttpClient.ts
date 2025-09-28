import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { HttpClient, ApiResponse, RequestConfig, ApiError } from './ApiResponse';
import { NetworkError } from '../../../shared/errors/NetworkError';

export class AxiosHttpClient implements HttpClient {
  private axiosInstance: AxiosInstance;

  constructor(baseURL: string, timeout: number = 10000) {
    this.axiosInstance = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        const apiError = this.normalizeError(error);
        return Promise.reject(apiError);
      }
    );
  }

  private normalizeError(error: AxiosError): ApiError {
    if (error.response) {
      const { status, data } = error.response;
      
      // Handle HTML error pages
      if (typeof data === 'string' && data.toLowerCase().includes('<html')) {
        return {
          message: 'Server error — please try again later.',
          status,
        };
      }

      // Handle structured error responses
      if (data && typeof data === 'object') {
        const errorData = data as Record<string, unknown>;
        return {
          message: (errorData.message || errorData.error || 'Request failed') as string,
          status,
          data: errorData,
        };
      }

      // Fallback for server errors
      if (status >= 500) {
        return {
          message: 'Server error — please try again later.',
          status,
          data,
        };
      }

      return {
        message: JSON.stringify(data) || 'Request failed',
        status,
        data,
      };
    }

    // Network or unknown error
    return {
      message: error.message || 'Network error',
      code: 'NETWORK_ERROR',
    };
  }

  private async request<T>(
    method: string,
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      let requestData: unknown = data;
      const headers = {
        ...(config?.headers || {}),
        'Content-Type': config?.headers?.['Content-Type'] || 'application/json; charset=utf-8',
      };

      // Stringify objects for POST/PUT requests
      if (requestData !== undefined && requestData !== null) {
        if (typeof requestData === 'object' && 
            !(requestData instanceof FormData) && 
            !(requestData instanceof URLSearchParams)) {
          requestData = JSON.stringify(requestData);
        }
      }

      const response = await this.axiosInstance.request({
        method,
        url,
        data: requestData,
        params: config?.params,
        headers,
        timeout: config?.timeout,
      });

      return response.data as ApiResponse<T>;
    } catch (error: any) {
      console.error('HTTP Request Error:', error?.message || error);
      
      if (error.response?.data) {
        throw error.response.data;
      }
      
      throw new NetworkError(error.message || 'Network request failed', error);
    }
  }

  async get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, undefined, config);
  }

  async post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data, config);
  }

  async put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data, config);
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, undefined, config);
  }

  async patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, data, config);
  }

  setAuthToken(token: string | null): void {
    if (token) {
      this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.axiosInstance.defaults.headers.common['Authorization'];
    }
  }
}