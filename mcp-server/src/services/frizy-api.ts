import axios, { AxiosInstance, AxiosResponse } from 'axios';
import logger from '../utils/logger.js';
import type { 
  ApiResponse, 
  Block, 
  Project, 
  BlockProgressInput, 
  BlockStatusInput, 
  ContextItemInput, 
  InsightInput 
} from '../types/frizy.js';

export class FrizyApiService {
  private client: AxiosInstance;
  private apiKey: string;

  constructor() {
    const baseURL = process.env.FRIZY_API_BASE_URL || 'http://localhost:3000/api';
    this.apiKey = process.env.FRIZY_API_KEY || '';
    
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Frizy-MCP-Server/1.0.0'
      }
    });

    // Request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => {
        if (this.apiKey) {
          config.headers.Authorization = `Bearer ${this.apiKey}`;
        }
        logger.debug('API Request', { 
          method: config.method?.toUpperCase(), 
          url: config.url,
          hasAuth: !!this.apiKey 
        });
        return config;
      },
      (error) => {
        logger.error('API Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        logger.debug('API Response', { 
          status: response.status, 
          url: response.config.url,
          success: response.data.success 
        });
        return response;
      },
      (error) => {
        logger.error('API Response Error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.response?.data?.error || error.message
        });
        return Promise.reject(error);
      }
    );
  }

  // Block operations
  async updateBlockProgress(input: BlockProgressInput): Promise<Block> {
    const response = await this.client.patch<ApiResponse<Block>>(
      `/blocks/${input.blockId}/progress`,
      {
        progress: input.progress,
        notes: input.notes,
        metadata: input.metadata
      }
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to update block progress');
    }
    
    return response.data.data;
  }

  async updateBlockStatus(input: BlockStatusInput): Promise<Block> {
    const response = await this.client.patch<ApiResponse<Block>>(
      `/blocks/${input.blockId}/status`,
      {
        status: input.status,
        notes: input.notes,
        metadata: input.metadata
      }
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to update block status');
    }
    
    return response.data.data;
  }

  async getBlock(blockId: string): Promise<Block> {
    const response = await this.client.get<ApiResponse<Block>>(`/blocks/${blockId}`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Block not found');
    }
    
    return response.data.data;
  }

  async getProjectBlocks(projectId: string): Promise<Block[]> {
    const response = await this.client.get<ApiResponse<Block[]>>(`/projects/${projectId}/blocks`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get project blocks');
    }
    
    return response.data.data;
  }

  // Context operations
  async createContextItem(input: ContextItemInput): Promise<{ id: string }> {
    const response = await this.client.post<ApiResponse<{ id: string }>>(
      '/context-items',
      input
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to create context item');
    }
    
    return response.data.data;
  }

  // Insight operations  
  async captureInsight(input: InsightInput): Promise<{ id: string }> {
    const response = await this.client.post<ApiResponse<{ id: string }>>(
      '/insights',
      input
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to capture insight');
    }
    
    return response.data.data;
  }

  // Project operations
  async getProject(projectId: string): Promise<Project> {
    const response = await this.client.get<ApiResponse<Project>>(`/projects/${projectId}`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Project not found');
    }
    
    return response.data.data;
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      logger.warn('Health check failed', { error: (error as Error).message });
      return false;
    }
  }
}

export const frizyApi = new FrizyApiService();