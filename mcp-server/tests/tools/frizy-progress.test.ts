import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleFrizyProgress } from '../../src/tools/frizy-progress.js';
import { frizyApi } from '../../src/services/frizy-api.js';
import type { Block } from '../../src/types/frizy.js';

// Mock the frizy API service
vi.mock('../../src/services/frizy-api.js', () => ({
  frizyApi: {
    updateBlockProgress: vi.fn()
  }
}));

describe('frizy-progress tool', () => {
  const mockFrizyApi = vi.mocked(frizyApi);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update block progress successfully', async () => {
    const mockBlock: Block = {
      id: 'block-123',
      title: 'Test Block',
      content: 'Test content',
      status: 'in_progress',
      lane: 'current',
      priority: 'medium',
      progress: 75,
      projectId: 'project-456',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T01:00:00Z'
    };

    mockFrizyApi.updateBlockProgress.mockResolvedValue(mockBlock);

    const result = await handleFrizyProgress({
      blockId: 'block-123',
      progress: 75,
      notes: 'Made good progress'
    });

    expect(mockFrizyApi.updateBlockProgress).toHaveBeenCalledWith({
      blockId: 'block-123',
      progress: 75,
      notes: 'Made good progress'
    });

    expect(result).toContain('Successfully updated progress');
    expect(result).toContain('Test Block');
    expect(result).toContain('75%');
    expect(result).toContain('in_progress');
  });

  it('should handle API errors gracefully', async () => {
    mockFrizyApi.updateBlockProgress.mockRejectedValue(new Error('API Error'));

    const result = await handleFrizyProgress({
      blockId: 'block-123',
      progress: 50
    });

    expect(result).toContain('Failed to update block progress');
    expect(result).toContain('API Error');
  });

  it('should validate input parameters', async () => {
    // Test missing blockId
    let result = await handleFrizyProgress({
      progress: 50
    });
    expect(result).toContain('Invalid input');
    expect(result).toContain('blockId');

    // Test invalid progress range
    result = await handleFrizyProgress({
      blockId: 'block-123',
      progress: 150 // Invalid: > 100
    });
    expect(result).toContain('Invalid input');

    result = await handleFrizyProgress({
      blockId: 'block-123',
      progress: -10 // Invalid: < 0
    });
    expect(result).toContain('Invalid input');
  });

  it('should handle optional parameters correctly', async () => {
    const mockBlock: Block = {
      id: 'block-123',
      title: 'Test Block',
      content: 'Test content', 
      status: 'in_progress',
      lane: 'current',
      priority: 'medium',
      progress: 30,
      projectId: 'project-456',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T01:00:00Z'
    };

    mockFrizyApi.updateBlockProgress.mockResolvedValue(mockBlock);

    // Test with minimal required parameters
    const result = await handleFrizyProgress({
      blockId: 'block-123',
      progress: 30
    });

    expect(mockFrizyApi.updateBlockProgress).toHaveBeenCalledWith({
      blockId: 'block-123',
      progress: 30
    });

    expect(result).toContain('Successfully updated progress');
  });
});