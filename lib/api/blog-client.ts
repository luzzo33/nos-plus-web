import { BaseApiClient } from './base-client';
import { buildNosApiUrl } from './monitorConfig';
import type { BlogListPayload, BlogDetailPayload } from './types';

export class BlogApiClient extends BaseApiClient {
  constructor() {
    super(buildNosApiUrl('/v3/blog'), 'Blog');
  }

  async getPosts(language?: string): Promise<BlogListPayload> {
    try {
      const response = await this.axiosInstance.get('/posts', {
        params: language ? { language } : undefined,
      });
      const payload = response.data;
      if (!payload?.success || !payload?.data) {
        throw new Error('Invalid blog posts response');
      }
      return payload.data as BlogListPayload;
    } catch (error) {
      throw error;
    }
  }

  async getPost(slug: string, language?: string): Promise<BlogDetailPayload> {
    try {
      const response = await this.axiosInstance.get(`/posts/${slug}`, {
        params: language ? { language } : undefined,
      });
      const payload = response.data;
      if (!payload?.success || !payload?.data?.post) {
        throw new Error('Blog post not found');
      }
      return payload.data as BlogDetailPayload;
    } catch (error) {
      throw error;
    }
  }
}
