import axios, { AxiosInstance } from 'axios';

export abstract class BaseApiClient {
  protected axiosInstance: AxiosInstance;

  constructor(baseURL: string, serviceName: string, options?: { timeout?: number }) {
    this.axiosInstance = axios.create({
      baseURL,
      timeout: options?.timeout ?? 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.axiosInstance.interceptors.request.use(
      (config) => {
        try {
          if (config.method?.toLowerCase() === 'post' && config.url?.includes('/trace')) {
            const body =
              typeof config.data === 'string' ? JSON.parse(config.data) : config.data || {};
            if (body && typeof body === 'object') {
              // In the private deployment this metadata was forwarded to request logging.
              // We keep the parsing here to avoid breaking change, even though we do not emit it.
              void body.start;
            }
          }
        } catch {}
        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    this.axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        const name = error?.name || error?.code;
        const msg = (error?.message || '').toLowerCase();
        if (
          msg.includes('canceled') ||
          name === 'ERR_CANCELED' ||
          name === 'CanceledError' ||
          error?.cause?.name === 'AbortError'
        ) {
          return Promise.reject(error);
        }

        const status = error?.response?.status;
        const url = error?.config?.url || '';
        const errCode = error?.response?.data?.error || error?.code;
        if (
          (status === 503 &&
            (errCode === 'dca_plans_unavailable' || errCode === 'monitor_stats_error')) ||
          (status === 404 && typeof url === 'string' && url.includes('/limit/plans'))
        ) {
          return Promise.reject(error);
        }

        return Promise.reject(error);
      },
    );
  }
}
