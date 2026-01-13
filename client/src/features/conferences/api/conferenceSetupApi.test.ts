import { describe, it, expect, vi, beforeEach } from 'vitest';
// Mock first to ensure SUT imports the mocked module (ESM hoisting)
// The real api client sets up axios interceptors on import. Provide a minimal shape
// so that side-effect code doesn't crash (previously caused reading property 'on'/undefined errors).
vi.mock('@/lib/api/client', () => {
  const mock = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return { default: mock };
});
import * as api from './conferenceSetupApi';
import apiClient from '@/lib/api/client';

type MockFn = ReturnType<typeof vi.fn>;
type MockClient = {
  get: MockFn;
  post: MockFn;
  put: MockFn;
  delete: MockFn;
  patch: MockFn;
};

const mockClient = apiClient as unknown as MockClient;

function mockError(status: number, message?: string) {
  type MockedAxiosError = Error & {
    response?: {
      status: number;
      data?: { message?: string };
    };
  };

  const err = new Error(message || 'error') as MockedAxiosError;
  err.response = { status, data: { message } };
  return err;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('conferenceSetupApi error mapping', () => {
  it('maps 404 to conference not found', async () => {
    mockClient.get.mockRejectedValueOnce(mockError(404));
    await expect(api.listCategories(1)).rejects.toThrow('Conference not found');
  });
  it('maps 403 to permission error', async () => {
    mockClient.get.mockRejectedValueOnce(mockError(403));
    await expect(api.listCategories(1)).rejects.toThrow('You do not have permission to manage this conference');
  });
  it('maps 400 to backend message', async () => {
    mockClient.post.mockRejectedValueOnce(mockError(400, 'Invalid name'));
    await expect(api.createCategory(1, { name: '', description: '' })).rejects.toThrow('Invalid name');
  });
  it('falls back to generic message for other errors', async () => {
    mockClient.get.mockRejectedValueOnce(mockError(500));
    await expect(api.listCategories(1)).rejects.toThrow('Failed to load categories');
  });
  it('returns data on success', async () => {
    mockClient.get.mockResolvedValueOnce({ data: [] });
    const result = await api.listCategories(1);
    expect(result).toEqual([]);
  });

  it('upserts requirements passes allowedFileTypes array', async () => {
    mockClient.put.mockResolvedValueOnce({ data: { allowedFileTypes: ['PDF'], conferenceId: 1 } });
    const saved = await api.upsertRequirements(1, { allowedFileTypes: ['PDF'] });
    expect(mockClient.put).toHaveBeenCalled();
    expect(saved.allowedFileTypes).toEqual(['PDF']);
  });
});
